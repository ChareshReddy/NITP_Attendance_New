import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDecideFor, visibleUserIds } from "@/lib/scope";
import { EXIT_STEPS, NOTICE_DAYS } from "@/lib/constants";
import { addDays, dateOnly, fmtDate, ymd, ymdInTz } from "@/lib/time";
import { TONES } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Avatar, Card, Empty, Progress, Steps } from "@/components/ui";
import { advanceExit, submitResignation, withdrawResignation } from "@/app/actions/growth";

export const metadata: Metadata = { title: "Exit" };

export default async function ExitPage() {
  const me = await requireUser();
  const ids = await visibleUserIds(me);
  const mine = await db.resignation.findFirst({ where: { userId: me.id, withdrawnAt: null }, orderBy: { submittedAt: "desc" } });
  const others =
    me.role === "EMPLOYEE"
      ? []
      : await db.resignation.findMany({
          where: { withdrawnAt: null, userId: ids ? { in: ids.filter((x) => x !== me.id) } : { not: me.id } },
          include: { user: { select: { name: true, title: true } } },
          orderBy: { submittedAt: "desc" },
        });
  const defaultLwd = ymd(addDays(dateOnly(ymdInTz()), NOTICE_DAYS));
  const decide = new Map<string, boolean>();
  for (const r of others) decide.set(r.userId, await canDecideFor(me, r.userId));

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {mine && mine.step < 6 ? (
        <Card title="Your resignation" aside={`Submitted ${fmtDate(mine.submittedAt)}`}>
          <Steps steps={EXIT_STEPS} current={mine.step} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", font: "600 13px var(--font-sans)" }}>
            <span>Last working day <span className="mono">{fmtDate(mine.lastWorkingDay)}</span></span>
            <span>Reason: {mine.reason}</span>
            <span>Now: {EXIT_STEPS[mine.step]}</span>
          </div>
          {mine.step < 2 ? (
            <ActionButton className="btn btn-ghost" style={{ alignSelf: "flex-start" }} action={withdrawResignation.bind(null, mine.id)} confirmText="Withdraw your resignation?">
              Withdraw resignation
            </ActionButton>
          ) : (
            <p className="meta" style={{ margin: 0 }}>HR clearance has started. Talk to HR if you want to withdraw.</p>
          )}
        </Card>
      ) : (
        <div className="grid-auto" style={{ ["--min" as string]: "320px", alignItems: "start" }}>
          <Card title="Submit resignation">
            {mine && <p className="meta" style={{ margin: 0 }}>Your previous exit was completed on the workflow.</p>}
            <ActionForm action={submitResignation} className="form-grid" confirmText="Submit your resignation to your TL and HR?">
              <label className="field full">
                Primary reason
                <select name="reason" className="input">
                  <option>Career growth</option><option>Higher studies</option><option>Relocation</option><option>Compensation</option><option>Personal reasons</option><option>Other</option>
                </select>
              </label>
              <label className="field full">Last working day<input name="lastWorkingDay" type="date" defaultValue={defaultLwd} min={ymdInTz()} className="input" /></label>
              <label className="field full">Comments<textarea name="comments" rows={3} maxLength={1000} placeholder="Optional note for your TL and HR" className="input" /></label>
              <button type="submit" className="btn btn-primary full">Submit resignation</button>
            </ActionForm>
          </Card>
          <section className="tone-card" style={{ background: TONES.peach.bg }}>
            <h2 className="card-title">How exit works</h2>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, font: "600 13px/1.5 var(--font-sans)", color: TONES.peach.fg }}>
              <li>Your TL reviews and approves the resignation.</li>
              <li>HR confirms your notice period ({NOTICE_DAYS} days by default) and last working day.</li>
              <li>You hand over your laptop, ID card and access.</li>
              <li>Full &amp; final settlement is processed with the next payroll.</li>
              <li>A short exit interview closes the process.</li>
            </ol>
            <p className="meta" style={{ margin: 0, color: TONES.peach.fg }}>You can withdraw until HR clearance starts.</p>
          </section>
        </div>
      )}

      {me.role !== "EMPLOYEE" && (
        <Card title="Exit requests" aside={`${others.filter((x) => x.step < 6).length} in progress`}>
          {others.length === 0 && <Empty>No exits in progress.</Empty>}
          {others.map((x) => {
            const canAdv = x.step < 6 && decide.get(x.userId) && !(me.role === "TL" && x.step >= 2);
            return (
              <div key={x.id} className="row" style={{ flexWrap: "wrap" }}>
                <Avatar name={x.user.name} />
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ font: "700 13px var(--font-sans)" }}>{x.user.name} <span className="meta">· {x.reason} · last day {fmtDate(x.lastWorkingDay)}</span></span>
                  <Progress pct={(x.step / 6) * 100} tone="peach" height={6} />
                  <span className="meta">{x.step >= 6 ? "Exit complete" : `Now: ${EXIT_STEPS[x.step]}`}</span>
                </div>
                {canAdv && (
                  <ActionButton className="btn btn-primary btn-sm" action={advanceExit.bind(null, x.id)}>
                    {EXIT_STEPS[x.step]} done →
                  </ActionButton>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
