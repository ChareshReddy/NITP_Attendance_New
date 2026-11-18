import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMemberIds, visibleUserIds } from "@/lib/scope";
import { fmtDate, ymdInTz } from "@/lib/time";
import { TONES, type Tone } from "@/lib/tones";
import { ActionButton, ActionForm } from "@/components/client/ActionForm";
import { Avatar, Empty } from "@/components/ui";
import { createTask, deleteTask, moveTask } from "@/app/actions/work";

export const metadata: Metadata = { title: "Tasks" };

const COLS: { key: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE"; name: string; tone: Tone }[] = [
  { key: "TODO", name: "To do", tone: "gray" },
  { key: "IN_PROGRESS", name: "In progress", tone: "sky" },
  { key: "REVIEW", name: "Review", tone: "lav" },
  { key: "DONE", name: "Completed", tone: "mint" },
];
const PRI: Record<string, Tone> = { HIGH: "rose", MEDIUM: "lemon", LOW: "mint" };

export default async function TasksPage() {
  const me = await requireUser();
  const ids = await visibleUserIds(me);
  const assignable =
    me.role === "HR"
      ? await db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : me.role === "TL"
        ? await db.user.findMany({ where: { id: { in: [me.id, ...(await teamMemberIds(me.id))] } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
        : [{ id: me.id, name: me.name }];
  const tasks = await db.task.findMany({
    where: ids ? { OR: [{ assigneeId: { in: ids } }, { createdById: me.id }] } : {},
    include: { assignee: { select: { name: true } } },
    orderBy: [{ dueDate: "asc" }],
  });
  const today = ymdInTz();

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <ActionForm action={createTask} className="card" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 10 }}>
        <label className="field" style={{ flex: 2, minWidth: 200 }}>Task<input name="title" required maxLength={200} placeholder="What needs doing?" className="input" /></label>
        <label className="field" style={{ flex: 1, minWidth: 150 }}>
          Assignee
          <select name="assigneeId" className="input" defaultValue={me.id}>
            {assignable.map((p) => <option key={p.id} value={p.id}>{p.id === me.id ? `${p.name} (me)` : p.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 110 }}>
          Priority
          <select name="priority" className="input" defaultValue="MEDIUM"><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
        </label>
        <label className="field">Due<input name="dueDate" type="date" required min={today} className="input" /></label>
        <button type="submit" className="btn btn-primary">{me.role === "EMPLOYEE" ? "Add task" : "Add or delegate"}</button>
      </ActionForm>

      <div className="grid-auto" style={{ ["--min" as string]: "240px", alignItems: "start" }}>
        {COLS.map((c, ci) => {
          const items = tasks.filter((t) => t.status === c.key);
          const t = TONES[c.tone];
          return (
            <section key={c.key} style={{ background: t.bg, borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }} aria-label={c.name}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px" }}>
                <h2 style={{ margin: 0, font: "700 13px var(--font-sans)", color: t.fg }}>{c.name}</h2>
                <span className="mono" style={{ fontSize: 12, color: t.fg }}>{items.length}</span>
              </div>
              {items.length === 0 && <Empty>Nothing here.</Empty>}
              {items.map((x) => {
                const overdue = c.key !== "DONE" && x.dueDate.toISOString().slice(0, 10) < today;
                const p = TONES[PRI[x.priority]];
                return (
                  <article key={x.id} className="pop" style={{ background: "#fff", borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ font: "700 13px/1.35 var(--font-sans)" }}>{x.title}</span>
                      <span className="badge" style={{ background: p.bg, color: p.fg, alignSelf: "flex-start" }}>{x.priority[0] + x.priority.slice(1).toLowerCase()}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={x.assignee.name} size={26} />
                      <span className="meta" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.assignee.name}</span>
                      <span className="mono" style={{ fontSize: 11.5, color: overdue ? "#a61e45" : "var(--text-2)" }}>{overdue ? "Overdue · " : ""}{fmtDate(x.dueDate, { day: "numeric", month: "short" })}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionButton action={moveTask.bind(null, x.id, -1)} disabled={ci === 0} label="Move back" style={{ flex: 1 }}>←</ActionButton>
                      <ActionButton action={moveTask.bind(null, x.id, 1)} disabled={ci === 3} label="Move forward" style={{ flex: 1 }}>→</ActionButton>
                      {(me.role === "HR" || x.createdById === me.id) && (
                        <ActionButton action={deleteTask.bind(null, x.id)} confirmText={`Delete “${x.title}”?`} label="Delete task">✕</ActionButton>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
