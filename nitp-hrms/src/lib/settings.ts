import "server-only";
import { db } from "./db";

export type AppSettings = {
  shiftStart: string; // HH:MM
  graceMins: number;
  shiftHours: number;
  companyName: string;
};

const DEFAULTS: AppSettings = { shiftStart: "09:30", graceMins: 15, shiftHours: 9, companyName: "NITP" };

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.setting.findMany();
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    shiftStart: /^\d{2}:\d{2}$/.test(m.shiftStart ?? "") ? m.shiftStart : DEFAULTS.shiftStart,
    graceMins: Number.isFinite(Number(m.graceMins)) && m.graceMins !== undefined ? Number(m.graceMins) : DEFAULTS.graceMins,
    shiftHours: Number(m.shiftHours) > 0 ? Number(m.shiftHours) : DEFAULTS.shiftHours,
    companyName: m.companyName || DEFAULTS.companyName,
  };
}

export function shiftStartMinutes(s: AppSettings): number {
  const [h, m] = s.shiftStart.split(":").map(Number);
  return h * 60 + m;
}

export function shiftLabel(s: AppSettings): string {
  const start = shiftStartMinutes(s);
  const end = start + s.shiftHours * 60;
  const f = (x: number) => `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  return `${f(start)}–${f(end)}`;
}

export async function holidaySet(): Promise<Set<string>> {
  const rows = await db.holiday.findMany({ select: { date: true } });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
}
