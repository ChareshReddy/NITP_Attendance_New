import "server-only";
import { db } from "./db";
import type { Tone } from "./tones";

export async function audit(actorId: string | null, action: string, tone: Tone = "sky") {
  await db.auditLog.create({ data: { actorId, action: action.slice(0, 500), tone } });
}
