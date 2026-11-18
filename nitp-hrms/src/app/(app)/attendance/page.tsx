import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthCalendar, todayAttendance } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { teamMemberIds, visibleUserIds } from "@/lib/scope";
import { TZ, currentMonth, fmtDate, hmInTz, monthLabel, ymdInTz, fmtHours, ymd } from "@/lib/time";
import { TONES } from "@/lib/tones";
import { PunchCard } from "@/components/client/PunchCard";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Avatar, Badge, Card, Empty } from "@/components/ui";
import { decideRegularisation, requestRegularisation } from "@/app/actions/attendance";
import { UserPicker } from "@/components/client/UserPicker";

export const metadata: Metadata = { title: "Attendance" };

function shiftMonth(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  const x = new Date(Date.UTC(y, mo - 1 + d, 1));
  return x.toISOString().slice(0, 7);
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ m?: string; u?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m! : currentMonth();
  const ids = await visibleUserIds(me);
  const viewId = sp.u && (ids === null || ids.includes(sp.u)) ? sp.u : me.id;
  const viewing = viewId === me.id ? null : await db.user.findUnique({ where: { id: viewId }, select: { name: true } });
  const people = me.role === "EMPLOYEE" ? [] : await db.user.findMany({ where: { active: true, ...(ids ? { id: { in: ids } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  const [s, today, cal] = await Promise.all([getSettings(), todayAttendance(me.id), monthCalendar(viewId, month)]);
  const records = [...cal.rows].filter((r) => r.punchIn).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  const myRegs = await db.regularisation.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 4 });
  const team = me.role === "TL" ? await teamMemberIds(me.id) : null;
  const pending =
    me.role === "EMPLOYEE"
      ? []
      : await db.regularisation.findMany({
          where: { status: "PENDING", userId: team ? { in: team } : { not: me.id } },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });

  const todayStr = ymdInTz();
  const qs = (m: string) => `/attendance?m=${m}${viewId !== me.id ? `&u=${viewId}` : ""}`;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid-auto" style={{ ["--min" as string]: "340px" }}>
        <PunchCard
          variant="hero"
          tz={TZ}
          dateLabel={fmtDate(todayStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          punchIn={today?.punchIn?.toISOString() ?? null}
          punchOut={today?.punchOut?.toISOString() ?? null}
          late={today?.late ?? false}
          early={today?.earlyLeave ?? false}
          wfh={today?.kind === "WFH"}
          shiftHours={s.shiftHours}
          ip={today?.inIp}
          timezone={today?.timezone}
        />
        <Card
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href={qs(shiftMonth(month, -1))} className="btn btn-ghost btn-sm" aria-label="Previous month">←</Link>
              {monthLabel(month)}
              <Link href={qs(shiftMonth(month, 1))} className="btn btn-ghost btn-sm" aria-label="Next month">→</Link>
            </span>
          }
          aside={viewing ? `Viewing ${viewing.name}` : "Hover a day for details"}
        >
          {people.length > 0 && <UserPicker people={people} current={viewId} base={`/attendance?m=${month}`} />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {(
              [
                ["Present", "mint"],
                ["Late", "lemon"],
                ["WFH", "sky"],
                ["Leave", "lav"],
              ] as const
            ).map(([k, t]) => (
              <div key={k} style={{ background: TONES[t].bg, borderRadius: 14, padding: 12 }}>
                <div className="tnum" style={{ font: "600 24px/1 var(--font-display)" }}>{cal.counts[k]}</div>
                <div style={{ font: "700 11px var(--font-sans)", color: TONES[t].fg, marginTop: 4 }}>{k}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }} role="grid" aria-label={`Attendance for ${monthLabel(month)}`}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i} style={{ textAlign: "center", font: "700 10.5px var(--font-sans)", color: "var(--text-3)" }}>{d}</span>
            ))}
            {Array.from({ length: cal.firstWeekday }).map((_, i) => <span key={`b${i}`} />)}
            {cal.cells.map((c) => {
              const isToday = c.ymd === todayStr;
              const t = c.tone in TONES ? TONES[c.tone as keyof typeof TONES] : null;
              const style: React.CSSProperties =
                c.tone === "future"
                  ? { background: "#fafaf8", color: "#c4c2bc", border: "1px dashed #e6e4df" }
                  : c.tone === "today"
                    ? { background: "#fff", color: "#16161a", border: "2px solid #16161a" }
                    : { background: t!.bg, color: t!.fg, border: isToday ? "2px solid #16161a" : "1px solid transparent" };
              return (
                <div key={c.ymd} title={c.tip} aria-label={c.tip} style={{ aspectRatio: "1.25", borderRadius: 10, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "6px 8px", font: "700 12px var(--font-sans)", ...style }}>
                  {c.day}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "340px" }}>
        <Card title="Recent records" aside={viewing?.name}>
          <div className="scroll-x">
            <div className="table-head" style={{ gridTemplateColumns: "1.3fr 1fr 1fr .8fr 1fr" }}>
              <span>Date</span><span>In</span><span>Out</span><span>Hours</span><span>Status</span>
            </div>
            {records.length === 0 && <Empty>No punches recorded in {monthLabel(month)}.</Empty>}
            {records.map((r) => {
              const st = r.kind === "WFH" ? "WFH" : r.late ? "Late" : "Present";
              const mins = r.punchOut ? r.workMinutes : 0;
              return (
                <div key={r.id} className="table-row" style={{ gridTemplateColumns: "1.3fr 1fr 1fr .8fr 1fr" }}>
                  <span>{ymd(r.date) === todayStr ? "Today" : fmtDate(r.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className="mono">{hmInTz(r.punchIn)}</span>
                  <span className="mono">{hmInTz(r.punchOut)}</span>
                  <span className="mono">{r.punchOut ? fmtHours(mins) : "—"}</span>
                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Badge status={st} />
                    {r.earlyLeave && <Badge label="Early" tone="rose" />}
                    {r.regularised && <Badge label="Reg." tone="gray" />}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Regularisation request">
          <p className="meta" style={{ margin: "-8px 0 0", fontSize: 12.5 }}>Correct a missed or wrong punch. {me.role === "EMPLOYEE" ? "Goes to your TL or HR for approval." : "Goes to HR for approval."}</p>
          <ActionForm action={requestRegularisation} className="form-grid">
            <label className="field">Date<input name="date" type="date" required max={todayStr} className="input" /></label>
            <label className="field">Correct time<input name="time" type="time" required className="input" /></label>
            <label className="field full">
              Type
              <select name="type" className="input">
                <option>Missed punch-in</option>
                <option>Missed punch-out</option>
                <option>Wrong punch-out</option>
                <option>On-duty (client site)</option>
              </select>
            </label>
            <label className="field full">Reason<input name="reason" required maxLength={300} placeholder="e.g. Biometric terminal offline" className="input" /></label>
            <button type="submit" className="btn btn-primary full">Submit request</button>
          </ActionForm>
          {myRegs.map((x) => (
            <div key={x.id} className="row" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ font: "700 12.5px var(--font-sans)" }}>{x.type} · {fmtDate(x.date)} {x.time}</span>
                <span className="meta" style={{ fontSize: 11.5 }}>{x.reason}</span>
              </span>
              <Badge status={x.status[0] + x.status.slice(1).toLowerCase()} />
            </div>
          ))}
        </Card>
      </div>

      {me.role !== "EMPLOYEE" && (
        <section className="tone-card" style={{ background: "#fff4c9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 className="card-title">Regularisation approvals</h2>
            <span style={{ font: "700 12px var(--font-sans)", color: "#7a5a00" }}>{pending.length} pending</span>
          </div>
          {pending.length === 0 && <div style={{ font: "600 13px var(--font-sans)", color: "#7a5a00" }}>No pending regularisations.</div>}
          {pending.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 14, padding: "12px 14px", flexWrap: "wrap" }}>
              <Avatar name={x.user.name} />
              <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "700 13px var(--font-sans)" }}>{x.user.name} — {x.type}</span>
                <span className="meta">{fmtDate(x.date)} at {x.time} · {x.reason}</span>
              </div>
              <ActionButton className="btn btn-reject btn-sm" action={decideRegularisation.bind(null, x.id, false)}>Reject</ActionButton>
              <ActionButton className="btn btn-approve btn-sm" action={decideRegularisation.bind(null, x.id, true)}>Approve</ActionButton>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
