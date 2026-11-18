import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvCell } from "@/lib/printable";

export async function GET(_req: Request, { params }: { params: Promise<{ month: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.role !== "HR" || me.mustChangePassword) return new NextResponse("Not allowed.", { status: 403 });
  const { month } = await params;
  const run = await db.payrollRun.findUnique({ where: { month }, include: { payslips: { include: { user: { select: { name: true, empCode: true, email: true } } } } } });
  if (!run) return new NextResponse("No payroll for that month.", { status: 404 });
  const lines = [["Employee code", "Name", "Email", "Gross", "Deductions", "Net", "LOP days", "Paid days"].map(csvCell).join(",")];
  for (const p of run.payslips.sort((a, b) => a.user.name.localeCompare(b.user.name)))
    lines.push([p.user.empCode, p.user.name, p.user.email, p.gross, p.deductions, p.net, p.lopDays, p.paidDays].map(csvCell).join(","));
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nitp-payroll-${month}.csv"`, "Cache-Control": "private, no-store" },
  });
}
