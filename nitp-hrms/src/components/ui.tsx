import Link from "next/link";
import { TONES, statusTone, avatarBg, initials, type Tone } from "@/lib/tones";

export function Badge({ status, label, tone }: { status?: string; label?: string; tone?: Tone }) {
  const t = TONES[tone ?? statusTone(status ?? "")];
  return (
    <span className="badge" style={{ background: t.bg, color: t.fg }}>
      {label ?? status}
    </span>
  );
}

export function Avatar({ name, size = 36, dot }: { name: string; size?: number; dot?: string }) {
  return (
    <span style={{ position: "relative", flex: "none", display: "inline-block" }}>
      <span className="avatar" style={{ width: size, height: size, background: avatarBg(name), fontSize: size < 34 ? 11 : 12.5 }} aria-hidden="true">
        {initials(name)}
      </span>
      {dot && <span style={{ position: "absolute", right: -1, bottom: -1, width: 13, height: 13, borderRadius: "50%", background: dot, border: "2.5px solid #fff" }} />}
    </span>
  );
}

export function StatCard({ tone, label, value, sub, href, delay = 0 }: { tone: Tone; label: string; value: string; sub: string; href: string; delay?: number }) {
  const t = TONES[tone];
  return (
    <Link href={href} className="tone-card lift fade-up" style={{ background: t.bg, minHeight: 146, textDecoration: "none", color: "var(--ink)", animationDelay: `${delay}ms` }}>
      <span className="ring-motif" style={{ color: t.ac }} />
      <span className="eyebrow" style={{ color: t.fg }}>{label}</span>
      <span style={{ font: "600 36px/1 var(--font-display)", letterSpacing: "-.03em" }} className="tnum">{value}</span>
      <span style={{ font: "600 12.5px var(--font-sans)", color: t.fg, marginTop: "auto" }}>{sub} →</span>
    </Link>
  );
}

export function Card({ title, aside, children, style, className = "" }: { title?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || aside) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          {title && <h2 className="card-title">{title}</h2>}
          {aside && <span className="meta" style={{ fontWeight: 600 }}>{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function ToneCard({ tone, children, style }: { tone: Tone; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section className="tone-card" style={{ background: TONES[tone].bg, ...style }}>
      {children}
    </section>
  );
}

export function Progress({ pct, tone = "lav", height = 8 }: { pct: number; tone?: Tone; height?: number }) {
  return (
    <div className="bar-track" style={{ height }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: TONES[tone].ac }} />
    </div>
  );
}

export function Ring({ pct, color, size = 64, track = "rgba(255,255,255,.8)", children }: { pct: number; color: string; size?: number; track?: string; children?: React.ReactNode }) {
  const deg = Math.max(0, Math.min(100, pct)) * 3.6;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `conic-gradient(${color} ${deg}deg, ${track} 0)`, display: "grid", placeItems: "center", flex: "none" }}>
      <div style={{ width: size - 14, height: size - 14, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", font: "700 13px var(--font-display)" }}>{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Steps({ steps, current, tone = "peach" }: { steps: string[]; current: number; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <ol style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
      {steps.map((s, i) => (
        <li key={s} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ height: 6, borderRadius: 6, background: i < current ? t.ac : i === current ? `linear-gradient(90deg, ${t.ac} 40%, ${t.bg} 40%)` : "#ecebe7" }} />
          <span style={{ font: "700 10.5px var(--font-sans)", color: i <= current ? t.fg : "#9a9aa3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PageIntro({ children }: { children: React.ReactNode }) {
  return <p className="meta" style={{ fontSize: 13, margin: "-6px 0 0" }}>{children}</p>;
}
