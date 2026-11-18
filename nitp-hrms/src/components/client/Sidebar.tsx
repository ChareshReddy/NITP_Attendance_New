"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/AuthFrame";
import { initials } from "@/lib/tones";

type Item = { href: string; label: string; dot: string; badge: number };

export function Sidebar({ items, me }: { items: Item[]; me: { name: string; title: string } }) {
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [path]);
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 6px", textDecoration: "none", color: "var(--ink)" }}>
        <Logo />
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ font: "700 17px/1.1 var(--font-display)", letterSpacing: "-.02em" }}>NITP People</span>
          <span className="meta" style={{ fontWeight: 600, fontSize: 11 }}>Attendance &amp; HRMS</span>
        </span>
      </Link>
      <nav className="nav" ref={navRef} aria-label="Sections">
        {items.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: n.dot, flex: "none" }} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge > 0 && (
                <span style={{ font: "700 10.5px var(--font-sans)", background: "#f43f5e", color: "#fff", borderRadius: 20, padding: "2px 7px" }} aria-label={`${n.badge} pending`}>
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, background: "#efe9ff" }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#7c5cff", color: "#fff", display: "grid", placeItems: "center", font: "700 13px var(--font-sans)", flex: "none" }}>{initials(me.name)}</span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ font: "700 13px var(--font-sans)" }}>{me.name}</span>
          <span style={{ font: "500 11px var(--font-sans)", color: "#5236b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me.title}</span>
        </span>
      </div>
    </aside>
  );
}
