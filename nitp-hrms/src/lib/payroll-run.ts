import "server-only";
import { db } from "./db";
import { buildPayslip } from "./payroll";
import { monthRange } from "./time";

/** Computes payslips for every active person with a CTC, for a YYYY-MM month. */
export async function computePayroll(month: string) {
  const { start, end } = monthRange(month);
  const daysInMonth = end.getUTCDate();
  const people = await db.user.findMany({
    where: { active: true, ctcAnnual: { gt: 0 }, OR: [{ dateOfJoining: null }, { dateOfJoining: { lte: end } }] },
    select: { id: true, name: true, empCode: true, title: true, ctcAnnual: true, dateOfJoining: true },
    orderBy: { name: "asc" },
  });
  const leaves = await db.leaveRequest.findMany({
    where: { status: "APPROVED", lopDays: { gt: 0 }, fromDate: { gte: start, lte: end }, userId: { in: people.map((p) => p.id) } },
    select: { userId: true, lopDays: true },
  });
  const missing = await db.user.count({ where: { active: true, OR: [{ ctcAnnual: null }, { ctcAnnual: 0 }] } });
  const rows = people.map((p) => {
    let lop = leaves.filter((l) => l.userId === p.id).reduce((a, l) => a + l.lopDays, 0);
    // Joined mid-month: days before joining are unpaid.
    if (p.dateOfJoining && p.dateOfJoining > start) lop += p.dateOfJoining.getUTCDate() - 1;
    return { user: p, slip: buildPayslip(p.ctcAnnual!, daysInMonth, lop) };
  });
  return { rows, daysInMonth, missingCtc: missing };
}
