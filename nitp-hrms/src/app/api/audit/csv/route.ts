import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvCell } from "@/lib/printable";

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "HR" || me.mustChangePassword) return new NextResponse("Not allowed.", { status: 403 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const rows = await db.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { actor: { name: { contains: q, mode: "insensitive" } } }] } : {},
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50000,
  });
  const lines = [["Time (UTC)", "Person", "Email", "Action"].map(csvCell).join(",")];
  for (const r of rows) lines.push([r.createdAt.toISOString(), r.actor?.name ?? "System", r.actor?.email ?? "", r.action].map(csvCell).join(","));
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nitp-audit-log.csv"`, "Cache-Control": "private, no-store" },
  });
}
