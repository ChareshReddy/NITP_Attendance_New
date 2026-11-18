"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actor, ActionError } from "@/lib/auth";
import { run, fd, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { generatePassword, hashPassword } from "@/lib/password";
import { dateOnly, fmtDate } from "@/lib/time";

import { ONBOARDING } from "@/lib/constants";

async function nextEmpCode(): Promise<string> {
  const last = await db.user.findMany({ select: { empCode: true } });
  const max = last.reduce((m, u) => Math.max(m, Number(u.empCode.replace(/\D/g, "")) || 0), 0);
  return `NITP-${String(max + 1).padStart(4, "0")}`;
}

const personSchema = z.object({
  name: z.string().min(2, "Enter the full name.").max(120),
  email: z.string().email("Enter a valid work email.").transform((s) => s.toLowerCase()),
  role: z.enum(["EMPLOYEE", "TL", "HR"]),
  title: z.string().max(120).optional().or(z.literal("")),
  department: z.string().max(120).optional().or(z.literal("")),
  teamId: z.string().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  ctcAnnual: z.coerce.number().int().min(0).max(100000000).optional().or(z.literal("")),
});

export async function createEmployee(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = personSchema.parse(fd(form));
    if (await db.user.findUnique({ where: { email: f.email } })) throw new ActionError("Someone already uses that email.");
    const password = generatePassword();
    const user = await db.user.create({
      data: {
        empCode: await nextEmpCode(),
        name: f.name,
        email: f.email,
        role: f.role,
        title: f.title || null,
        department: f.department || null,
        teamId: f.teamId || null,
        phone: f.phone || null,
        dateOfJoining: f.dateOfJoining ? dateOnly(f.dateOfJoining) : null,
        ctcAnnual: f.ctcAnnual === "" || f.ctcAnnual === undefined ? null : f.ctcAnnual,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        onboardingStep: 1,
      },
    });
    if (f.role === "TL" && f.teamId) await db.team.update({ where: { id: f.teamId }, data: { leadId: user.id } });
    await audit(me.id, `Added ${f.name} (${user.empCode}) as ${f.role === "TL" ? "Team Leader" : f.role === "HR" ? "HR Admin" : "Employee"}; onboarding started`, "lemon");
    revalidatePath("/", "layout");
    return { ok: true, message: `${f.name} added. Share the initial password with them.`, tone: "lemon", data: { password, name: f.name, email: f.email } };
  });
}

export async function updateEmployee(id: string, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = personSchema.parse(fd(form));
    const u = await db.user.findUnique({ where: { id } });
    if (!u) throw new ActionError("That person no longer exists.");
    if (id === me.id && f.role !== "HR") throw new ActionError("You can't remove your own HR access.");
    const clash = await db.user.findFirst({ where: { email: f.email, id: { not: id } } });
    if (clash) throw new ActionError("Someone else already uses that email.");
    const roleChanged = u.role !== f.role;
    await db.user.update({
      where: { id },
      data: {
        name: f.name,
        email: f.email,
        role: f.role,
        title: f.title || null,
        department: f.department || null,
        teamId: f.teamId || null,
        phone: f.phone || null,
        dateOfJoining: f.dateOfJoining ? dateOnly(f.dateOfJoining) : null,
        ctcAnnual: f.ctcAnnual === "" || f.ctcAnnual === undefined ? null : f.ctcAnnual,
        ...(roleChanged ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    if (f.role === "TL" && f.teamId) await db.team.update({ where: { id: f.teamId }, data: { leadId: id } });
    if (u.role === "TL" && f.role !== "TL") await db.team.updateMany({ where: { leadId: id }, data: { leadId: null } });
    await audit(me.id, `Updated profile of ${f.name}${roleChanged ? ` (role ${u.role} → ${f.role})` : ""}`, "lemon");
    revalidatePath("/", "layout");
    return { ok: true, message: `${f.name}'s details saved.`, tone: "lemon" };
  });
}

export async function resetPassword(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const u = await db.user.findUnique({ where: { id } });
    if (!u) throw new ActionError("That person no longer exists.");
    const password = generatePassword();
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
    });
    await audit(me.id, `Reset the password for ${u.name}`, "rose");
    revalidatePath("/employees");
    return { ok: true, message: `Password reset for ${u.name}. They're signed out everywhere.`, tone: "rose", data: { password, name: u.name, email: u.email } };
  });
}

