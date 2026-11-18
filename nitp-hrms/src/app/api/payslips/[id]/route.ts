import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { esc, printablePage } from "@/lib/printable";
import { inr, monthLabel } from "@/lib/time";

type Lines = { earnings: { label: string; amount: number }[]; deductions: { label: string; amount: number }[] };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.mustChangePassword) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  const p = await db.payslip.findUnique({ where: { id }, include: { run: true, user: { select: { name: true, empCode: true, title: true, department: true } } } });
  if (!p || (p.userId !== me.id && me.role !== "HR")) return new NextResponse("Not found.", { status: 404 });
  const l = p.lines as Lines;
  const rows = (a: Lines["earnings"], neg = false) => a.map((x) => `<tr><td>${esc(x.label)}</td><td class="r">${neg && x.amount ? "−" : ""}${inr(x.amount)}</td></tr>`).join("");
  const body = `
    <h1>Payslip · ${esc(monthLabel(p.run.month))}</h1>
    <p class="muted">${esc(p.user.name)} · ${esc(p.user.empCode)}${p.user.title ? " · " + esc(p.user.title) : ""}${p.user.department ? " · " + esc(p.user.department) : ""}</p>
    <p class="muted">Paid days ${p.paidDays} · Loss of pay ${p.lopDays} day(s)</p>
    <div class="cols">
      <table><thead><tr><th>Earnings</th><th class="r">Amount</th></tr></thead><tbody>${rows(l.earnings)}</tbody><tfoot><tr><td>Gross</td><td class="r">${inr(p.gross)}</td></tr></tfoot></table>
      <table><thead><tr><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>${rows(l.deductions, true)}</tbody><tfoot><tr><td>Total</td><td class="r">${inr(p.deductions)}</td></tr></tfoot></table>
    </div>
    <div class="net">Net pay <strong>${inr(p.net)}</strong></div>
    <p class="muted small">Computer-generated payslip. TDS is an estimate under the new tax regime.</p>`;
  return new NextResponse(printablePage(`Payslip ${p.run.month} ${p.user.empCode}`, body), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
