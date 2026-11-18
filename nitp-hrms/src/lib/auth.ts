import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session-token";

export type CurrentUser = Pick<User, "id" | "name" | "email" | "role" | "empCode" | "title" | "department" | "teamId" | "mustChangePassword">;

export async function startSession(u: Pick<User, "id" | "role" | "sessionVersion" | "mustChangePassword">) {
  const token = await signSession({ uid: u.id, role: u.role, ver: u.sessionVersion, mcp: u.mustChangePassword });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, re-checked against the database on every request (deactivation and password resets take effect at once). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const u = await db.user.findUnique({
    where: { id: claims.uid },
    select: { id: true, name: true, email: true, role: true, empCode: true, title: true, department: true, teamId: true, mustChangePassword: true, active: true, sessionVersion: true },
  });
  if (!u || !u.active || u.sessionVersion !== claims.ver) return null;
  const { active: _a, sessionVersion: _v, ...rest } = u;
  return rest;
});

/** For pages: redirects to login (or password change) when needed. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login?expired=1");
  if (u.mustChangePassword) redirect("/change-password");
  if (roles && !roles.includes(u.role)) redirect("/dashboard");
  return u;
}

export class ActionError extends Error {}

/** For server actions: throws instead of redirecting. */
export async function actor(roles?: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new ActionError("Your session has ended. Sign in again.");
  if (u.mustChangePassword) throw new ActionError("Change your initial password first.");
  if (roles && !roles.includes(u.role)) throw new ActionError("You don't have access to do that.");
  return u;
}
