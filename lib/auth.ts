// Token-Handling: Tokens werden nur als SHA-256-Hash gespeichert.
// Auth-Quellen: Authorization-Bearer, Cookie (GUI), Pfad-Token (/mcp/t/<token>, Provisorium).
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, type Participant } from "./db";

export const COOKIE_NAME = "board_token";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(prefix = "bd"): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

export function participantByToken(token: string | null | undefined): Participant | null {
  if (!token) return null;
  const row = db()
    .prepare("SELECT * FROM participants WHERE token_hash = ? AND is_active = 1")
    .get(hashToken(token)) as Participant | undefined;
  return row ?? null;
}

export function bearerFromRequest(req: Request): string | null {
  const h = req.headers.get("authorization");
  const m = h?.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** API-Auth: Bearer, ersatzweise das GUI-Cookie (damit die GUI dieselbe API nutzt). */
export function authFromRequest(req: Request): Participant | null {
  const bearer = bearerFromRequest(req);
  if (bearer) return participantByToken(bearer);
  const m = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return participantByToken(m ? decodeURIComponent(m[1]) : null);
}

/** GUI-Auth: Cookie. */
export async function authFromCookie(): Promise<Participant | null> {
  const c = await cookies();
  return participantByToken(c.get(COOKIE_NAME)?.value);
}
