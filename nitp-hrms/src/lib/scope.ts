import "server-only";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { ActionError } from "./auth";

/** Members of the teams this TL leads (excluding the TL). */
export async function teamMemberIds(tlId: string): Promise<string[]> {
  const rows = await db.user.findMany({
    where: { team: { leadId: tlId }, id: { not: tlId }, active: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** User ids whose records this user may see. `null` means everyone (HR). */
export async function visibleUserIds(u: CurrentUser): Promise<string[] | null> {
  if (u.role === "HR") return null;
  if (u.role === "TL") return [u.id, ...(await teamMemberIds(u.id))];
  return [u.id];
}

export function userFilter(ids: string[] | null) {
  return ids ? { userId: { in: ids } } : {};
}

/** Whether `u` may approve or reject a request belonging to `ownerId`. Nobody approves their own. */
export async function canDecideFor(u: CurrentUser, ownerId: string): Promise<boolean> {
  if (ownerId === u.id) return false;
  if (u.role === "HR") return true;
  if (u.role === "TL") return (await teamMemberIds(u.id)).includes(ownerId);
  return false;
}

export async function assertCanDecide(u: CurrentUser, ownerId: string) {
  if (!(await canDecideFor(u, ownerId))) throw new ActionError("You can only decide requests from your own team.");
}
