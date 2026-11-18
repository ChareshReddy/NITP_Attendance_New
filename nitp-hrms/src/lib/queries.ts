import "server-only";
import { db } from "./db";
import { addDays, dateOnly, fmtDate, hmInTz, isWeekend, monthRange, ymd, ymdInTz } from "./time";
import { holidaySet } from "./settings";
import type { Tone } from "./tones";

export async function todayAttendance(userId: string) {
  return db.attendance.findUnique({ where: { userId_date: { userId, date: dateOnly(ymdInTz()) } } });
}

export type DayCell = { ymd: string; day: number; status: string; tone: Tone | "today" | "future" | "none"; tip: string };

export async function monthCalendar(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const today = ymdInTz();
  const [rows, leaves, holidays] = await Promise.all([
    db.attendance.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    db.leaveRequest.findMany({ where: { userId, status: "APPROVED", fromDate: { lte: end }, toDate: { gte: start } } }),
    holidaySet(),
  ]);
  const byDay = new Map(rows.map((r) => [ymd(r.date), r]));
  const cells: DayCell[] = [];
  const counts = { Present: 0, Late: 0, WFH: 0, Leave: 0, Absent: 0 };
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const k = ymd(d);
    const r = byDay.get(k);
    const onLeave = leaves.some((l) => l.fromDate <= d && l.toDate >= d);
    let status = "";
    let tone: DayCell["tone"] = "none";
    if (r?.punchIn) {
      status = r.kind === "WFH" ? "WFH" : r.late ? "Late" : "Present";
      tone = r.kind === "WFH" ? "sky" : r.late ? "lemon" : "mint";
    } else if (onLeave && !isWeekend(d)) {
      status = "Leave";
      tone = "lav";
    } else if (holidays.has(k)) {
      status = "Holiday";
      tone = "gray";
    } else if (isWeekend(d)) {
      status = "Weekend";
      tone = "gray";
    } else if (k > today) {
      status = "Upcoming";
      tone = "future";
    } else if (k === today) {
      status = "Today — not punched in";
      tone = "today";
    } else {
      status = "Absent";
      tone = "rose";
    }
    if (status in counts) counts[status as keyof typeof counts]++;
    const times = r?.punchIn ? ` · ${hmInTz(r.punchIn)}–${hmInTz(r.punchOut)}` : "";
    cells.push({ ymd: k, day: d.getUTCDate(), status, tone, tip: `${fmtDate(k, { day: "numeric", month: "short" })}: ${status}${times}` });
  }
  return { cells, counts, firstWeekday: start.getUTCDay(), rows };
}

/** Worked hours per day for the last `n` working days (including today). */
export async function recentHours(userId: string, n = 7) {
  const today = dateOnly(ymdInTz());
  const days: Date[] = [];
  for (let d = today; days.length < n; d = addDays(d, -1)) if (!isWeekend(d)) days.unshift(d);
  const rows = await db.attendance.findMany({ where: { userId, date: { gte: days[0], lte: today } } });
  const m = new Map(rows.map((r) => [ymd(r.date), r]));
  const now = Date.now();
  return days.map((d) => {
    const r = m.get(ymd(d));
    let mins = r?.workMinutes ?? 0;
    if (r?.punchIn && !r.punchOut && ymd(d) === ymd(today)) mins = Math.round((now - r.punchIn.getTime()) / 60000);
    return { ymd: ymd(d), hours: Math.round((mins / 60) * 10) / 10, kind: r?.kind, late: r?.late ?? false, isToday: ymd(d) === ymd(today) };
  });
}

/** Leave balances for the current calendar year. */
export async function leaveBalances(userId: string) {
  const year = ymdInTz().slice(0, 4);
  const [types, used] = await Promise.all([
    db.leaveType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.leaveRequest.findMany({
      where: { userId, status: { in: ["APPROVED", "PENDING"] }, fromDate: { gte: dateOnly(`${year}-01-01`), lte: dateOnly(`${year}-12-31`) } },
      select: { leaveTypeId: true, days: true, lopDays: true, status: true },
    }),
  ]);
  return types.map((t) => {
    const approved = used.filter((u) => u.leaveTypeId === t.id && u.status === "APPROVED").reduce((a, u) => a + u.days - u.lopDays, 0);
    const pending = used.filter((u) => u.leaveTypeId === t.id && u.status === "PENDING").reduce((a, u) => a + u.days - u.lopDays, 0);
    return { id: t.id, name: t.name, total: t.annualQuota, used: approved, pending, remaining: Math.max(0, t.annualQuota - approved - pending) };
  });
}
