import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleUserIds } from "@/lib/scope";
import { addDays, dateOnly, fmtDate, ymdInTz } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Avatar, Badge, Card, Empty, Progress } from "@/components/ui";
import { deleteTrackSheet, logTrackSheet, reviewTrackSheet } from "@/app/actions/work";

export const metadata: Metadata = { title: "Track Sheet" };

const PAGE = 25;
const PROJECT_TONES: Tone[] = ["lav", "mint", "sky", "lemon", "peach", "rose"];
const projectTone = (p: string) => PROJECT_TONES[[...p].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0) % PROJECT_TONES.length];
const STATUS = { SUBMITTED: "Submitted", APPROVED: "Approved", CHANGES_REQUESTED: "Changes requested" } as const;

export default async function TrackSheetPage({ searchParams }: { searchParams: Promise<{ p?: string; f?: string; u?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.p) || 1);
  const filter = sp.f === "review" ? "review" : "all";
  const ids = await visibleUserIds(me);
  const isMgr = me.role !== "EMPLOYEE";
  const scopeIds = ids ?? undefined;
  const who = sp.u && (!ids || ids.includes(sp.u)) ? sp.u : undefined;

  const where = {
    ...(who ? { userId: who } : scopeIds ? { userId: { in: scopeIds } } : {}),
    ...(filter === "review" ? { status: "SUBMITTED" as const, userId: who ?? (scopeIds ? { in: scopeIds.filter((x) => x !== me.id) } : { not: me.id }) } : {}),
  };

  const today = dateOnly(ymdInTz());
  const weekStart = addDays(today, -((today.getUTCDay() + 6) % 7)); // Monday
  const [entries, total, week, myProjects, people, toReview] = await Promise.all([
    db.trackSheet.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { id: true, userId: true, date: true, project: true, hours: true, description: true, link: true, attachmentName: true, status: true, reviewNote: true, user: { select: { name: true } } },
    }),
    db.trackSheet.count({ where }),
    db.trackSheet.groupBy({ by: ["project"], where: { userId: me.id, date: { gte: weekStart, lte: today } }, _sum: { hours: true } }),
    db.trackSheet.findMany({ where: { userId: me.id }, distinct: ["project"], select: { project: true }, orderBy: { date: "desc" }, take: 30 }),
    isMgr ? db.user.findMany({ where: { active: true, ...(ids ? { id: { in: ids } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isMgr ? db.trackSheet.count({ where: { status: "SUBMITTED", userId: scopeIds ? { in: scopeIds.filter((x) => x !== me.id) } : { not: me.id } } }) : Promise.resolve(0),
  ]);
  const weekTotal = week.reduce((a, b) => a + (b._sum.hours ?? 0), 0);
  const maxP = Math.max(1, ...week.map((w) => w._sum.hours ?? 0));
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (o: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged = { f: filter === "review" ? "review" : undefined, u: who, p: page, ...o };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "p" && v === 1)) q.set(k, String(v));
    return `/tracksheet${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid-auto" style={{ ["--min" as string]: "340px" }}>
        <Card title="Log your work">
          <ActionForm action={logTrackSheet} className="form-grid">
            <label className="field">Date<input name="date" type="date" required max={ymdInTz()} defaultValue={ymdInTz()} className="input" /></label>
            <label className="field">Hours<input name="hours" type="number" min="0.25" max="16" step="0.25" required placeholder="2.5" className="input" /></label>
            <label className="field full">
              Project
              <input name="project" list="projects" required maxLength={120} placeholder="Project or client" className="input" />
              <datalist id="projects">{myProjects.map((p) => <option key={p.project} value={p.project} />)}</datalist>
            </label>
            <label className="field full">What did you work on?<textarea name="description" required rows={2} maxLength={2000} placeholder="Describe the work and its outcome" className="input" /></label>
            <label className="field">Link<input name="link" type="url" placeholder="https://" className="input" /></label>
            <label className="field">Attachment (max 2 MB)<input name="file" type="file" className="input" style={{ padding: 7, borderStyle: "dashed" }} /></label>
            <button type="submit" className="btn btn-primary full">Submit entry</button>
          </ActionForm>
        </Card>
        <section className="tone-card" style={{ background: TONES.mint.bg }}>
          <span className="ring-motif" style={{ color: TONES.mint.ac }} />
          <span className="eyebrow" style={{ color: TONES.mint.fg }}>Your hours this week</span>
          <span className="stat tnum">{weekTotal.toFixed(1)}<span style={{ fontSize: 18, color: TONES.mint.fg }}> / 40h</span></span>
          <Progress pct={(weekTotal / 40) * 100} tone="mint" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
            {week.length === 0 && <span style={{ font: "600 13px var(--font-sans)", color: TONES.mint.fg }}>Nothing logged since Monday.</span>}
            {week
              .sort((a, b) => (b._sum.hours ?? 0) - (a._sum.hours ?? 0))
              .map((w) => (
                <div key={w.project} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, font: "700 12.5px var(--font-sans)" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.project}</span>
                    <span className="mono">{(w._sum.hours ?? 0).toFixed(1)}h</span>
                  </div>
                  <div className="bar-track" style={{ background: "rgba(255,255,255,.7)" }}>
                    <div className="bar-fill" style={{ width: `${((w._sum.hours ?? 0) / maxP) * 100}%`, background: TONES[projectTone(w.project)].ac }} />
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      <Card
        title={isMgr ? (filter === "review" ? `Awaiting review · ${toReview}` : "Team entries") : "Your entries"}
        aside={`${total.toLocaleString("en-IN")} entries`}
      >
        {isMgr && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="segmented">
              <Link href={link({ f: undefined, p: 1 })} aria-current={filter === "all" ? "page" : undefined}>All</Link>
              <Link href={link({ f: "review", p: 1 })} aria-current={filter === "review" ? "page" : undefined}>To review ({toReview})</Link>
            </div>
            <form action="/tracksheet" style={{ display: "flex", gap: 6 }}>
              {filter === "review" && <input type="hidden" name="f" value="review" />}
              <select name="u" defaultValue={who ?? ""} className="input" style={{ width: 200 }} aria-label="Filter by person">
                <option value="">Everyone</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" type="submit">Filter</button>
            </form>
          </div>
        )}
        {entries.length === 0 && <Empty>{filter === "review" ? "Nothing waiting for review." : "No entries yet. Log your first one above."}</Empty>}
        {entries.map((x) => {
          const pt = TONES[projectTone(x.project)];
          const st = STATUS[x.status];
          const canReview = isMgr && x.status === "SUBMITTED" && x.userId !== me.id;
          return (
            <div key={x.id} className="row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              {isMgr && <Avatar name={x.user.name} size={34} />}
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {isMgr && <span style={{ font: "700 13px var(--font-sans)" }}>{x.user.name}</span>}
                  <span className="badge" style={{ background: pt.bg, color: pt.fg }}>{x.project}</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>{fmtDate(x.date)} · {x.hours}h</span>
                </div>
                <span style={{ font: "500 13px/1.5 var(--font-sans)" }}>{x.description}</span>
                {(x.link || x.attachmentName) && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", font: "600 12px var(--font-sans)" }}>
                    {x.link && <a href={x.link} target="_blank" rel="noopener noreferrer">↗ {x.link.replace(/^https?:\/\//, "").slice(0, 48)}</a>}
                    {x.attachmentName && <a href={`/api/attachments/${x.id}`}>Attachment: {x.attachmentName}</a>}
                  </div>
                )}
                {x.reviewNote && <span className="meta">Reviewer note: {x.reviewNote}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {canReview ? (
                  <>
                    <ActionButton className="btn btn-reject btn-sm" action={reviewTrackSheet.bind(null, x.id, false, undefined)}>Request changes</ActionButton>
                    <ActionButton className="btn btn-approve btn-sm" action={reviewTrackSheet.bind(null, x.id, true, undefined)}>Approve</ActionButton>
                  </>
                ) : (
                  <Badge status={st} />
                )}
                {x.userId === me.id && x.status !== "APPROVED" && (
                  <ActionButton action={deleteTrackSheet.bind(null, x.id)} confirmText="Delete this entry?" label="Delete entry">Delete</ActionButton>
                )}
              </div>
            </div>
          );
        })}
        {pages > 1 && (
          <nav aria-label="Pages" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            {page > 1 ? <Link className="btn btn-ghost btn-sm" href={link({ p: page - 1 })}>← Newer</Link> : <span />}
            <span className="meta">Page {page} of {pages}</span>
            {page < pages ? <Link className="btn btn-ghost btn-sm" href={link({ p: page + 1 })}>Older →</Link> : <span />}
          </nav>
        )}
      </Card>
    </div>
  );
}
