"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { initials } from "@/lib/tones";

type Nav = { href: string; label: string; section: string };
type Notif = { id: string; text: string; who: string; when: string; color: string };

export function Topbar({ nav, me, notifs, pending }: { nav: Nav[]; me: { name: string; role: string; code: string }; notifs: Notif[]; pending: number }) {
  const path = usePathname();
  const router = useRouter();
  const cur = nav.find((n) => path === n.href || path.startsWith(n.href + "/"));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<null | "notif" | "me">(null);
  const wrap = useRef<HTMLDivElement>(null);
  const results = q.trim() ? nav.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())) : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => setOpen(null), [path]);

  return (
    <header className="topbar" ref={wrap}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ font: "700 11px var(--font-sans)", color: "var(--text-3)", letterSpacing: ".06em", textTransform: "uppercase" }}>{cur?.section ?? "Account"}</div>
        <h1 className="page-title" style={{ marginTop: 3 }}>{cur?.label ?? "Account"}</h1>
      </div>
      <div style={{ position: "relative", width: 260, maxWidth: "100%" }} className="hide-sm">
        <input
          type="search"
          className="input"
          aria-label="Jump to a page"
          placeholder="Jump to a page…"
          value={q}
          autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              router.push(results[0].href);
              setQ("");
            }
            if (e.key === "Escape") setQ("");
          }}
          style={{ borderRadius: 12, padding: "10px 14px" }}
        />
        {q.trim() && (
          <div className="popover" style={{ top: "calc(100% + 6px)", left: 0, right: 0 }}>
            {results.length ? (
              results.map((r) => (
                <Link key={r.href} href={r.href} onClick={() => setQ("")} style={{ display: "flex", justifyContent: "space-between", padding: "9px 10px", borderRadius: 9, color: "var(--ink)", font: "600 13px var(--font-sans)", textDecoration: "none" }}>
                  {r.label}
                  <span className="meta">{r.section}</span>
                </Link>
              ))
            ) : (
              <div className="empty" style={{ padding: "8px 10px" }}>No page matches “{q}”.</div>
            )}
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-label={`Recent activity${pending ? `, ${pending} pending approvals` : ""}`}
          aria-expanded={open === "notif"}
          onClick={() => setOpen(open === "notif" ? null : "notif")}
          style={{ position: "relative", width: 42, height: 42, borderRadius: 12, border: "1px solid var(--input)", background: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16161a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {pending > 0 && (
            <span style={{ position: "absolute", top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, background: "#f43f5e", color: "#fff", font: "700 10.5px/15px var(--font-sans)", textAlign: "center", padding: "0 5px", border: "2px solid #f7f7f5" }}>{pending}</span>
          )}
        </button>
        {open === "notif" && (
          <div className="popover" role="dialog" aria-label="Recent activity" style={{ right: 0, top: "calc(100% + 8px)", width: "min(330px, calc(100vw - 32px))", padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ font: "600 15px var(--font-display)", padding: "2px 4px 6px" }}>Recent activity</div>
            {notifs.length ? (
              notifs.map((n) => (
                <div key={n.id} style={{ display: "flex", gap: 10, padding: 9, borderRadius: 10, background: "var(--subtle)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.color, marginTop: 5, flex: "none" }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ font: "600 12.5px/1.4 var(--font-sans)" }}>{n.text}</span>
                    <span className="meta" style={{ fontSize: 11 }}>{n.who} · <span className="mono" style={{ fontWeight: 500 }}>{n.when}</span></span>
                  </span>
                </div>
              ))
            ) : (
              <div className="empty">Nothing yet.</div>
            )}
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-expanded={open === "me"}
          aria-label="Account menu"
          onClick={() => setOpen(open === "me" ? null : "me")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 5px", background: "#fff", border: "1px solid var(--input)", borderRadius: 14, cursor: "pointer" }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 10, background: "#16161a", color: "#fff", display: "grid", placeItems: "center", font: "700 12px var(--font-sans)" }}>{initials(me.name)}</span>
          <span className="hide-sm" style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
            <span style={{ font: "700 12px var(--font-sans)" }}>{me.role}</span>
            <span style={{ font: "500 10.5px var(--font-mono)", color: "var(--text-3)" }}>{me.code}</span>
          </span>
        </button>
        {open === "me" && (
          <div className="popover" style={{ right: 0, top: "calc(100% + 8px)", width: 220, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px 10px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
              <div style={{ font: "700 13px var(--font-sans)" }}>{me.name}</div>
              <div className="meta">{me.role}</div>
            </div>
            <Link href="/change-password" style={{ padding: "9px 10px", borderRadius: 9, color: "var(--ink)", font: "600 13px var(--font-sans)" }}>Change password</Link>
            <button type="button" onClick={() => logout()} style={{ textAlign: "left", padding: "9px 10px", borderRadius: 9, border: "none", background: "none", cursor: "pointer", color: "#a61e45", font: "600 13px var(--font-sans)" }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
