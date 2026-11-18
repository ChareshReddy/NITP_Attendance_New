"use client";
import { useState } from "react";
import { ActionForm } from "./ActionForm";
import { applyLeave } from "@/app/actions/leave";

function workingDays(from: string, to: string, holidays: Set<string>) {
  let n = 0;
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !holidays.has(d.toISOString().slice(0, 10))) n++;
  }
  return n;
}

export function LeaveForm({ balances, holidays, monthlyGross, today }: { balances: { id: string; name: string; remaining: number }[]; holidays: string[]; monthlyGross: number | null; today: string }) {
  const [v, setV] = useState<{ type?: string; from?: string; to?: string }>({});
  const hs = new Set(holidays);
  const b = balances.find((x) => x.id === (v.type ?? balances[0]?.id));
  let text = "Pick dates to see working days and any loss of pay.";
  let bg = "#f3f2ef";
  let fg = "#55555e";
  if (v.from && v.to && v.to >= v.from && b) {
    const d = workingDays(v.from, v.to, hs);
    const lop = Math.max(0, d - b.remaining);
    text = `${d} working day${d === 1 ? "" : "s"} · ${b.remaining} ${b.name} left` + (lop ? ` · ${lop} day(s) loss of pay${monthlyGross ? ` (about −₹${Math.round((monthlyGross / 30) * lop).toLocaleString("en-IN")})` : ""}` : " · No loss of pay");
    bg = lop ? "#ffe5eb" : "#e3f6ec";
    fg = lop ? "#a61e45" : "#0c6b44";
  } else if (v.from && v.to && v.to < v.from) {
    text = "The end date must be on or after the start date.";
    bg = "#ffe5eb";
    fg = "#a61e45";
  }
  if (!balances.length) return <p className="empty">HR hasn&apos;t set up leave types yet.</p>;
  return (
    <ActionForm
      action={applyLeave}
      className="form-grid"
      onChange={(fd) => setV({ type: String(fd.get("leaveTypeId") ?? ""), from: String(fd.get("from") ?? ""), to: String(fd.get("to") ?? "") })}
      onResult={(r) => r.ok && setV({})}
    >
      <label className="field full">
        Leave type
        <select name="leaveTypeId" className="input">
          {balances.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.remaining} left)</option>)}
        </select>
      </label>
      <label className="field">From<input name="from" type="date" required min={today} className="input" /></label>
      <label className="field">To<input name="to" type="date" required min={v.from || today} className="input" /></label>
      <div className="full" role="status" style={{ background: bg, color: fg, borderRadius: 12, padding: "10px 12px", font: "600 12.5px var(--font-sans)" }}>{text}</div>
      <label className="field full">Reason<input name="reason" required maxLength={300} placeholder="Brief reason" className="input" /></label>
      <button type="submit" className="btn btn-primary full">Apply for leave</button>
    </ActionForm>
  );
}
