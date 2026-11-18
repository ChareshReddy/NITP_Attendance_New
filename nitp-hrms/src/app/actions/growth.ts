"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actor, ActionError, type CurrentUser } from "@/lib/auth";
import { run, fd, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { canDecideFor, teamMemberIds } from "@/lib/scope";
import { computePayroll } from "@/lib/payroll-run";
import { currentCycle } from "@/lib/perf";
import { EXIT_STEPS, NOTICE_DAYS } from "@/lib/constants";
import { addDays, currentMonth, dateOnly, fmtDate, monthLabel, ymdInTz } from "@/lib/time";
import { inr } from "@/lib/time";

const ymdRe = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Payroll ----------
export async function runPayroll(month: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    if (!/^\d{4}-\d{2}$/.test(month) || month > currentMonth()) throw new ActionError("You can only run payroll for this month or earlier.");
    const existing = await db.payrollRun.findUnique({ where: { month } });
    if (existing?.status === "PROCESSED") throw new ActionError(`${monthLabel(month)} payroll has already been processed.`);
    const { rows } = await computePayroll(month);
    if (!rows.length) throw new ActionError("No one has a CTC set. Add CTC on the Employees page first.");
    await db.$transaction(async (tx) => {
      const r = await tx.payrollRun.upsert({ where: { month }, update: { status: "PROCESSED", processedAt: new Date(), processedById: me.id }, create: { month, status: "PROCESSED", processedAt: new Date(), processedById: me.id } });
      await tx.payslip.deleteMany({ where: { runId: r.id } });
      await tx.payslip.createMany({
        data: rows.map(({ user, slip }) => ({
          runId: r.id,
          userId: user.id,
          gross: slip.gross,
          deductions: slip.totalDeductions,
          net: slip.net,
          lopDays: slip.lopDays,
          paidDays: slip.paidDays,
          lines: { earnings: slip.earnings, deductions: slip.deductions },
        })),
      });
    }, { timeout: 20000 });
    const total = rows.reduce((a, r) => a + r.slip.net, 0);
    await audit(me.id, `Ran payroll for ${monthLabel(month)}: ${rows.length} payslips, net ${inr(total)}`, "mint");
    revalidatePath("/", "layout");
    return { ok: true, message: `Payroll processed. ${rows.length} payslips published.`, tone: "mint" };
  });
}

// ---------- Performance ----------
async function canManageGoals(me: CurrentUser, userId: string) {
  return userId === me.id || me.role === "HR" || (me.role === "TL" && (await teamMemberIds(me.id)).includes(userId));
}

export async function saveGoal(userId: string, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    if (!(await canManageGoals(me, userId))) throw new ActionError("You can't set goals for that person.");
    const f = z.object({ title: z.string().min(3, "Name the goal.").max(160), kpi: z.string().min(2, "Add how it's measured.").max(160), weight: z.coerce.number().int().min(5, "Weight must be at least 5%.").max(100) }).parse(fd(form));
    const cycle = currentCycle();
    const sum = await db.performanceGoal.aggregate({ where: { userId, cycle }, _sum: { weight: true } });
    if ((sum._sum.weight ?? 0) + f.weight > 100) throw new ActionError(`Weights would exceed 100% (currently ${sum._sum.weight ?? 0}%).`);
    await db.performanceGoal.create({ data: { userId, cycle, title: f.title, kpi: f.kpi, weight: f.weight } });
    await audit(me.id, `Added goal “${f.title}” (${f.weight}%)`, "sky");
    revalidatePath("/", "layout");
    return { ok: true, message: "Goal added.", tone: "sky" };
  });
}

export async function setGoalProgress(id: string, progress: number): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const g = await db.performanceGoal.findUnique({ where: { id } });
    if (!g || !(await canManageGoals(me, g.userId))) throw new ActionError("You can't update that goal.");
    const p = Math.max(0, Math.min(100, Math.round(progress)));
    await db.performanceGoal.update({ where: { id }, data: { progress: p } });
    revalidatePath("/performance");
    return { ok: true, message: `Progress saved: ${p}%.`, tone: "sky" };
  });
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const g = await db.performanceGoal.findUnique({ where: { id } });
    if (!g || !(await canManageGoals(me, g.userId))) throw new ActionError("You can't remove that goal.");
    await db.performanceGoal.delete({ where: { id } });
    await audit(me.id, `Removed goal “${g.title}”`, "gray");
    revalidatePath("/performance");
    return { ok: true, message: "Goal removed.", tone: "sky" };
  });
}

export async function submitAppraisal(userId: string, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR", "TL"]);
    if (!(await canDecideFor(me, userId))) throw new ActionError("You can only appraise your own team.");
    const f = z.object({ rating: z.enum(["Exceeds expectations", "Meets expectations", "Needs improvement"]), comment: z.string().min(5, "Add a comment.").max(1000) }).parse(fd(form));
    const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await db.performanceReview.create({ data: { userId, authorId: me.id, cycle: currentCycle(), kind: "APPRAISAL", rating: f.rating, comment: f.comment } });
    await audit(me.id, `Appraised ${u.name}: ${f.rating}`, "sky");
    revalidatePath("/performance");
    return { ok: true, message: "Appraisal submitted.", tone: "sky" };
  });
}

export async function overrideScore(userId: string, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z.object({ score: z.coerce.number().int().min(0).max(100), reason: z.string().min(5, "Give the reason for the override.").max(300) }).parse(fd(form));
    const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await db.performanceReview.create({ data: { userId, authorId: me.id, cycle: currentCycle(), kind: "OVERRIDE", score: f.score, comment: f.reason } });
    await audit(me.id, `Overrode performance score for ${u.name} → ${f.score} (${f.reason})`, "rose");
    revalidatePath("/", "layout");
    return { ok: true, message: `Score overridden to ${f.score}.`, tone: "rose" };
  });
}

