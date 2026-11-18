import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ONBOARDING } from "@/lib/constants";
import { fmtDate, fmtDateTime, inr, ymd } from "@/lib/time";
import { ROLE_NAME } from "@/lib/nav";
import { TONES } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { CredentialForm, ResetPasswordButton } from "@/components/client/Credentials";
import { Avatar, Badge, Card, Progress } from "@/components/ui";
import { advanceOnboarding, createEmployee, resetPassword, setActive, updateEmployee } from "@/app/actions/people";

export const metadata: Metadata = { title: "Employees" };

type Person = Awaited<ReturnType<typeof load>>["people"][number];
type Team = { id: string; name: string };

async function load() {
  const [people, teams] = await Promise.all([
    db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { team: { select: { name: true } } } }),
    db.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { people, teams };
}

function PersonFields({ p, teams }: { p?: Person; teams: Team[] }) {
  return (
    <>
      <label className="field">Full name<input name="name" required maxLength={120} defaultValue={p?.name} className="input" /></label>
      <label className="field">Work email<input name="email" type="email" required defaultValue={p?.email} placeholder="name@nextitpoint.com" className="input" /></label>
      <label className="field">
        Role
        <select name="role" defaultValue={p?.role ?? "EMPLOYEE"} className="input">
          <option value="EMPLOYEE">Employee</option>
          <option value="TL">Team Leader</option>
          <option value="HR">HR Admin</option>
        </select>
      </label>
      <label className="field">
        Team
        <select name="teamId" defaultValue={p?.teamId ?? ""} className="input">
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className="field">Designation<input name="title" maxLength={120} defaultValue={p?.title ?? ""} className="input" /></label>
      <label className="field">Department<input name="department" maxLength={120} defaultValue={p?.department ?? ""} className="input" /></label>
      <label className="field">Phone<input name="phone" type="tel" maxLength={30} defaultValue={p?.phone ?? ""} className="input" /></label>
      <label className="field">Joining date<input name="dateOfJoining" type="date" defaultValue={p?.dateOfJoining ? ymd(p.dateOfJoining) : ""} className="input" /></label>
      <label className="field">Annual CTC (₹)<input name="ctcAnnual" type="number" min={0} step={1000} defaultValue={p?.ctcAnnual ?? ""} placeholder="900000" className="input" /></label>
    </>
  );
}

export default async function EmployeesPage() {
  const me = await requireUser(["HR"]);
  const { people, teams } = await load();
  const active = people.filter((p) => p.active).length;

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section className="tone-card" style={{ background: TONES.lemon.bg }}>
        <h2 className="card-title">Add a person</h2>
        <p className="meta" style={{ margin: 0, color: TONES.lemon.fg }}>An initial password is generated and shown once. They set their own at first sign-in.</p>
        <CredentialForm action={createEmployee} className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", alignItems: "end" }}>
          <PersonFields teams={teams} />
          <button type="submit" className="btn btn-primary">Add &amp; create login</button>
        </CredentialForm>
      </section>

      <Card title={`Directory · ${active} active`} aside={`${people.length - active} inactive`}>
        {people.map((p) => (
          <details key={p.id} className="row" style={{ display: "block", opacity: p.active ? 1 : 0.65 }}>
            <summary style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", listStyle: "none", flexWrap: "wrap" }}>
              <Avatar name={p.name} size={36} />
              <span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "700 13.5px var(--font-sans)" }}>{p.name} <span className="mono meta">{p.empCode}</span></span>
                <span className="meta">{p.email} · {ROLE_NAME[p.role]}{p.team ? ` · ${p.team.name}` : ""}</span>
              </span>
              <span className="meta hide-sm" style={{ minWidth: 120 }}>
                {p.dateOfJoining ? `Joined ${fmtDate(p.dateOfJoining)}` : "Joining date not set"}
                <br />
                {p.ctcAnnual ? `CTC ${inr(p.ctcAnnual)}` : "CTC not set"}
              </span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {!p.active ? <Badge status="Inactive" /> : p.onboardingStep < 5 ? <Badge status="Onboarding" /> : <Badge status="Active" />}
                {p.mustChangePassword && p.active && <Badge label="Password not set" tone="lemon" />}
              </span>
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
              {p.onboardingStep < 5 && p.active && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="meta">Onboarding · {p.onboardingStep}/5 · next: {ONBOARDING[p.onboardingStep]}</span>
                    <Progress pct={(p.onboardingStep / 5) * 100} tone="lav" />
                  </div>
                  <ActionButton className="btn btn-primary btn-sm" action={advanceOnboarding.bind(null, p.id)}>{ONBOARDING[p.onboardingStep]} ✓</ActionButton>
                </div>
              )}
              <ActionForm action={updateEmployee.bind(null, p.id)} reset={false} className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", alignItems: "end" }}>
                <PersonFields p={p} teams={teams} />
                <button type="submit" className="btn btn-primary">Save changes</button>
              </ActionForm>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <ResetPasswordButton action={resetPassword.bind(null, p.id)} name={p.name} />
                {p.id !== me.id && (
                  <ActionButton
                    className={p.active ? "btn btn-reject btn-sm" : "btn btn-approve btn-sm"}
                    action={setActive.bind(null, p.id, !p.active)}
                    confirmText={p.active ? `Deactivate ${p.name}? They won't be able to sign in.` : undefined}
                  >
                    {p.active ? "Deactivate" : "Reactivate"}
                  </ActionButton>
                )}
                <span className="meta">Last sign-in: {p.lastLoginAt ? fmtDateTime(p.lastLoginAt) : "never"}{p.lockedUntil && p.lockedUntil > new Date() ? " · locked after failed attempts" : ""}</span>
              </div>
            </div>
          </details>
        ))}
      </Card>
    </div>
  );
}
