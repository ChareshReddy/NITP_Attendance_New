import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDecideFor, visibleUserIds } from "@/lib/scope";
import { leaveBalances } from "@/lib/queries";
import { holidaySet } from "@/lib/settings";
import { fmtDate, ymdInTz } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Badge, Card, Empty, Ring } from "@/components/ui";
import { LeaveForm } from "@/components/client/LeaveForm";
import { applyWfh, decideLeave, withdrawRequest } from "@/app/actions/leave";

export const metadata: Metadata = { title: "Leave & WFH" };

const QUOTA_TONES: Tone[] = ["sky", "rose", "mint", "lav", "peach", "lemon"];
const cap = (s: string) => s[0] + s.slice(1).toLowerCase();

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireUser();
  const tab = (await searchParams).tab === "wfh" ? "wfh" : "leave";
  const isMgr = me.role !== "EMPLOYEE";
  const ids = await visibleUserIds(me);
  const [balances, leaves, wfhs, holidays, user] = await Promise.all([
    leaveBalances(me.id),
    db.leaveRequest.findMany({ where: ids ? { userId: { in: ids } } : {}, include: { user: { select: { name: true } }, leaveType: true }, orderBy: { createdAt: "desc" }, take: 60 }),
    db.wfhRequest.findMany({ where: ids ? { userId: { in: ids } } : {}, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 60 }),
    holidaySet(),
    db.user.findUnique({ where: { id: me.id }, select: { ctcAnnual: true } }),
  ]);
  const decide = new Map<string, boolean>();
  for (const r of [...leaves, ...wfhs]) if (r.status === "PENDING" && !decide.has(r.userId)) decide.set(r.userId, await canDecideFor(me, r.userId));

  type Req = { key: string; kind: "leave" | "wfh"; id: string; tag: string; tone: Tone; head: string; sub: string; lop: number; status: string; mine: boolean; canAct: boolean; canWithdraw: boolean; at: Date };
  const today = ymdInTz();
  const reqs: Req[] = [
    ...leaves.map((x) => ({
      key: "l" + x.id, kind: "leave" as const, id: x.id, tag: x.leaveType.name.slice(0, 3).toUpperCase(), tone: "rose" as Tone,
      head: `${isMgr && x.userId !== me.id ? x.user.name + " · " : ""}${x.leaveType.name} · ${x.days} day${x.days > 1 ? "s" : ""}`,
      sub: `${fmtDate(x.fromDate)} → ${fmtDate(x.toDate)} · ${x.reason}`, lop: x.lopDays, status: cap(x.status), mine: x.userId === me.id,
      canAct: x.status === "PENDING" && !!decide.get(x.userId),
      canWithdraw: x.userId === me.id && (x.status === "PENDING" || (x.status === "APPROVED" && x.fromDate.toISOString().slice(0, 10) > today)), at: x.createdAt,
    })),
    ...wfhs.map((x) => ({
      key: "w" + x.id, kind: "wfh" as const, id: x.id, tag: "WFH", tone: "sky" as Tone,
      head: `${isMgr && x.userId !== me.id ? x.user.name + " · " : ""}Work from home`, sub: `${fmtDate(x.date)} · ${x.reason}`, lop: 0, status: cap(x.status), mine: x.userId === me.id,
      canAct: x.status === "PENDING" && !!decide.get(x.userId), canWithdraw: x.userId === me.id && ["PENDING", "APPROVED"].includes(x.status) && x.date.toISOString().slice(0, 10) >= today, at: x.createdAt,
    })),
  ].sort((a, b) => Number(b.canAct) - Number(a.canAct) || b.at.getTime() - a.at.getTime());
  const pendingForMe = reqs.filter((r) => r.canAct).length;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid-auto" style={{ ["--min" as string]: "210px" }}>
        {balances.map((b, i) => {
          const t = TONES[QUOTA_TONES[i % QUOTA_TONES.length]];
          return (
            <section key={b.id} className="tone-card" style={{ background: t.bg, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Ring pct={b.total ? (b.remaining / b.total) * 100 : 0} color={t.ac}>{b.remaining}</Ring>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="eyebrow" style={{ color: t.fg }}>{b.name}</span>
                <span style={{ font: "600 13px var(--font-sans)" }}>{b.remaining} of {b.total} left</span>
                <span className="meta" style={{ color: t.fg }}>{b.used} used{b.pending ? ` · ${b.pending} pending` : ""}</span>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "340px", alignItems: "start" }}>
        <Card>
          <div className="segmented" style={{ alignSelf: "flex-start" }}>
            <Link href="/leave" aria-current={tab === "leave" ? "page" : undefined}>Apply leave</Link>
            <Link href="/leave?tab=wfh" aria-current={tab === "wfh" ? "page" : undefined}>Work from home</Link>
          </div>
          {tab === "leave" ? (
            <LeaveForm balances={balances.map((b) => ({ id: b.id, name: b.name, remaining: b.remaining }))} holidays={[...holidays]} monthlyGross={user?.ctcAnnual ? Math.round(user.ctcAnnual / 12) : null} today={today} />
          ) : (
            <ActionForm action={applyWfh} className="form-grid">
              <label className="field full">Date<input name="date" type="date" required min={today} className="input" /></label>
              <label className="field full">Reason &amp; deliverables<textarea name="reason" required rows={3} maxLength={300} placeholder="What you'll deliver while remote" className="input" /></label>
              <button type="submit" className="btn btn-primary full">Request WFH</button>
            </ActionForm>
          )}
        </Card>

        <Card title={isMgr ? `Requests · ${pendingForMe} need your decision` : "My requests"}>
          {reqs.length === 0 && <Empty>No requests yet.</Empty>}
          {reqs.map((r) => (
            <div key={r.key} className="row" style={{ flexWrap: "wrap" }}>
              <span className="tag" style={{ background: TONES[r.tone].bg, color: TONES[r.tone].fg }}>{r.tag}</span>
              <span style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "700 13px var(--font-sans)" }}>{r.head}</span>
                <span className="meta" style={{ fontSize: 11.5 }}>{r.sub}</span>
              </span>
              {r.lop > 0 && <Badge label={`${r.lop}d LOP`} tone="rose" />}
              {r.canAct ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <ActionButton className="btn btn-reject btn-sm" action={decideLeave.bind(null, r.kind, r.id, false)}>Reject</ActionButton>
                  <ActionButton className="btn btn-approve btn-sm" action={decideLeave.bind(null, r.kind, r.id, true)}>Approve</ActionButton>
                </span>
              ) : (
                <Badge status={r.status} />
              )}
              {r.canWithdraw && <ActionButton action={withdrawRequest.bind(null, r.kind, r.id)} confirmText="Withdraw this request?">Withdraw</ActionButton>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
