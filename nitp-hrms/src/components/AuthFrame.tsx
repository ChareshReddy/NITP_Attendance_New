export function Logo({ size = 38 }: { size?: number }) {
  const pad = Math.round(size / 4.75);
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 3.2, background: "#16161a", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, padding: pad, flex: "none" }}>
      <span style={{ background: "#22a06b", borderRadius: 3 }} />
      <span style={{ background: "#3b82f6", borderRadius: 3 }} />
      <span style={{ background: "#f97316", borderRadius: 3 }} />
      <span style={{ background: "#7c5cff", borderRadius: 3 }} />
    </div>
  );
}

export function AuthFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px" }}>
      <div className="fade-up" style={{ width: "min(420px, 100%)", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ font: "700 17px/1.1 var(--font-display)", letterSpacing: "-.02em" }}>NITP People</span>
            <span className="meta" style={{ fontWeight: 600, fontSize: 11 }}>Attendance &amp; HRMS</span>
          </div>
        </div>
        <div className="card" style={{ padding: 28, gap: 18, borderRadius: 24 }}>
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="meta" style={{ fontSize: 13, margin: "6px 0 0" }}>{sub}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

export function FormError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div role="alert" style={{ background: "#ffe5eb", color: "#a61e45", borderRadius: 12, padding: "10px 12px", font: "600 12.5px var(--font-sans)" }}>
      {msg}
    </div>
  );
}
