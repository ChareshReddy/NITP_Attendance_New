import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ActionError } from "./auth";

export type ActionResult = { ok: boolean; message: string; tone?: string; data?: Record<string, string> };

/** Wraps a server action body: turns known errors into a friendly message for the toast. */
export async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, message: e.message };
    if (e instanceof ZodError) return { ok: false, message: e.issues[0]?.message ?? "Check the form and try again." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, message: "That record already exists." };
    console.error(e);
    return { ok: false, message: "Something went wrong saving that. Try again." };
  }
}

export function fd(form: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") o[k] = v.trim();
  return o;
}
