"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { actor, ActionError } from "@/lib/auth";
import { run, fd, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertCanDecide } from "@/lib/scope";
import { getSettings, shiftStartMinutes } from "@/lib/settings";
import { dateOnly, fmtDate, hmInTz, instantFromLocal, minutesInTz, ymdInTz } from "@/lib/time";

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || h.get("x-real-ip") || "unknown").slice(0, 64);
}

export async function punch(timezone: string): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const s = await getSettings();
    const now = new Date();
    const today = ymdInTz(now);
    const date = dateOnly(today);
    const ip = await clientIp();
    const tz = String(timezone || "").slice(0, 64) || null;
    const row = await db.attendance.findUnique({ where: { userId_date: { userId: me.id, date } } });

    if (!row?.punchIn) {
      const onLeave = await db.leaveRequest.findFirst({ where: { userId: me.id, status: "APPROVED", fromDate: { lte: date }, toDate: { gte: date } } });
      if (onLeave) throw new ActionError("You're on approved leave today. Withdraw the leave first if you're working.");
      const wfh = await db.wfhRequest.findFirst({ where: { userId: me.id, date, status: "APPROVED" } });
      const late = minutesInTz(now) > shiftStartMinutes(s) + s.graceMins;
      await db.attendance.upsert({
        where: { userId_date: { userId: me.id, date } },
        update: { punchIn: now, inIp: ip, timezone: tz, late, kind: wfh ? "WFH" : "OFFICE" },
        create: { userId: me.id, date, punchIn: now, inIp: ip, timezone: tz, late, kind: wfh ? "WFH" : "OFFICE" },
      });
      await audit(me.id, `Punched in at ${hmInTz(now)}${wfh ? " (WFH)" : ""} from ${ip}${late ? " — late" : ""}`, late ? "lemon" : "mint");
      revalidatePath("/", "layout");
      return { ok: true, message: late ? `Punched in at ${hmInTz(now)}. Marked late.` : `Punched in at ${hmInTz(now)}. Have a good day!`, tone: late ? "lemon" : "mint" };
    }
    if (!row.punchOut) {
      const minutes = Math.max(0, Math.round((now.getTime() - row.punchIn.getTime()) / 60000));
      const earlyLeave = minutesInTz(now) < shiftStartMinutes(s) + s.shiftHours * 60;
      await db.attendance.update({ where: { id: row.id }, data: { punchOut: now, outIp: ip, workMinutes: minutes, earlyLeave } });
      await audit(me.id, `Punched out at ${hmInTz(now)}${earlyLeave ? " — early leaving" : ""}`, earlyLeave ? "rose" : "sky");
      revalidatePath("/", "layout");
      return { ok: true, message: earlyLeave ? `Punched out at ${hmInTz(now)}. Flagged as early leaving.` : "Punched out. See you tomorrow!", tone: earlyLeave ? "rose" : "sky" };
    }
    throw new ActionError("You've already punched out today. Raise a regularisation if something's wrong.");
  });
}

const REG_TYPES = ["Missed punch-in", "Missed punch-out", "Wrong punch-out", "On-duty (client site)"] as const;

export async function requestRegularisation(form: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await actor();
    const f = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Enter the correct time."),
        type: z.enum(REG_TYPES),
        reason: z.string().min(3, "Add a short reason.").max(300),
      })
      .parse(fd(form));
    if (f.date > ymdInTz()) throw new ActionError("You can only regularise today or earlier.");
    const dup = await db.regularisation.findFirst({ where: { userId: me.id, date: dateOnly(f.date), status: "PENDING" } });
    if (dup) throw new ActionError("You already have a pending request for that day.");
    await db.regularisation.create({ data: { userId: me.id, date: dateOnly(f.date), time: f.time, type: f.type, reason: f.reason } });
    await audit(me.id, `Requested regularisation: ${f.type} on ${fmtDate(f.date)}`, "lemon");
    revalidatePath("/", "layout");
    return { ok: true, message: "Regularisation sent for approval.", tone: "lemon" };
  });
}

export async function decideRegularisation(id: string, approve: boolean): Promise<ActionResult> {
  return run(async () => {
    const me = await actor(["HR", "TL"]);
    const r = await db.regularisation.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!r || r.status !== "PENDING") throw new ActionError("This request was already handled.");
    await assertCanDecide(me, r.userId);
    const s = await getSettings(); // read outside the transaction: one pooled connection only
    await db.$transaction(async (tx) => {
      await tx.regularisation.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedById: me.id, decidedAt: new Date() } });
      if (!approve) return;
      const day = r.date.toISOString().slice(0, 10);
      const at = instantFromLocal(day, r.time);
      const existing = await tx.attendance.findUnique({ where: { userId_date: { userId: r.userId, date: r.date } } });
      let punchIn = existing?.punchIn ?? null;
      let punchOut = existing?.punchOut ?? null;
      if (r.type === "Missed punch-in") punchIn = at;
      else if (r.type.startsWith("On-duty")) {
        punchIn = at;
        punchOut = new Date(at.getTime() + s.shiftHours * 3600000);
      } else punchOut = at;
      const workMinutes = punchIn && punchOut ? Math.max(0, Math.round((punchOut.getTime() - punchIn.getTime()) / 60000)) : 0;
      const late = punchIn ? minutesInTz(punchIn) > shiftStartMinutes(s) + s.graceMins : false;
      const earlyLeave = punchOut ? minutesInTz(punchOut) < shiftStartMinutes(s) + s.shiftHours * 60 : false;
      const data = { punchIn, punchOut, workMinutes, late, earlyLeave, regularised: true };
      await tx.attendance.upsert({ where: { userId_date: { userId: r.userId, date: r.date } }, update: data, create: { userId: r.userId, date: r.date, ...data } });
    });
    await audit(me.id, `${approve ? "Approved" : "Rejected"} regularisation for ${r.user.name} (${fmtDate(r.date)})`, approve ? "mint" : "rose");
    revalidatePath("/", "layout");
    return { ok: true, message: `Regularisation ${approve ? "approved" : "rejected"}.`, tone: approve ? "mint" : "rose" };
  });
}
