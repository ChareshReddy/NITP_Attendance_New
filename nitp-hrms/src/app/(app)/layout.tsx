import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { NAV, ROLE_NAME } from "@/lib/nav";
import { visibleUserIds, teamMemberIds } from "@/lib/scope";
import { hmInTz, fmtDate, ymdInTz } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { Sidebar } from "@/components/client/Sidebar";
import { Topbar } from "@/components/client/Topbar";
import { ToastProvider } from "@/components/client/Toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();
  const nav = NAV.filter((n) => n.roles.includes(me.role));

  // Approval counts for the sidebar badges
  let approvals = { leave: 0, att: 0, track: 0 };
  if (me.role !== "EMPLOYEE") {
    const owners = me.role === "HR" ? undefined : await teamMemberIds(me.id);
    const who = owners ? { userId: { in: owners } } : { userId: { not: me.id } };
    const [l, w, r, t] = await Promise.all([
      db.leaveRequest.count({ where: { status: "PENDING", ...who } }),
      db.wfhRequest.count({ where: { status: "PENDING", ...who } }),
      db.regularisation.count({ where: { status: "PENDING", ...who } }),
      db.trackSheet.count({ where: { status: "SUBMITTED", ...who } }),
    ]);
    approvals = { leave: l + w, att: r, track: t };
  }

  const ids = await visibleUserIds(me);
  const recent = await db.auditLog.findMany({
    where: ids ? { actorId: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { actor: { select: { name: true } } },
  });
  const today = ymdInTz();
  const notifs = recent.map((a) => ({
    id: a.id,
    text: a.action,
    who: a.actor?.name ?? "System",
    when: a.createdAt.toISOString().slice(0, 10) === today ? hmInTz(a.createdAt) : fmtDate(a.createdAt, { day: "numeric", month: "short" }),
    color: TONES[(a.tone as Tone) in TONES ? (a.tone as Tone) : "sky"].ac,
  }));

  const badges: Record<string, number> = { "/leave": approvals.leave, "/attendance": approvals.att, "/tracksheet": approvals.track };

  return (
    <ToastProvider>
      <div className="shell">
        <Sidebar
          items={nav.map((n) => ({ href: n.href, label: n.label, dot: TONES[n.tone].ac, badge: badges[n.href] || 0 }))}
          me={{ name: me.name, title: me.title ?? ROLE_NAME[me.role] }}
        />
        <main id="main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <Suspense>
            <Topbar
              nav={nav.map((n) => ({ href: n.href, label: n.label, section: n.section }))}
              me={{ name: me.name, role: ROLE_NAME[me.role], code: me.empCode }}
              notifs={notifs}
              pending={approvals.leave + approvals.att + approvals.track}
            />
          </Suspense>
          <div className="content">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
