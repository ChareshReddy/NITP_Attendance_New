import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveBalances, recentHours, todayAttendance } from "@/lib/queries";
import { getSettings, shiftLabel } from "@/lib/settings";
import { teamMemberIds, visibleUserIds } from "@/lib/scope";
import { bandFor, scoreFor } from "@/lib/perf";
import { TZ, currentMonth, dateOnly, fmtDate, fmtHours, hmInTz, minutesInTz, monthLabel, ymdInTz } from "@/lib/time";
import { TONES, firstName, type Tone } from "@/lib/tones";
import { PunchCard } from "@/components/client/PunchCard";
import { Card, Empty, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

type Stat = { label: string; value: string; sub: string; tone: Tone; href: string };

export default async function Dashboard() {
  const me = await requireUser();
  const s = await getSettings();
  const todayStr = ymdInTz();
  const today = dateOnly(todayStr);
  const [att, hours] = await Promise.all([todayAttendance(me.id), recentHours(me.id, 7)]);
  const ids = await visibleUserIds(me);
  const team = me.role === "TL" ? await teamMemberIds(me.id) : null;
  const othersFilter = me.role === "HR" ? { userId: { not: me.id } } : { userId: { in: team ?? [] } };

  let stats: Stat[];
  if (me.role === "EMPLOYEE") {
    const [bal, open, score] = await Promise.all([
      leaveBalances(me.id),
      db.task.count({ where: { assigneeId: me.id, status: { not: "DONE" } } }),
      scoreFor(me.id),
    ]);
    const mins = att?.punchIn ? (att.punchOut ? att.workMinutes : Math.round((Date.now() - att.punchIn.getTime()) / 60000)) : 0;
    stats = [
      { label: "Hours today", value: fmtHours(mins), sub: att?.punchIn ? (att.punchOut ? "Day complete" : "Clock running") : "Punch in to start", tone: "mint", href: "/attendance" },
      { label: "Leave balance", value: `${bal.reduce((a, b) => a + b.remaining, 0)}d`, sub: `Across ${bal.length} leave types`, tone: "rose", href: "/leave" },
      { label: "Open tasks", value: String(open), sub: "On your board", tone: "lemon", href: "/tasks" },
      { label: "Performance", value: score.final === null ? "—" : String(score.final), sub: score.final === null ? "No goals set yet" : `${bandFor(score.final).name} band`, tone: "sky", href: "/performance" },
    ];
  } else {
    const people = await db.user.findMany({ where: { active: true, id: ids ? { in: ids.filter((x) => x !== me.id) } : { not: me.id } }, select: { id: true } });
    const pids = people.map((p) => p.id);
    const [present, late, onLeave, pl, pw, pr, sheets] = await Promise.all([
      db.attendance.count({ where: { date: today, punchIn: { not: null }, userId: { in: pids } } }),
      db.attendance.count({ where: { date: today, late: true, userId: { in: pids } } }),
      db.leaveRequest.count({ where: { status: "APPROVED", fromDate: { lte: today }, toDate: { gte: today }, userId: { in: pids } } }),
      db.leaveRequest.count({ where: { status: "PENDING", ...othersFilter } }),
      db.wfhRequest.count({ where: { status: "PENDING", ...othersFilter } }),
      db.regularisation.count({ where: { status: "PENDING", ...othersFilter } }),
      db.trackSheet.count({ where: { status: "SUBMITTED", ...othersFilter } }),
    ]);
    if (me.role === "TL") {
      const scores = await Promise.all(pids.map((id) => scoreFor(id)));
      const valid = scores.map((x) => x.final).filter((x): x is number => x !== null);
      stats = [
        { label: "Team present", value: `${present}/${pids.length}`, sub: `${late} late today`, tone: "mint", href: "/team" },
        { label: "Approvals", value: String(pl + pw + pr), sub: "Leave, WFH & regularisation", tone: "rose", href: "/leave" },
        { label: "Sheets to review", value: String(sheets), sub: "Daily track sheets", tone: "lav", href: "/tracksheet" },
        { label: "Team score", value: valid.length ? String(Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)) : "—", sub: valid.length ? "Average this cycle" : "No goals set yet", tone: "sky", href: "/performance" },
      ];
    } else {
      const month = currentMonth();
      const [onboarding, run, exits] = await Promise.all([
        db.user.count({ where: { active: true, onboardingStep: { lt: 5 } } }),
        db.payrollRun.findUnique({ where: { month } }),
        db.resignation.count({ where: { withdrawnAt: null, step: { lt: 6 } } }),
      ]);
      stats = [
        { label: "Headcount", value: String(pids.length + 1), sub: `${onboarding} onboarding`, tone: "lemon", href: "/employees" },
        { label: "Present today", value: `${present}/${pids.length}`, sub: `${onLeave} on leave`, tone: "mint", href: "/team" },
        { label: `${monthLabel(month).split(" ")[0]} payroll`, value: run?.status === "PROCESSED" ? "Paid" : "Draft", sub: run?.status === "PROCESSED" ? "Payslips published" : "Ready to run", tone: "sky", href: "/payroll" },
        { label: "Open exits", value: String(exits), sub: "In workflow", tone: "peach", href: "/exit" },
      ];
    }
  }

  // Lists
  let listTitle = "My tasks";
  let list: { tag: string; title: string; sub: string; tone: Tone; href: string }[] = [];
  if (me.role === "EMPLOYEE") {
    const tasks = await db.task.findMany({ where: { assigneeId: me.id, status: { not: "DONE" } }, orderBy: { dueDate: "asc" }, take: 4 });
    const PRI: Record<string, Tone> = { HIGH: "rose", MEDIUM: "lemon", LOW: "mint" };
    list = tasks.map((t) => ({ tag: t.priority.slice(0, 3), title: t.title, sub: `Due ${fmtDate(t.dueDate)}`, tone: PRI[t.priority], href: "/tasks" }));
  } else {
    listTitle = "Needs your approval";
    const [l, w, r] = await Promise.all([
      db.leaveRequest.findMany({ where: { status: "PENDING", ...othersFilter }, include: { user: { select: { name: true } }, leaveType: true }, take: 4, orderBy: { createdAt: "asc" } }),
      db.wfhRequest.findMany({ where: { status: "PENDING", ...othersFilter }, include: { user: { select: { name: true } } }, take: 4, orderBy: { createdAt: "asc" } }),
      db.regularisation.findMany({ where: { status: "PENDING", ...othersFilter }, include: { user: { select: { name: true } } }, take: 4, orderBy: { createdAt: "asc" } }),
    ]);
    list = [
      ...l.map((x) => ({ tag: "LV", title: `${x.user.name} · ${x.leaveType.name} leave`, sub: `${x.days} day(s) from ${fmtDate(x.fromDate)}`, tone: "rose" as Tone, href: "/leave" })),
      ...w.map((x) => ({ tag: "WFH", title: `${x.user.name} · WFH`, sub: fmtDate(x.date), tone: "sky" as Tone, href: "/leave" })),
      ...r.map((x) => ({ tag: "REG", title: `${x.user.name} · ${x.type}`, sub: fmtDate(x.date), tone: "lemon" as Tone, href: "/attendance" })),
    ].slice(0, 4);
  }

  const trainings = await db.training.findMany({ where: { date: { gte: today } }, orderBy: { date: "asc" }, take: 3 });
  const activity = await db.auditLog.findMany({
    where: ids ? { actorId: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const h = minutesInTz() / 60;
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const maxH = Math.max(10, ...hours.map((x) => x.hours));
  const weekTotal = hours.reduce((a, b) => a + b.hours, 0);
  const TRAIN_TONES: Tone[] = ["sky", "lav", "mint", "peach", "lemon", "rose"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="fade-up" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ font: "700 32px/1.1 var(--font-display)", letterSpacing: "-.03em" }}>
            {greeting}, {firstName(me.name)}
          </div>
          <div style={{ font: "500 14px var(--font-sans)", color: "var(--text-2)", marginTop: 6 }}>
            {fmtDate(todayStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · Shift {shiftLabel(s)}
          </div>
        </div>
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "220px" }}>
        {stats.map((x, i) => (
          <StatCard key={x.label} {...x} delay={i * 70} />
        ))}
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "340px" }}>
        <PunchCard
          variant="dark"
          tz={TZ}
          dateLabel=""
          punchIn={att?.punchIn?.toISOString() ?? null}
          punchOut={att?.punchOut?.toISOString() ?? null}
          late={att?.late ?? false}
          early={att?.earlyLeave ?? false}
          wfh={att?.kind === "WFH"}
          shiftHours={s.shiftHours}
        />
        <Card title="Hours, last 7 working days" aside={<span className="mono">{weekTotal.toFixed(1)}h logged</span>} className="fade-up">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, paddingTop: 10, borderBottom: "1px dashed var(--input)" }}>
            {hours.map((w, i) => (
              <div key={w.ymd} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--text-2)" }}>{w.hours.toFixed(1)}</span>
                <div
                  className="grow"
                  title={`${fmtDate(w.ymd)}: ${w.hours.toFixed(1)}h`}
                  style={{ width: "100%", maxWidth: 34, height: `${Math.max(3, (w.hours / maxH) * 100)}%`, background: w.isToday && w.hours ? "#7c5cff" : w.kind === "WFH" ? "#9cc3ff" : w.late ? "#ffd96b" : w.hours ? "#8ee0b6" : "#ecebe7", borderRadius: "9px 9px 4px 4px", animationDelay: `${i * 60}ms` }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {hours.map((w) => (
              <span key={w.ymd} style={{ flex: 1, textAlign: "center", font: "600 11px var(--font-sans)", color: "var(--text-3)" }}>
                {w.isToday ? "Today" : fmtDate(w.ymd, { weekday: "short" })}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "300px" }}>
        <Card title={listTitle}>
          {list.length === 0 && <Empty>{me.role === "EMPLOYEE" ? "No open tasks." : "All clear. Nothing pending."}</Empty>}
          {list.map((x, i) => (
            <Link key={i} href={x.href} className="row" style={{ textDecoration: "none", color: "var(--ink)" }}>
              <span className="tag" style={{ background: TONES[x.tone].bg, color: TONES[x.tone].fg }}>{x.tag}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ font: "700 13px var(--font-sans)" }}>{x.title}</span>
                <span className="meta" style={{ fontSize: 11.5 }}>{x.sub}</span>
              </span>
            </Link>
          ))}
        </Card>
        <Card title="Upcoming trainings">
          {trainings.length === 0 && <Empty>No trainings scheduled.</Empty>}
          {trainings.map((t, i) => {
            const tone = TONES[TRAIN_TONES[i % 6]];
            return (
              <Link key={t.id} href="/trainings" style={{ display: "flex", alignItems: "center", gap: 12, background: tone.bg, borderRadius: 14, padding: "12px 14px", textDecoration: "none", color: "var(--ink)" }}>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", borderRadius: 10, padding: "5px 9px", flex: "none" }}>
                  <span style={{ font: "800 10px var(--font-sans)", color: tone.fg, textTransform: "uppercase" }}>{fmtDate(t.date, { month: "short" })}</span>
                  <span style={{ font: "700 17px/1 var(--font-display)" }}>{t.date.getUTCDate()}</span>
                </span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ font: "700 13px var(--font-sans)" }}>{t.title}</span>
                  <span style={{ font: "600 11.5px var(--font-sans)", color: tone.fg }}>{t.timeLabel} · {t.mode}</span>
                </span>
              </Link>
            );
          })}
        </Card>
        <Card title="Activity">
          {activity.length === 0 && <Empty>No activity yet.</Empty>}
          <div>
            {activity.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f2ef" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-3)", width: 44, flex: "none", paddingTop: 1 }}>
                  {a.createdAt.toISOString().slice(0, 10) === todayStr ? hmInTz(a.createdAt) : fmtDate(a.createdAt, { day: "numeric", month: "short" })}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: TONES[(a.tone as Tone) in TONES ? (a.tone as Tone) : "sky"].ac, marginTop: 5, flex: "none" }} />
                <span style={{ font: "600 12.5px/1.4 var(--font-sans)" }}>{a.action}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
