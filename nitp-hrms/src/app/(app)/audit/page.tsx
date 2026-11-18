import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { Card, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Audit Log" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  await requireUser(["HR"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.p) || 1);
  const where = q ? { OR: [{ action: { contains: q, mode: "insensitive" as const } }, { actor: { name: { contains: q, mode: "insensitive" as const } } }] } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/audit?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <form action="/audit" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input name="q" defaultValue={q} placeholder="Search actions or people…" aria-label="Search the audit log" className="input" style={{ flex: 1, minWidth: 220, borderRadius: 12, padding: "11px 14px" }} />
        <button type="submit" className="btn btn-ghost">Search</button>
        <a className="btn btn-primary" href={`/api/audit/csv${q ? `?q=${encodeURIComponent(q)}` : ""}`}>Export CSV</a>
      </form>
      <Card title="Timeline" aside={`${total.toLocaleString("en-IN")} entries`}>
        {rows.length === 0 && <Empty>{q ? `Nothing matches “${q}”.` : "No activity recorded yet."}</Empty>}
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
          {rows.map((r) => {
            const t = TONES[(r.tone as Tone) in TONES ? (r.tone as Tone) : "sky"];
            return (
              <li key={r.id} style={{ display: "flex", gap: 14, padding: "10px 4px", borderBottom: "1px solid #f3f2ef", alignItems: "flex-start" }}>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)", width: 110, flex: "none", paddingTop: 2 }}>{fmtDateTime(r.createdAt)}</span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: t.ac, boxShadow: `0 0 0 4px ${t.bg}`, marginTop: 5, flex: "none" }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span style={{ font: "600 13px/1.45 var(--font-sans)" }}>{r.action}</span>
                  <span className="meta">{r.actor?.name ?? "System"}</span>
                </span>
              </li>
            );
          })}
        </ol>
        {pages > 1 && (
          <nav aria-label="Pages" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {page > 1 ? <Link className="btn btn-ghost btn-sm" href={href(page - 1)}>← Newer</Link> : <span />}
            <span className="meta">Page {page} of {pages}</span>
            {page < pages ? <Link className="btn btn-ghost btn-sm" href={href(page + 1)}>Older →</Link> : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
