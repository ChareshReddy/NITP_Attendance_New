import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, ymdInTz } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Avatar, Badge, Card, Empty } from "@/components/ui";
import { completeEnrollment, createTraining, enroll } from "@/app/actions/growth";

export const metadata: Metadata = { title: "Trainings" };

const TONE_CYCLE: Tone[] = ["sky", "lav", "mint", "peach", "lemon", "rose"];

export default async function TrainingsPage() {
  const me = await requireUser();
  const today = ymdInTz();
  const trainings = await db.training.findMany({
    orderBy: { date: "desc" },
    take: 60,
    include: { enrollments: { include: { user: { select: { name: true } } } } },
  });
  const upcoming = trainings.filter((t) => t.date.toISOString().slice(0, 10) >= today).reverse();
  const past = trainings.filter((t) => t.date.toISOString().slice(0, 10) < today);

  const TrainingCard = ({ t, i }: { t: (typeof trainings)[number]; i: number }) => {
    const tone = TONES[TONE_CYCLE[i % 6]];
    const mine = t.enrollments.find((e) => e.userId === me.id);
    const seatsLeft = t.seats - t.enrollments.length;
    const isPast = t.date.toISOString().slice(0, 10) < today;
    const status = mine?.status === "COMPLETED" ? "Completed" : mine ? "Enrolled" : isPast ? "Closed" : "Open";
    return (
      <article className="tone-card lift" style={{ background: tone.bg }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#fff", borderRadius: 12, padding: "6px 11px", flex: "none" }}>
            <span style={{ font: "800 10px var(--font-sans)", color: tone.fg, textTransform: "uppercase" }}>{fmtDate(t.date, { month: "short" })}</span>
            <span style={{ font: "700 20px/1 var(--font-display)" }}>{t.date.getUTCDate()}</span>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ font: "700 14px var(--font-sans)" }}>{t.title}</span>
            <span style={{ font: "600 11.5px var(--font-sans)", color: tone.fg }}>{t.timeLabel} · {t.mode} · {t.host}</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge status={status} tone={status === "Closed" ? "gray" : undefined} />
          <span className="mono" style={{ fontSize: 12, color: tone.fg }}>{isPast ? `${t.enrollments.length} attended` : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isPast && !mine && <ActionButton className="btn btn-primary btn-sm" action={enroll.bind(null, t.id, true)} disabled={seatsLeft < 1}>{seatsLeft < 1 ? "Full" : "Enroll"}</ActionButton>}
          {!isPast && mine?.status === "ENROLLED" && <ActionButton action={enroll.bind(null, t.id, false)}>Withdraw</ActionButton>}
          {mine?.status === "COMPLETED" && <a className="btn btn-ghost btn-sm" href={`/api/certificates/${mine.id}`} target="_blank" rel="noopener">View certificate</a>}
        </div>
        {me.role === "HR" && t.enrollments.length > 0 && (
          <details>
            <summary style={{ cursor: "pointer", font: "700 12px var(--font-sans)", color: tone.fg }}>Attendees ({t.enrollments.length})</summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {t.enrollments.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "6px 8px" }}>
                  <Avatar name={e.user.name} size={24} />
                  <span style={{ flex: 1, font: "600 12.5px var(--font-sans)" }}>{e.user.name}</span>
                  {e.status === "COMPLETED" ? <Badge status="Completed" /> : <ActionButton action={completeEnrollment.bind(null, e.id)}>Mark attended</ActionButton>}
                </div>
              ))}
            </div>
          </details>
        )}
      </article>
    );
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {me.role === "HR" && (
        <Card title="Schedule a training">
          <ActionForm action={createTraining} className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", alignItems: "end" }}>
            <label className="field span-2">Title<input name="title" required maxLength={160} className="input" /></label>
            <label className="field">Date<input name="date" type="date" required min={today} className="input" /></label>
            <label className="field">Time<input name="timeLabel" required placeholder="10:00–12:00" className="input" /></label>
            <label className="field">Mode<select name="mode" className="input"><option>Virtual</option><option>Hybrid</option><option>In-person</option></select></label>
            <label className="field">Host<input name="host" required defaultValue="People Ops" className="input" /></label>
            <label className="field">Seats<input name="seats" type="number" min={1} defaultValue={20} required className="input" /></label>
            <button type="submit" className="btn btn-primary">Publish</button>
          </ActionForm>
        </Card>
      )}
      <h2 className="card-title">Upcoming</h2>
      {upcoming.length === 0 && <Empty>No trainings scheduled.{me.role === "HR" ? " Add one above." : ""}</Empty>}
      <div className="grid-auto" style={{ ["--min" as string]: "270px", gap: 14 }}>
        {upcoming.map((t, i) => <TrainingCard key={t.id} t={t} i={i} />)}
      </div>
      {past.length > 0 && (
        <>
          <h2 className="card-title">Past</h2>
          <div className="grid-auto" style={{ ["--min" as string]: "270px", gap: 14 }}>
            {past.map((t, i) => <TrainingCard key={t.id} t={t} i={i + 3} />)}
          </div>
        </>
      )}
    </div>
  );
}
