import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleUserIds } from "@/lib/scope";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || me.mustChangePassword) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  const t = await db.trackSheet.findUnique({ where: { id }, select: { userId: true, attachment: true, attachmentName: true, attachmentType: true } });
  const ids = await visibleUserIds(me);
  if (!t?.attachment || (ids && !ids.includes(t.userId))) return new NextResponse("Not found.", { status: 404 });
  const name = (t.attachmentName ?? "attachment").replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(t.attachment), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
