"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, getCurrentUser, startSession } from "@/lib/auth";
import { checkPassword, hashPassword, passwordProblem } from "@/lib/password";
import { audit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

let _dummy: Promise<string> | null = null;
const dummyHash = () => (_dummy ??= hashPassword("not-a-real-password"));

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (!parsed.success) return { error: "Enter your work email and password." };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const generic = { error: "That email and password don't match. Check them and try again." };
  if (!user || !user.active) {
    await checkPassword(password, await dummyHash()); // even out timing so unknown emails aren't detectable
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask HR to reset your password.` };
  }
  if (!(await checkPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } : { failedLogins: fails },
    });
    if (fails >= MAX_FAILS) await audit(user.id, `Account locked for ${LOCK_MINUTES} min after ${MAX_FAILS} failed sign-ins`, "rose");
    return generic;
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await startSession(user);
  redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/login?expired=1");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await checkPassword(current, user.passwordHash))) return { error: "Your current password isn't right." };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  const updated = await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await audit(me.id, "Changed their password", "lav");
  await startSession(updated);
  redirect("/dashboard?welcome=1");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
