// Edge-safe token helpers (used by proxy.ts and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "nitp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionClaims = {
  uid: string;
  role: "HR" | "TL" | "EMPLOYEE";
  ver: number;
  mcp: boolean; // must change password
};

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function signSession(c: SessionClaims): Promise<string> {
  return new SignJWT({ ...c })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid, role: payload.role as SessionClaims["role"], ver: Number(payload.ver), mcp: Boolean(payload.mcp) };
  } catch {
    return null;
  }
}
