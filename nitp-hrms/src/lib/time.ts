// All "calendar day" logic runs in the company timezone, not the server's.
export const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(d: Date) {
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
  return o;
}

/** YYYY-MM-DD of an instant in the company timezone. */
export function ymdInTz(d: Date = new Date()): string {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minutes since midnight (company timezone) for an instant. */
export function minutesInTz(d: Date = new Date()): number {
  const p = parts(d);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** HH:MM of an instant in the company timezone. */
export function hmInTz(d: Date | null | undefined): string {
  if (!d) return "—";
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
}

/** The instant for a wall-clock date and time in the company timezone. */
export function instantFromLocal(ymdStr: string, hm: string): Date {
  const [h, m] = hm.split(":").map(Number);
  const guess = new Date(`${ymdStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`);
  // offset = local wall time of `guess` minus UTC wall time
  const p = parts(guess);
  const localAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  const offset = localAsUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}

/** A @db.Date value for a YYYY-MM-DD string. */
export function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** YYYY-MM-DD of a @db.Date value. */
export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayDate(): Date {
  return dateOnly(ymdInTz());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export function isWeekend(d: Date): boolean {
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}

/** Working days between two @db.Date values (inclusive), skipping weekends and holidays. */
export function workingDays(from: Date, to: Date, holidays: Set<string> = new Set()): number {
  let n = 0;
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    if (!isWeekend(d) && !holidays.has(ymd(d))) n++;
  }
  return n;
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start, end };
}

export function currentMonth(): string {
  return ymdInTz().slice(0, 7);
}

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!d) return "—";
  const x = typeof d === "string" ? dateOnly(d) : d;
  return x.toLocaleDateString("en-IN", { timeZone: "UTC", ...opts });
}

export function fmtDateTime(d: Date): string {
  return d.toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function monthLabel(month: string): string {
  return fmtDate(`${month}-01`, { month: "short", year: "numeric" });
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
