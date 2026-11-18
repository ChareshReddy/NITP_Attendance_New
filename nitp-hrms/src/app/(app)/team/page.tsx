import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleUserIds } from "@/lib/scope";
import { getSettings } from "@/lib/settings";
import { dateOnly, hmInTz, ymdInTz } from "@/lib/time";
import { TONES, statusTone } from "@/lib/tones";
import { Avatar, Badge, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Team Live" };
export const revalidate = 0;

const FILTERS = ["All", "In", "Late", "WFH", "On leave", "Not punched"] as const;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const me = await requireUser(["HR", "TL"]);
  const f = (FILTERS as readonly string[]).includes((await searchParams).f ?? "") ? (await searchParams).f! : "All";
  const ids = await visibleUserIds(me);
  const today = dateOnly(ymdInTz());
  const s = await getSettings();
  const people = await db.user.findMany({
    where: { active: true, id: ids ? { in: ids.filter((x) => x !== me.id) } : { not: me.id } },
    select: { id: true, name: true, title: true, department: true, attendance: { where: { date: today } }, leaveRequests: { where: { status: "APPROVED", fromDate: { lte: today }, toDate: { gte: today } }, select: { id: true } } },
    orderBy: { name: "asc" },
  });
  const now = Date.now();
  const team = people.map((p) => {
    const a = p.attendance[0];
    const status = a?.punchIn ? (a.punchOut ? "Punched out" : a.kind === "WFH" ? "WFH" : a.late ? "Late" : "In") : p.leaveRequests.length ? "On leave" : "Not punched";
    const mins = a?.punchIn ? (a.punchOut ? a.workMinutes : Math.round((now - a.punchIn.getTime()) / 60000)) : 0;
    return { ...p, status, a, hours: mins / 60 };
  });
  const count = (k: string) => (k === "All" ? team.length : k === "In" ? team.filter((m) => ["In", "Late", "Punched out"].includes(m.status)).length : team.filter((m) => m.status === k).length);
  const list = f === "All" ? team : f === "In" ? team.filter((m) => ["In", "Late", "Punched out"].includes(m.status)) : team.filter((m) => m.status === f);

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="grid-auto" style={{ ["--min" as string]: "150px", gap: 12 }}>
        {FILTERS.map((k) => {
          const t = TONES[k === "All" ? "gray" : statusTone(k)];
          return (
            <Link key={k} href={k === "All" ? "/team" : `/team?f=${encodeURIComponent(k)}`} aria-current={f === k ? "page" : undefined} className="lift" style={{ textDecoration: "none", color: "var(--ink)", border: f === k ? "2px solid #16161a" : "2px solid transparent", background: t.bg, borderRadius: 18, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="tnum" style={{ font: "600 30px/1 var(--font-display)" }}>{count(k)}</span>
              <span style={{ font: "700 12px var(--font-sans)", color: t.fg }}>{k === "All" ? "Team size" : k === "In" ? "In office" : k}</span>
            </Link>
          );
        })}
      </div>
      {list.length === 0 && <Empty>No one matches this filter right now.</Empty>}
      <div className="grid-auto" style={{ ["--min" as string]: "240px", gap: 14 }}>
        {list.map((m) => {
          const t = TONES[statusTone(m.status)];
          return (
            <article key={m.id} className="card lift pop" style={{ borderRadius: 20, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={m.name} size={42} dot={t.ac} />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ font: "700 13.5px var(--font-sans)" }}>{m.name}</span>
                  <span className="meta" style={{ fontSize: 11.5 }}>{m.title ?? m.department ?? "—"}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Badge status={m.status} />
                <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>in {hmInTz(m.a?.punchIn)} · {m.hours.toFixed(1)}h</span>
              </div>
              <div className="bar-track" style={{ height: 6 }}>
                <div className="bar-fill" style={{ width: `${Math.min(100, (m.hours / s.shiftHours) * 100)}%`, background: t.ac }} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
