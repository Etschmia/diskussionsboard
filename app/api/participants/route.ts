import { handler } from "@/lib/api";
import { BoardError, createParticipant, listParticipants, requireAdmin } from "@/lib/board";
import { generateToken, hashToken } from "@/lib/auth";
export const GET = handler((_req, me) => { requireAdmin(me); return { participants: listParticipants(true) }; });
export const POST = handler((_req, me, _p, body) => {
  const kind = body.kind;
  if (!["human", "mcp", "api"].includes(kind)) throw new BoardError(400, "kind must be human|mcp|api");
  // Token wird genau einmal im Klartext zurückgegeben.
  return createParticipant(me, { slug: String(body.slug ?? ""), display_name: body.display_name, kind, is_admin: !!body.is_admin }, hashToken, generateToken);
});
