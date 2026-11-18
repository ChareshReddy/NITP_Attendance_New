import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computePayroll } from "@/lib/payroll-run";
import { buildPayslip } from "@/lib/payroll";
import { PAYROLL_STEPS } from "@/lib/constants";
import { currentMonth, inr, monthLabel, monthRange } from "@/lib/time";
import { TONES } from "@/lib/tones";
import { ActionButton } from "@/components/client/ActionForm";
import { Badge, Card, Empty } from "@/components/ui";
import { runPayroll } from "@/app/actions/growth";

export const metadata: Metadata = { title: "Payroll" };

type Lines = { earnings: { label: string; amount: number }[]; deductions: { label: string; amount: number }[] };

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const [y, m] = currentMonth().split("-").map(Number);
  for (let i = 0; i < n; i++) out.push(new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
  return out;
}

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await requireUser();
  const months = lastMonths(6);
  const sp = await searchParams;
  const month = months.includes(sp.m ?? "") ? sp.m! : months[0];
  const [runs, user] = await Promise.all([
    db.payrollRun.findMany({ where: { month: { in: months } } }),
    db.user.findUnique({ where: { id: me.id }, select: { ctcAnnual: true, name: true, empCode: true, title: true } }),
  ]);
  const run = runs.find((r) => r.month === month);
  const processed = run?.status === "PROCESSED";
  const mySlip = run ? await db.payslip.findUnique({ where: { runId_userId: { runId: run.id, userId: me.id } } }) : null;
  const daysInMonth = monthRange(month).end.getUTCDate();
  const preview = !mySlip && user?.ctcAnnual ? buildPayslip(user.ctcAnnual, daysInMonth, 0) : null;
  const lines: Lines | null = mySlip ? (mySlip.lines as Lines) : preview ? { earnings: preview.earnings, deductions: preview.deductions } : null;
  const gross = mySlip?.gross ?? preview?.gross ?? 0;
  const ded = mySlip?.deductions ?? preview?.totalDeductions ?? 0;
  const net = mySlip?.net ?? preview?.net ?? 0;

  const myHistory = await db.payslip.findMany({ where: { userId: me.id, run: { month: { in: months } } }, include: { run: true } });
  const trend = [...months].reverse().map((m) => ({ m, net: myHistory.find((h) => h.run.month === m)?.net ?? 0 }));
  const maxNet = Math.max(1, ...trend.map((t) => t.net));

  const hr = me.role === "HR" ? await computePayroll(month) : null;
  const register = hr && processed ? await db.payslip.findMany({ where: { runId: run!.id }, include: { user: { select: { name: true, empCode: true } } }, orderBy: { user: { name: "asc" } } }) : null;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {hr && (
        <section style={{ background: "#16161a", color: "#fff", borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow" style={{ color: "#9a9aa3", fontWeight: 700 }}>Payroll run · {monthLabel(month)}</div>
              <div style={{ font: "600 22px var(--font-display)", marginTop: 4 }}>
                {processed ? `Processed · ${register?.length ?? 0} payslips · ${inr(register?.reduce((a, r) => a + r.net, 0) ?? 0)} net` : `${hr.rows.length} people ready · ${inr(hr.rows.reduce((a, r) => a + r.slip.net, 0))} estimated net`}
              </div>
              <div style={{ font: "500 12.5px var(--font-sans)", color: "#9a9aa3", marginTop: 4 }}>
                LOP comes from approved leave beyond quota and mid-month joining.{hr.missingCtc ? ` ${hr.missingCtc} active people have no CTC set and are skipped.` : ""}
              </div>
            </div>
            {processed ? (
              <span style={{ display: "flex", gap: 8 }}>
                <span className="btn" style={{ background: "#8ee0b6", color: "#0c6b44" }}>✓ Completed</span>
                <a className="btn" style={{ background: "#fff", color: "#16161a" }} href={`/api/payroll/${month}/csv`}>Export register</a>
              </span>
            ) : (
              <ActionButton className="btn" style={{ background: "#fff", color: "#16161a" }} action={runPayroll.bind(null, month)} confirmText={`Process payroll for ${monthLabel(month)}? Payslips will be published to everyone.`}>
                Run payroll
              </ActionButton>
            )}
          </div>
          <ol style={{ display: "grid", gridTemplateColumns: `repeat(${PAYROLL_STEPS.length},1fr)`, gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
            {PAYROLL_STEPS.map((s) => (
              <li key={s} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ height: 6, borderRadius: 6, background: processed ? "#22a06b" : "#33333b" }} />
                <span style={{ font: "700 11px var(--font-sans)", color: processed ? "#8ee0b6" : "#77777f" }}>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <nav className="segmented" aria-label="Month" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
        {months.map((m) => (
          <Link key={m} href={`/payroll?m=${m}`} aria-current={m === month ? "page" : undefined}>
            {monthLabel(m)}
          </Link>
        ))}
      </nav>

      <div className="grid-auto" style={{ ["--min" as string]: "360px", alignItems: "start" }}>
        <section className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          <div style={{ background: TONES.mint.bg, padding: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="eyebrow" style={{ color: TONES.mint.fg }}>Net pay · {monthLabel(month)}</div>
              <div className="tnum" style={{ font: "600 38px/1.1 var(--font-display)", letterSpacing: "-.03em", marginTop: 6 }}>{lines ? inr(net) : "—"}</div>
              <div className="meta" style={{ color: TONES.mint.fg, marginTop: 4 }}>
                {user?.name} · {user?.empCode}{mySlip ? ` · ${mySlip.paidDays} paid days` : ""}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <Badge status={processed && mySlip ? "Paid" : "Draft"} />
              {mySlip && <a className="btn btn-primary btn-sm" href={`/api/payslips/${mySlip.id}`} target="_blank" rel="noopener">Open payslip</a>}
            </div>
          </div>
          {!lines ? (
            <div style={{ padding: 22 }}><Empty>No salary on file yet. HR adds your CTC on the Employees page.</Empty></div>
          ) : (
            <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(220px,100%),1fr))", gap: 22, position: "relative" }}>
              {!mySlip && <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", font: "800 64px var(--font-display)", color: "rgba(22,22,26,.05)", transform: "rotate(-12deg)", pointerEvents: "none" }}>DRAFT</span>}
              {(["earnings", "deductions"] as const).map((k) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="eyebrow" style={{ color: k === "earnings" ? TONES.mint.fg : TONES.rose.fg }}>{k === "earnings" ? "Earnings" : "Deductions"}</span>
                  {lines[k].map((l) => (
                    <div key={l.label} style={{ display: "flex", justifyContent: "space-between", gap: 10, font: "600 13px var(--font-sans)" }}>
                      <span>{l.label}</span>
                      <span className="mono tnum">{k === "deductions" && l.amount ? "−" : ""}{inr(l.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--input)", paddingTop: 8, font: "800 13px var(--font-sans)" }}>
                    <span>{k === "earnings" ? "Gross" : "Total deductions"}</span>
                    <span className="mono tnum">{inr(k === "earnings" ? gross : ded)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!mySlip && lines && <p className="meta" style={{ padding: "0 22px 18px", margin: 0 }}>Estimate before payroll runs. Loss of pay is added when HR processes the month.</p>}
        </section>

        <Card title="Net pay, last 6 months">
          {myHistory.length === 0 ? (
            <Empty>Your net pay shows here once payroll has run.</Empty>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 170, borderBottom: "1px dashed var(--input)" }}>
              {trend.map((t, i) => (
                <div key={t.m} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--text-2)" }}>{t.net ? `${(t.net / 1000).toFixed(1)}k` : "—"}</span>
                  <div className="grow" style={{ width: "100%", maxWidth: 38, height: `${Math.max(2, (t.net / maxNet) * 85)}%`, background: t.m === month ? "#22a06b" : "#bfe9d3", borderRadius: "9px 9px 4px 4px", animationDelay: `${i * 70}ms` }} />
                  <span style={{ font: "600 11px var(--font-sans)", color: "var(--text-3)" }}>{monthLabel(t.m).split(" ")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {hr && (
        <Card title={`Payroll register · ${monthLabel(month)}`} aside={processed ? "Processed" : "Preview"}>
          <div className="scroll-x">
            <div className="table-head" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr .6fr 1fr" }}>
              <span>Employee</span><span>Gross</span><span>Deductions</span><span>Net</span><span>LOP</span><span>Status</span>
            </div>
            {(register
              ? register.map((r) => ({ k: r.id, name: r.user.name, code: r.user.empCode, gross: r.gross, ded: r.deductions, net: r.net, lop: r.lopDays }))
              : hr.rows.map((r) => ({ k: r.user.id, name: r.user.name, code: r.user.empCode, gross: r.slip.gross, ded: r.slip.totalDeductions, net: r.slip.net, lop: r.slip.lopDays }))
            ).map((r) => (
              <div key={r.k} className="table-row" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr .6fr 1fr" }}>
                <span>{r.name} <span className="meta mono">{r.code}</span></span>
                <span className="mono tnum">{inr(r.gross)}</span>
                <span className="mono tnum">{inr(r.ded)}</span>
                <span className="mono tnum">{inr(r.net)}</span>
                <span className="mono tnum">{r.lop}</span>
                <span><Badge status={processed ? "Paid" : "Draft"} /></span>
              </div>
            ))}
            {!hr.rows.length && !register?.length && <Empty>No one has a CTC yet. Add it on the Employees page.</Empty>}
          </div>
        </Card>
      )}
    </div>
  );
}
