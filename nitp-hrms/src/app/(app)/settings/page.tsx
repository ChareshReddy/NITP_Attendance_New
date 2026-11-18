import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtDate, ymdInTz } from "@/lib/time";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Card, Empty } from "@/components/ui";
import { addHoliday, removeHoliday, saveLeaveType, saveSettings, saveTeam } from "@/app/actions/people";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireUser(["HR"]);
  const year = ymdInTz().slice(0, 4);
  const [s, types, holidays, teams, tls] = await Promise.all([
    getSettings(),
    db.leaveType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.holiday.findMany({ where: { date: { gte: new Date(`${year}-01-01T00:00:00Z`) } }, orderBy: { date: "asc" } }),
    db.team.findMany({ orderBy: { name: "asc" }, include: { lead: { select: { name: true } }, _count: { select: { members: true } } } }),
    db.user.findMany({ where: { role: "TL", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const row = { gridTemplateColumns: "repeat(auto-fit,minmax(min(150px,100%),1fr))", alignItems: "end" } as const;

  return (
    <div className="fade-up grid-auto" style={{ ["--min" as string]: "360px", alignItems: "start" }}>
      <Card title="Shift policy">
        <ActionForm action={saveSettings} reset={false} className="form-grid" style={row}>
          <label className="field">Company name<input name="companyName" defaultValue={s.companyName} required className="input" /></label>
          <label className="field">Shift starts<input name="shiftStart" type="time" defaultValue={s.shiftStart} required className="input" /></label>
          <label className="field">Shift length (hours)<input name="shiftHours" type="number" min={1} max={14} step={0.5} defaultValue={s.shiftHours} required className="input" /></label>
          <label className="field">Grace for late mark (min)<input name="graceMins" type="number" min={0} max={120} defaultValue={s.graceMins} required className="input" /></label>
          <button type="submit" className="btn btn-primary">Save policy</button>
        </ActionForm>
        <p className="meta" style={{ margin: 0 }}>Late after shift start + grace. Early leaving before shift start + shift length.</p>
      </Card>

      <Card title="Leave types" aside="Days per calendar year">
        {types.map((t) => (
          <ActionForm key={t.id} action={saveLeaveType} reset={false} className="form-grid" style={{ gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}>
            <input type="hidden" name="id" value={t.id} />
            <label className="field">Name<input name="name" defaultValue={t.name} required className="input" /></label>
            <label className="field">Days<input name="annualQuota" type="number" min={0} max={365} defaultValue={t.annualQuota} required className="input" /></label>
            <button type="submit" className="btn btn-ghost">Save</button>
          </ActionForm>
        ))}
        <ActionForm action={saveLeaveType} className="form-grid" style={{ gridTemplateColumns: "2fr 1fr auto", alignItems: "end" }}>
          <label className="field">New type<input name="name" required placeholder="e.g. Comp-off" className="input" /></label>
          <label className="field">Days<input name="annualQuota" type="number" min={0} max={365} required className="input" /></label>
          <button type="submit" className="btn btn-primary">Add</button>
        </ActionForm>
      </Card>

      <Card title={`Holidays ${year}`} aside="Skipped when counting leave days">
        {holidays.length === 0 && <Empty>No holidays added for {year}.</Empty>}
        {holidays.map((h) => (
          <div key={h.id} className="row" style={{ justifyContent: "space-between" }}>
            <span style={{ font: "600 13px var(--font-sans)" }}><span className="mono">{fmtDate(h.date, { day: "numeric", month: "short", weekday: "short" })}</span> · {h.name}</span>
            <ActionButton action={removeHoliday.bind(null, h.id)} confirmText={`Remove ${h.name}?`} label={`Remove ${h.name}`}>Remove</ActionButton>
          </div>
        ))}
        <ActionForm action={addHoliday} className="form-grid" style={{ gridTemplateColumns: "1fr 2fr auto", alignItems: "end" }}>
          <label className="field">Date<input name="date" type="date" required className="input" /></label>
          <label className="field">Name<input name="name" required placeholder="e.g. Diwali" className="input" /></label>
          <button type="submit" className="btn btn-primary">Add</button>
        </ActionForm>
      </Card>

      <Card title="Teams" aside="TLs approve requests for their team">
        {teams.map((t) => (
          <ActionForm key={t.id} action={saveTeam} reset={false} className="form-grid" style={{ gridTemplateColumns: "1.4fr 1.4fr auto", alignItems: "end" }}>
            <input type="hidden" name="id" value={t.id} />
            <label className="field">Team · {t._count.members} people<input name="name" defaultValue={t.name} required className="input" /></label>
            <label className="field">
              Team leader
              <select name="leadId" defaultValue={t.leadId ?? ""} className="input">
                <option value="">None (HR approves)</option>
                {tls.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-ghost">Save</button>
          </ActionForm>
        ))}
        <ActionForm action={saveTeam} className="form-grid" style={{ gridTemplateColumns: "1.4fr 1.4fr auto", alignItems: "end" }}>
          <label className="field">New team<input name="name" required className="input" /></label>
          <label className="field">
            Team leader
            <select name="leadId" defaultValue="" className="input">
              <option value="">None</option>
              {tls.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <button type="submit" className="btn btn-primary">Add team</button>
        </ActionForm>
      </Card>
    </div>
  );
}