export async function setActive(id: string, active: boolean): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    if (id === me.id) throw new ActionError("You can't deactivate your own account.");
    const u = await db.user.update({ where: { id }, data: { active, sessionVersion: { increment: 1 } } });
    if (!active) await db.team.updateMany({ where: { leadId: id }, data: { leadId: null } });
    await audit(me.id, `${active ? "Reactivated" : "Deactivated"} ${u.name}`, active ? "mint" : "rose");
    revalidatePath("/", "layout");
    return { ok: true, message: `${u.name} ${active ? "can sign in again" : "can no longer sign in"}.`, tone: active ? "mint" : "rose" };
  });
}

export async function advanceOnboarding(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const u = await db.user.findUnique({ where: { id } });
    if (!u || u.onboardingStep >= 5) throw new ActionError("Onboarding is already complete.");
    await db.user.update({ where: { id }, data: { onboardingStep: u.onboardingStep + 1 } });
    await audit(me.id, `${u.name}: ${ONBOARDING[u.onboardingStep]}`, "lemon");
    revalidatePath("/", "layout");
    return { ok: true, message: u.onboardingStep + 1 >= 5 ? `${u.name} is fully onboarded.` : `${ONBOARDING[u.onboardingStep]} ✓`, tone: "lemon" };
  });
}

// ---------- Settings ----------
export async function saveSettings(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z
      .object({
        shiftStart: z.string().regex(/^\d{2}:\d{2}$/, "Enter the shift start time."),
        graceMins: z.coerce.number().int().min(0).max(120),
        shiftHours: z.coerce.number().min(1).max(14),
        companyName: z.string().min(1).max(80),
      })
      .parse(fd(form));
    for (const [key, value] of Object.entries(f)) await db.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } });
    await audit(me.id, `Updated shift policy: ${f.shiftStart}, ${f.shiftHours}h, ${f.graceMins} min grace`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved.", tone: "lav" };
  });
}

export async function saveLeaveType(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z.object({ id: z.string().optional().or(z.literal("")), name: z.string().min(2).max(40), annualQuota: z.coerce.number().int().min(0).max(365) }).parse(fd(form));
    if (f.id) await db.leaveType.update({ where: { id: f.id }, data: { name: f.name, annualQuota: f.annualQuota } });
    else await db.leaveType.create({ data: { name: f.name, annualQuota: f.annualQuota, sortOrder: await db.leaveType.count() } });
    await audit(me.id, `${f.id ? "Updated" : "Added"} leave type ${f.name} (${f.annualQuota} days/year)`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: `${f.name} saved.`, tone: "lav" };
  });
}

export async function addHoliday(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."), name: z.string().min(2).max(80) }).parse(fd(form));
    await db.holiday.create({ data: { date: dateOnly(f.date), name: f.name } });
    await audit(me.id, `Added holiday ${f.name} on ${fmtDate(f.date)}`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: "Holiday added.", tone: "lav" };
  });
}

export async function removeHoliday(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const h = await db.holiday.delete({ where: { id } });
    await audit(me.id, `Removed holiday ${h.name}`, "gray");
    revalidatePath("/", "layout");
    return { ok: true, message: "Holiday removed.", tone: "sky" };
  });
}

export async function saveTeam(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR"]);
    const f = z.object({ id: z.string().optional().or(z.literal("")), name: z.string().min(2).max(60), leadId: z.string().optional().or(z.literal("")) }).parse(fd(form));
    if (f.leadId) {
      const lead = await db.user.findUnique({ where: { id: f.leadId } });
      if (lead?.role !== "TL") throw new ActionError("The team lead must have the Team Leader role.");
    }
    const team = f.id
      ? await db.team.update({ where: { id: f.id }, data: { name: f.name, leadId: f.leadId || null } })
      : await db.team.create({ data: { name: f.name, leadId: f.leadId || null } });
    if (f.leadId) await db.user.update({ where: { id: f.leadId }, data: { teamId: team.id } });
    await audit(me.id, `${f.id ? "Updated" : "Created"} team ${f.name}`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: `Team ${f.name} saved.`, tone: "lav" };
  });
}
