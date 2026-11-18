"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actor, ActionError } from "@/lib/auth";
import { run, fd, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertCanDecide } from "@/lib/scope";
import { leaveBalances } from "@/lib/queries";
import { holidaySet } from "@/lib/settings";
import { dateOnly, fmtDate, isWeekend, workingDays, ymdInTz } from "@/lib/time";

const ymdRe = /^\d{4}-\d{2}-\d{2}$/;

export async function applyLeave(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z
      .object({
        leaveTypeId: z.string().min(1, "Pick a leave type."),
        from: z.string().regex(ymdRe, "Pick a start date."),
        to: z.string().regex(ymdRe, "Pick an end date."),
        reason: z.string().min(3, "Add a short reason.").max(300),
      })
      .parse(fd(form));
    if (f.to < f.from) throw new ActionError("The end date must be on or after the start date.");
    if (f.from.slice(0, 4) !== f.to.slice(0, 4)) throw new ActionError("Split leave that crosses into a new year into two requests.");
    const from = dateOnly(f.from);
    const to = dateOnly(f.to);
    const days = workingDays(from, to, await holidaySet());
    if (!days) throw new ActionError("Those dates have no working days.");
    const overlap = await db.leaveRequest.findFirst({ where: { userId: me.id, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: to }, toDate: { gte: from } } });
    if (overlap) throw new ActionError(`You already have leave from ${fmtDate(overlap.fromDate)} to ${fmtDate(overlap.toDate)}.`);
    const bal = (await leaveBalances(me.id)).find((b) => b.id === f.leaveTypeId);
    if (!bal) throw new ActionError("Pick a leave type.");
    const lopDays = Math.max(0, days - bal.remaining);
    await db.leaveRequest.create({ data: { userId: me.id, leaveTypeId: f.leaveTypeId, fromDate: from, toDate: to, days, lopDays, reason: f.reason } });
    await audit(me.id, `Applied ${days}d ${bal.name} leave (${fmtDate(from)}–${fmtDate(to)})${lopDays ? `, ${lopDays}d LOP` : ""}`, "rose");
    revalidatePath("/", "layout");
    return { ok: true, message: lopDays ? `Leave sent for approval. ${lopDays} day(s) will be loss of pay.` : "Leave sent for approval.", tone: lopDays ? "rose" : "mint" };
  });
}

export async function applyWfh(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z.object({ date: z.string().regex(ymdRe, "Pick a date."), reason: z.string().min(3, "Say what you'll work on.").max(300) }).parse(fd(form));
    if (f.date < ymdInTz()) throw new ActionError("WFH can be requested for today or later.");
    const date = dateOnly(f.date);
    if (isWeekend(date)) throw new ActionError("That date is a weekend.");
    const dup = await db.wfhRequest.findFirst({ where: { userId: me.id, date, status: { in: ["PENDING", "APPROVED"] } } });
    if (dup) throw new ActionError("You already have a WFH request for that day.");
    await db.wfhRequest.create({ data: { userId: me.id, date, reason: f.reason } });
    await audit(me.id, `Requested WFH for ${fmtDate(date)}`, "sky");
    revalidatePath("/", "layout");
    return { ok: true, message: "WFH request sent for approval.", tone: "sky" };
  });
}

export async function decideLeave(kind: "leave" | "wfh", id: string, approve: boolean): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR", "TL"]);
    const status = approve ? "APPROVED" : "REJECTED";
    if (kind === "leave") {
      const r = await db.leaveRequest.findUnique({ where: { id }, include: { user: { select: { name: true } }, leaveType: true } });
      if (!r || r.status !== "PENDING") throw new ActionError("This request was already handled.");
      await assertCanDecide(me, r.userId);
      await db.leaveRequest.update({ where: { id }, data: { status, decidedById: me.id, decidedAt: new Date() } });
      await audit(me.id, `${approve ? "Approved" : "Rejected"} ${r.leaveType.name} leave for ${r.user.name} (${r.days}d from ${fmtDate(r.fromDate)})`, approve ? "mint" : "rose");
    } else {
      const r = await db.wfhRequest.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
      if (!r || r.status !== "PENDING") throw new ActionError("This request was already handled.");
      await assertCanDecide(me, r.userId);
      await db.wfhRequest.update({ where: { id }, data: { status, decidedById: me.id, decidedAt: new Date() } });
      if (approve) await db.attendance.updateMany({ where: { userId: r.userId, date: r.date }, data: { kind: "WFH" } });
      await audit(me.id, `${approve ? "Approved" : "Rejected"} WFH for ${r.user.name} (${fmtDate(r.date)})`, approve ? "mint" : "rose");
    }
    revalidatePath("/", "layout");
    return { ok: true, message: `Request ${approve ? "approved" : "rejected"}.`, tone: approve ? "mint" : "rose" };
  });
}

export async function withdrawRequest(kind: "leave" | "wfh", id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const today = ymdInTz();
    if (kind === "leave") {
      const r = await db.leaveRequest.findUnique({ where: { id } });
      if (!r || r.userId !== me.id) throw new ActionError("You can only withdraw your own requests.");
      if (r.status === "APPROVED" && r.fromDate.toISOString().slice(0, 10) <= today) throw new ActionError("Leave that has started can't be withdrawn. Ask HR.");
      if (!["PENDING", "APPROVED"].includes(r.status)) throw new ActionError("This request is already closed.");
      await db.leaveRequest.update({ where: { id }, data: { status: "WITHDRAWN" } });
    } else {
      const r = await db.wfhRequest.findUnique({ where: { id } });
      if (!r || r.userId !== me.id) throw new ActionError("You can only withdraw your own requests.");
      if (!["PENDING", "APPROVED"].includes(r.status)) throw new ActionError("This request is already closed.");
      await db.wfhRequest.update({ where: { id }, data: { status: "WITHDRAWN" } });
    }
    await audit(me.id, `Withdrew a ${kind === "leave" ? "leave" : "WFH"} request`, "gray");
    revalidatePath("/", "layout");
    return { ok: true, message: "Request withdrawn.", tone: "sky" };
  });
}
