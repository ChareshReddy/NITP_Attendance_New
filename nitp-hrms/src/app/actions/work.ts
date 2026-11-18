"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actor, ActionError } from "@/lib/auth";
import { run, fd, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertCanDecide, teamMemberIds } from "@/lib/scope";
import { dateOnly, fmtDate, ymdInTz } from "@/lib/time";

const MAX_FILE = 2 * 1024 * 1024;
const ymdRe = /^\d{4}-\d{2}-\d{2}$/;

// ---------- Track sheets ----------
export async function logTrackSheet(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z
      .object({
        date: z.string().regex(ymdRe, "Pick a date."),
        hours: z.coerce.number().min(0.25, "Log at least 0.25 hours.").max(16, "A day can't have more than 16 hours."),
        project: z.string().min(2, "Enter the project.").max(120),
        description: z.string().min(5, "Describe what you worked on.").max(2000),
        link: z.string().url("The link must start with https://").max(500).optional().or(z.literal("")),
      })
      .parse(fd(form));
    if (f.date > ymdInTz()) throw new ActionError("You can't log hours for a future date.");
    const file = form.get("file");
    let attachment: { attachment: Uint8Array<ArrayBuffer>; attachmentName: string; attachmentType: string } | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE) throw new ActionError("Attachments must be 2 MB or smaller.");
      attachment = { attachment: new Uint8Array(await file.arrayBuffer()), attachmentName: file.name.slice(0, 200), attachmentType: file.type || "application/octet-stream" };
    }
    const day = await db.trackSheet.aggregate({ where: { userId: me.id, date: dateOnly(f.date) }, _sum: { hours: true } });
    if ((day._sum.hours ?? 0) + f.hours > 16) throw new ActionError(`That would take ${fmtDate(f.date)} past 16 hours.`);
    await db.trackSheet.create({
      data: { userId: me.id, date: dateOnly(f.date), hours: f.hours, project: f.project, description: f.description, link: f.link || null, ...(attachment ?? {}) },
    });
    await audit(me.id, `Logged ${f.hours}h on ${f.project} for ${fmtDate(f.date)}`, "lav");
    revalidatePath("/", "layout");
    return { ok: true, message: `${f.hours}h logged to ${f.project}.`, tone: "lav" };
  });
}

export async function reviewTrackSheet(id: string, approve: boolean, note?: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR", "TL"]);
    const t = await db.trackSheet.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!t || t.status !== "SUBMITTED") throw new ActionError("This entry was already reviewed.");
    await assertCanDecide(me, t.userId);
    await db.trackSheet.update({ where: { id }, data: { status: approve ? "APPROVED" : "CHANGES_REQUESTED", reviewerId: me.id, reviewNote: note?.slice(0, 300) || null } });
    await audit(me.id, `${approve ? "Approved" : "Requested changes on"} track sheet of ${t.user.name} (${t.hours}h, ${fmtDate(t.date)})`, approve ? "mint" : "peach");
    revalidatePath("/", "layout");
    return { ok: true, message: approve ? "Entry approved." : "Changes requested.", tone: approve ? "mint" : "peach" };
  });
}

export async function deleteTrackSheet(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const t = await db.trackSheet.findUnique({ where: { id } });
    if (!t || t.userId !== me.id) throw new ActionError("You can only delete your own entries.");
    if (t.status === "APPROVED") throw new ActionError("Approved entries can't be deleted.");
    await db.trackSheet.delete({ where: { id } });
    await audit(me.id, `Deleted track sheet entry (${t.hours}h, ${fmtDate(t.date)})`, "gray");
    revalidatePath("/", "layout");
    return { ok: true, message: "Entry deleted. Log it again with the changes.", tone: "sky" };
  });
}

// ---------- Tasks ----------
export async function createTask(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z
      .object({
        title: z.string().min(3, "Give the task a title.").max(200),
        assigneeId: z.string().min(1),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
        dueDate: z.string().regex(ymdRe, "Pick a due date."),
      })
      .parse(fd(form));
    const allowed = me.role === "HR" || f.assigneeId === me.id || (me.role === "TL" && (await teamMemberIds(me.id)).includes(f.assigneeId));
    if (!allowed) throw new ActionError("You can only assign tasks to yourself or your team.");
    const who = await db.user.findUnique({ where: { id: f.assigneeId }, select: { name: true, active: true } });
    if (!who?.active) throw new ActionError("That person isn't active.");
    await db.task.create({ data: { title: f.title, assigneeId: f.assigneeId, createdById: me.id, priority: f.priority, dueDate: dateOnly(f.dueDate) } });
    await audit(me.id, f.assigneeId === me.id ? `Added task “${f.title}”` : `Assigned task “${f.title}” to ${who.name}`, "lemon");
    revalidatePath("/", "layout");
    return { ok: true, message: f.assigneeId === me.id ? "Task added." : `Task assigned to ${who.name}.`, tone: "lemon" };
  });
}

const ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

async function canTouchTask(me: Awaited<ReturnType<typeof actor>>, t: { assigneeId: string; createdById: string }) {
  if (me.role === "HR" || t.assigneeId === me.id || t.createdById === me.id) return true;
  return me.role === "TL" && (await teamMemberIds(me.id)).includes(t.assigneeId);
}

export async function moveTask(id: string, dir: 1 | -1): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const t = await db.task.findUnique({ where: { id } });
    if (!t || !(await canTouchTask(me, t))) throw new ActionError("You can't change that task.");
    const i = Math.max(0, Math.min(3, ORDER.indexOf(t.status) + dir));
    const status = ORDER[i];
    await db.task.update({ where: { id }, data: { status, completedAt: status === "DONE" ? new Date() : null } });
    if (status === "DONE") await audit(me.id, `Completed task “${t.title}”`, "mint");
    revalidatePath("/", "layout");
    return { ok: true, message: status === "DONE" ? "Task completed." : `Moved to ${status.replace("_", " ").toLowerCase()}.`, tone: status === "DONE" ? "mint" : "sky" };
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const t = await db.task.findUnique({ where: { id } });
    if (!t || !(me.role === "HR" || t.createdById === me.id)) throw new ActionError("Only the person who created a task can delete it.");
    await db.task.delete({ where: { id } });
    await audit(me.id, `Deleted task “${t.title}”`, "gray");
    revalidatePath("/", "layout");
    return { ok: true, message: "Task deleted.", tone: "sky" };
  });
}
