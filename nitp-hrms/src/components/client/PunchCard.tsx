"use client";
import { useEffect, useState, useTransition } from "react";
import { punch } from "@/app/actions/attendance";
import { useToast } from "./Toast";
import type { Tone } from "@/lib/tones";
import { TONES } from "@/lib/tones";

type Props = {
  punchIn: string | null; // ISO
  punchOut: string | null;
  late: boolean;
  early: boolean;
  wfh: boolean;
  shiftHours: number;
  tz: string;
  variant: "dark" | "hero";
  dateLabel: string;
  ip?: string | null;
  timezone?: string | null;
};

const fmt = (d: Date, tz: string, sec = true) =>
  d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: sec ? "2-digit" : undefined, hourCycle: "h23" });

export function PunchCard(p: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const inAt = p.punchIn ? new Date(p.punchIn) : null;
  const outAt = p.punchOut ? new Date(p.punchOut) : null;
  const ms = inAt ? ((outAt ?? now ?? inAt).getTime() - inAt.getTime()) : 0;
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor(ms / 60000) % 60;
  const ring = Math.min(360, (ms / (p.shiftHours * 3600000)) * 360);
  const clock = now ? fmt(now, p.tz) : "--:--:--";
  const label = !inAt ? "Punch In" : !outAt ? "Punch Out" : "Done";
  const color = !inAt ? "#22a06b" : !outAt ? "#f43f5e" : "#9a9aa3";
  const pills: { t: string; tone: Tone }[] = [];
  if (!inAt) pills.push({ t: "Not punched in", tone: "sky" });
  else pills.push(p.late ? { t: "Late arrival", tone: "lemon" } : { t: "On time", tone: "mint" });
  if (p.wfh) pills.push({ t: "WFH", tone: "sky" });
  if (outAt) pills.push(p.early ? { t: "Early leaving", tone: "rose" } : { t: "Shift complete", tone: "mint" });

  const doPunch = () =>
    start(async () => {
      const r = await punch(Intl.DateTimeFormat().resolvedOptions().timeZone);
      toast(r.message, (r.tone as Tone) ?? (r.ok ? "mint" : "rose"));
    });

  const Pills = () => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: p.variant === "hero" ? "center" : "flex-start" }}>
      {pills.map((x) => (
        <span key={x.t} className="badge" style={{ background: TONES[x.tone].bg, color: TONES[x.tone].fg }}>{x.t}</span>
      ))}
    </div>
  );

  if (p.variant === "dark") {
    return (
      <section className="fade-up" style={{ background: "#16161a", color: "#fff", borderRadius: 22, padding: 24, display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap", position: "relative", overflow: "hidden", animationDelay: "100ms" }}>
        <span style={{ position: "absolute", right: -60, bottom: -80, width: 240, height: 240, borderRadius: "50%", background: "#7c5cff", opacity: 0.25, filter: "blur(30px)" }} />
        <div style={{ width: 132, height: 132, borderRadius: "50%", background: `conic-gradient(#7c5cff ${ring}deg,#2b2b33 0)`, display: "grid", placeItems: "center", flex: "none" }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#16161a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span className="mono tnum" style={{ fontSize: 19 }}>{String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</span>
            <span style={{ font: "600 10.5px var(--font-sans)", color: "#9a9aa3" }}>of {p.shiftHours}h shift</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 170, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <span className="eyebrow" style={{ color: "#9a9aa3", fontWeight: 700 }}>Today&apos;s attendance</span>
          <span className="mono tnum" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-.02em" }} suppressHydrationWarning>{clock}</span>
          <Pills />
          <button type="button" onClick={doPunch} disabled={pending || !!outAt} className="btn" style={{ alignSelf: "flex-start", marginTop: 4, background: color, color: "#fff", padding: "11px 20px", fontSize: 13.5 }}>
            {pending ? "Saving…" : label}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background: "#efe9ff", borderRadius: 24, padding: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", minWidth: 0 }}>
      <span style={{ position: "absolute", left: -40, top: -40, width: 160, height: 160, borderRadius: "50%", border: "26px solid #7c5cff", opacity: 0.08 }} />
      <span className="eyebrow" style={{ color: "#5236b8" }}>{p.dateLabel}</span>
      <span className="mono tnum" style={{ fontSize: 46, lineHeight: 1, letterSpacing: "-.03em" }} suppressHydrationWarning>{clock}</span>
      <div style={{ position: "relative", width: 150, height: 150, display: "grid", placeItems: "center" }}>
        {!outAt && <span style={{ position: "absolute", inset: 14, borderRadius: "50%", background: color, animation: "ping 1.8s cubic-bezier(0,0,.2,1) infinite" }} />}
        <button
          type="button"
          onClick={doPunch}
          disabled={pending || !!outAt}
          style={{ position: "relative", width: 122, height: 122, borderRadius: "50%", border: "6px solid #fff", background: color, color: "#fff", cursor: outAt ? "default" : "pointer", font: "800 15px var(--font-sans)", boxShadow: "0 18px 30px -14px rgba(60,30,160,.5)" }}
        >
          {pending ? "…" : label}
        </button>
      </div>
      <Pills />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, width: "100%" }}>
        {[
          ["Punch in", inAt ? fmt(inAt, p.tz, false) : "—"],
          ["Punch out", outAt ? fmt(outAt, p.tz, false) : "—"],
          ["IP address", p.ip ?? "—"],
          ["Timezone", p.timezone ?? p.tz],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ font: "700 10px var(--font-sans)", color: "var(--text-3)", letterSpacing: ".06em", textTransform: "uppercase" }}>{k}</span>
            <span className="mono" style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
