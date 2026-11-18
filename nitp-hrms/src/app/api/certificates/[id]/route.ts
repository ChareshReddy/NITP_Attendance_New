import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { esc, printablePage } from "@/lib/printable";
import { fmtDate } from "@/lib/time";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.mustChangePassword) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  const e = await db.trainingEnrollment.findUnique({ where: { id }, include: { training: true, user: { select: { name: true } } } });
  if (!e || e.status !== "COMPLETED" || (e.userId !== me.id && me.role !== "HR")) return new NextResponse("Not found.", { status: 404 });
  const body = `<div class="cert">
    <p class="muted" style="letter-spacing:.2em;text-transform:uppercase;font-size:12px;font-weight:800;color:#5236b8">Certificate of completion</p>
    <p class="muted">This certifies that</p>
    <h2>${esc(e.user.name)}</h2>
    <p class="muted">has successfully completed</p>
    <p style="font-size:18px;font-weight:700">${esc(e.training.title)}</p>
    <p class="muted" style="margin-top:20px;font-family:ui-monospace,monospace">${esc(fmtDate(e.training.date))} · ${esc(e.training.host)} · ID ${esc(e.certificate)}</p>
  </div>`;
  return new NextResponse(printablePage(`Certificate ${e.certificate}`, body), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