export async function clearOverride(userId: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await db.performanceReview.deleteMany({ where: { userId, cycle: currentCycle(), kind: "OVERRIDE" } });
    await audit(me.id, `Cleared performance override for ${u.name}`, "rose");
    revalidatePath("/", "layout");
    return { ok: true, message: "Override cleared.", tone: "sky" };
  });
}

// ---------- Trainings ----------
export async function createTraining(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z
      .object({
        title: z.string().min(3).max(160),
        date: z.string().regex(ymdRe, "Pick a date."),
        timeLabel: z.string().min(3, "Add the time, e.g. 10:00–12:00").max(40),
        mode: z.string().min(2).max(60),
        host: z.string().min(2).max(80),
        seats: z.coerce.number().int().min(1).max(1000),
      })
      .parse(fd(form));
    if (f.date < ymdInTz()) throw new ActionError("Schedule trainings for today or later.");
    await db.training.create({ data: { ...f, date: dateOnly(f.date), createdById: me.id } });
    await audit(me.id, `Published training: ${f.title} on ${fmtDate(f.date)}`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: "Training published.", tone: "lav" };
  });
}

export async function enroll(trainingId: string, join: boolean): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const t = await db.training.findUnique({ where: { id: trainingId }, include: { _count: { select: { enrollments: true } } } });
    if (!t) throw new ActionError("That training no longer exists.");
    if (t.date.toISOString().slice(0, 10) < ymdInTz()) throw new ActionError("This training has already happened.");
    if (join) {
      if (t._count.enrollments >= t.seats) throw new ActionError("No seats left.");
      await db.trainingEnrollment.create({ data: { trainingId, userId: me.id } });
      await audit(me.id, `Enrolled in ${t.title}`, "lav");
    } else {
      await db.trainingEnrollment.deleteMany({ where: { trainingId, userId: me.id, status: "ENROLLED" } });
      await audit(me.id, `Withdrew from ${t.title}`, "gray");
    }
    revalidatePath("/", "layout");
    return { ok: true, message: join ? `Enrolled in ${t.title}.` : "Enrollment withdrawn.", tone: join ? "lav" : "sky" };
  });
}

export async function completeEnrollment(enrollmentId: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const e = await db.trainingEnrollment.findUnique({ where: { id: enrollmentId }, include: { training: true, user: { select: { name: true } } } });
    if (!e) throw new ActionError("Enrollment not found.");
    if (e.status === "COMPLETED") throw new ActionError("Already marked as attended.");
    const cert = `NITP-C-${e.training.date.toISOString().slice(0, 7).replace("-", "")}-${enrollmentId.slice(-6).toUpperCase()}`;
    await db.trainingEnrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED", certificate: cert } });
    await audit(me.id, `Marked ${e.user.name} as attended: ${e.training.title}`, "mint");
    revalidatePath("/trainings");
    return { ok: true, message: `Certificate issued to ${e.user.name}.`, tone: "mint" };
  });
}

// ---------- Exit ----------
export async function submitResignation(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z.object({ reason: z.string().min(2).max(120), comments: z.string().max(1000).optional().or(z.literal("")), lastWorkingDay: z.string().regex(ymdRe).optional().or(z.literal("")) }).parse(fd(form));
    const open = await db.resignation.findFirst({ where: { userId: me.id, withdrawnAt: null, step: { lt: 6 } } });
    if (open) throw new ActionError("You already have a resignation in progress.");
    const earliest = addDays(dateOnly(ymdInTz()), 1);
    const lwd = f.lastWorkingDay ? dateOnly(f.lastWorkingDay) : addDays(dateOnly(ymdInTz()), NOTICE_DAYS);
    if (lwd < earliest) throw new ActionError("Your last working day must be after today.");
    await db.resignation.create({ data: { userId: me.id, reason: f.reason, comments: f.comments || null, lastWorkingDay: lwd } });
    await audit(me.id, `Submitted resignation (last working day ${fmtDate(lwd)})`, "peach");
    revalidatePath("/", "layout");
    return { ok: true, message: "Resignation submitted to your TL and HR.", tone: "peach" };
  });
}

export async function withdrawResignation(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const r = await db.resignation.findUnique({ where: { id } });
    if (!r || r.userId !== me.id || r.withdrawnAt) throw new ActionError("Nothing to withdraw.");
    if (r.step >= 2) throw new ActionError("HR clearance has started. Talk to HR to withdraw.");
    await db.resignation.update({ where: { id }, data: { withdrawnAt: new Date() } });
    await audit(me.id, "Withdrew resignation", "sky");
    revalidatePath("/", "layout");
    return { ok: true, message: "Resignation withdrawn.", tone: "sky" };
  });
}

export async function advanceExit(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR", "TL"]);
    const r = await db.resignation.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!r || r.withdrawnAt || r.step >= 6) throw new ActionError("This exit is already closed.");
    if (!(await canDecideFor(me, r.userId))) throw new ActionError("You can only act on your own team.");
    if (me.role === "TL" && r.step >= 2) throw new ActionError("HR handles the remaining steps.");
    await db.resignation.update({ where: { id }, data: { step: r.step + 1 } });
    await audit(me.id, `Exit for ${r.user.name}: ${EXIT_STEPS[r.step]} done`, "peach");
    revalidatePath("/", "layout");
    return { ok: true, message: r.step + 1 >= 6 ? `${r.user.name}'s exit is complete. Deactivate their account after the last day.` : `${EXIT_STEPS[r.step]} done.`, tone: "peach" };
  });
}
