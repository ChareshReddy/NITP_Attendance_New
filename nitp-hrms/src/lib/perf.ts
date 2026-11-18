import "server-only";
import { db } from "./db";
import { ymdInTz } from "./time";
import type { Tone } from "./tones";

export function currentCycle(): string {
  const d = ymdInTz();
  return `${d.slice(0, 4)}-${Number(d.slice(5, 7)) <= 6 ? "H1" : "H2"}`;
}

export function cycleLabel(c: string): string {
  return `${c.slice(5)} ${c.slice(0, 4)}`;
}

export const BANDS: { name: string; from: number; to: number; tone: Tone }[] = [
  { name: "Red", from: 0, to: 40, tone: "rose" },
  { name: "Yellow", from: 40, to: 60, tone: "lemon" },
  { name: "Green", from: 60, to: 85, tone: "mint" },
  { name: "Blue", from: 85, to: 100, tone: "sky" },
];

export function bandFor(score: number) {
  return BANDS.find((b) => score < b.to) ?? BANDS[3];
}

/** Weighted goal score, replaced by the latest HR override when one exists. `null` when no goals are set. */
export async function scoreFor(userId: string, cycle = currentCycle()) {
  const [goals, override] = await Promise.all([
    db.performanceGoal.findMany({ where: { userId, cycle } }),
    db.performanceReview.findFirst({ where: { userId, cycle, kind: "OVERRIDE" }, orderBy: { createdAt: "desc" } }),
  ]);
  const tw = goals.reduce((a, g) => a + g.weight, 0);
  const self = tw ? Math.round(goals.reduce((a, g) => a + g.weight * g.progress, 0) / tw) : null;
  const final = override?.score ?? self;
  return { self, final, override, goals, totalWeight: tw };
}
