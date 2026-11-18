import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canDecideFor, visibleUserIds } from "@/lib/scope";
import { BANDS, bandFor, currentCycle, cycleLabel, scoreFor } from "@/lib/perf";
import { fmtDate } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { GoalSlider } from "@/components/client/GoalSlider";
import { UserPicker } from "@/components/client/UserPicker";
import { Card, Empty } from "@/components/ui";
import { clearOverride, deleteGoal, overrideScore, saveGoal, submitAppraisal } from "@/app/actions/growth";

export const metadata: Metadata = { title: "Performance" };

const GOAL_TONES: Tone[] = ["sky", "lav", "mint", "peach", "lemon", "rose"];

function arc(a0: number, a1: number) {
  const R = 92, cx = 120, cy = 118;
  const p = (a: number) => [cx + R * Math.cos(Math.PI * (1 - a / 100)), cy - R * Math.sin(Math.PI * (1 - a / 100))];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const me = await requireUser();
  const ids = await visibleUserIds(me);
  const sp = await searchParams;
  const uid = sp.u && (!ids || ids.includes(sp.u)) ? sp.u : me.id;
  const subject = await db.user.findUniqueOrThrow({ where: { id: uid }, select: { id: true, name: true } });
  const people = me.role === "EMPLOYEE" ? [] : await db.user.findMany({ where: { active: true, ...(ids ? { id: { in: ids } } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const cycle = currentCycle();
  const sc = await scoreFor(uid, cycle);
  const reviews = await db.performanceReview.findMany({ where: { userId: uid }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 });
  const canEdit = uid === me.id || me.role === "HR" || (me.role === "TL" && (await canDecideFor(me, uid)));
  const canAppraise = uid !== me.id && (await canDecideFor(me, uid));
  const score = sc.final;
  const band = score === null ? null : bandFor(score);
  const remainingWeight = 100 - sc.totalWeight;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {people.length > 0 && <UserPicker people={people} current={uid} base="/performance" />}
      <div className="grid-auto" style={{ ["--min" as string]: "340px", alignItems: "start" }}>
        <Card title="Performance score" aside={`${subject.name} · ${cycleLabel(cycle)}`} style={{ alignItems: "center" }}>
          <svg viewBox="0 0 240 132" width="100%" style={{ maxWidth: 300 }} role="img" aria-label={score === null ? "No score yet" : `Score ${score} of 100`}>
            {BANDS.map((b, i) => (
              <path key={b.name} d={arc(b.from + (i ? 0.8 : 0), b.to - (i < 3 ? 0.8 : 0))} stroke={TONES[b.tone].ac} strokeWidth="18" fill="none" strokeLinecap="butt" />
            ))}
            <g style={{ transform: `rotate(${-90 + (score ?? 0) * 1.8}deg)`, transformOrigin: "120px 118px", transition: "transform 1s cubic-bezier(.3,1.4,.5,1)" }}>
              <line x1="120" y1="118" x2="120" y2="40" stroke="#16161a" strokeWidth="5" strokeLinecap="round" />
            </g>
            <circle cx="120" cy="118" r="10" fill="#16161a" />
            <circle cx="120" cy="118" r="4" fill="#fff" />
          </svg>
          <div className="tnum" style={{ font: "600 48px/1 var(--font-display)", letterSpacing: "-.03em" }}>{score ?? "—"}</div>
          {band ? (
            <span className="badge" style={{ background: TONES[band.tone].bg, color: TONES[band.tone].fg, fontSize: 12 }}>
              {band.name} band{sc.override ? " · HR override" : ""}
            </span>
          ) : (
            <span className="meta">Add goals to get a score.</span>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, width: "100%" }}>
            {BANDS.map((b) => (
              <div key={b.name} style={{ borderRadius: 10, padding: 8, background: TONES[b.tone].bg, border: `2px solid ${band?.name === b.name ? TONES[b.tone].ac : "transparent"}`, textAlign: "center" }}>
                <div style={{ font: "700 12px var(--font-sans)", color: TONES[b.tone].fg }}>{b.name}</div>
                <div className="mono" style={{ fontSize: 10.5, color: TONES[b.tone].fg }}>{b.from}–{b.to}</div>
              </div>
            ))}
          </div>
          {sc.override && <p className="meta" style={{ margin: 0 }}>Weighted goal score {sc.self ?? "—"}. HR override: {sc.override.comment}</p>}
        </Card>

        <Card title="Reviews" aside={`${reviews.length} this year`}>
          {reviews.length === 0 && <Empty>No appraisals or overrides yet.</Empty>}
          {reviews.map((r) => (
            <div key={r.id} className="row" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <span style={{ font: "700 13px var(--font-sans)" }}>
                {r.kind === "OVERRIDE" ? `HR override → ${r.score}` : r.rating} <span className="meta">· {r.author.name} · {fmtDate(r.createdAt)} · {cycleLabel(r.cycle)}</span>
              </span>
              <span style={{ font: "500 12.5px/1.5 var(--font-sans)" }}>{r.comment}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card title="KPI goals" aside={`Weights ${sc.totalWeight}% of 100%`}>
        {sc.goals.length === 0 && <Empty>No goals for {cycleLabel(cycle)} yet.</Empty>}
        {sc.goals.map((g, i) => {
          const t = TONES[GOAL_TONES[i % GOAL_TONES.length]];
          return (
            <div key={g.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,2fr) auto", gap: 16, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: t.bg }} className="goal-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ font: "700 13px var(--font-sans)" }}>{g.title}</span>
                <span style={{ font: "600 11.5px var(--font-sans)", color: t.fg }}>{g.kpi} · weight {g.weight}%</span>
              </div>
              <GoalSlider id={g.id} value={g.progress} color={t.ac} label={`Progress for ${g.title}`} disabled={!canEdit} />
              {canEdit ? <ActionButton action={deleteGoal.bind(null, g.id)} confirmText={`Remove “${g.title}”?`} label={`Remove ${g.title}`}>✕</ActionButton> : <span />}
            </div>
          );
        })}
        {canEdit && remainingWeight > 0 && (
          <ActionForm action={saveGoal.bind(null, uid)} className="form-grid goal-form">
            <label className="field">Goal<input name="title" required maxLength={160} placeholder="e.g. Ship attendance v2" className="input" /></label>
            <label className="field">Measure<input name="kpi" required maxLength={160} placeholder="e.g. Release by 15 Dec" className="input" /></label>
            <label className="field">Weight %<input name="weight" type="number" min={5} max={remainingWeight} defaultValue={Math.min(20, remainingWeight)} required className="input" /></label>
            <button type="submit" className="btn btn-primary">Add goal</button>
          </ActionForm>
        )}
      </Card>

      <div className="grid-auto" style={{ ["--min" as string]: "340px" }}>
        {canAppraise && (
          <section className="tone-card" style={{ background: TONES.sky.bg }}>
            <h2 className="card-title">Manager appraisal · {subject.name}</h2>
            <ActionForm action={submitAppraisal.bind(null, uid)} className="form-grid">
              <label className="field full" style={{ color: TONES.sky.fg }}>
                Rating
                <select name="rating" className="input"><option>Exceeds expectations</option><option>Meets expectations</option><option>Needs improvement</option></select>
              </label>
              <label className="field full" style={{ color: TONES.sky.fg }}>Comment<textarea name="comment" required rows={3} maxLength={1000} placeholder="Strengths and areas to grow" className="input" /></label>
              <button type="submit" className="btn btn-primary full">Submit appraisal</button>
            </ActionForm>
          </section>
        )}
        {me.role === "HR" && (
          <section className="tone-card" style={{ background: TONES.rose.bg }}>
            <h2 className="card-title">HR override · {subject.name}</h2>
            <p className="meta" style={{ margin: 0, color: TONES.rose.fg }}>Replaces the weighted score for {cycleLabel(cycle)}. Recorded in the audit log.</p>
            <ActionForm action={overrideScore.bind(null, uid)} className="form-grid">
              <label className="field" style={{ color: TONES.rose.fg }}>Score (0–100)<input name="score" type="number" min={0} max={100} required className="input" /></label>
              <label className="field" style={{ color: TONES.rose.fg }}>Reason<input name="reason" required maxLength={300} placeholder="Calibration outcome" className="input" /></label>
              <button type="submit" className="btn btn-primary">Apply override</button>
              {sc.override && <ActionButton className="btn btn-ghost" action={clearOverride.bind(null, uid)}>Clear override</ActionButton>}
            </ActionForm>
          </section>
        )}
      </div>
    </div>
  );
}
