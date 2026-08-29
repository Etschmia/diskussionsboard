// PROVISORIUM (Phase 1): Token im Pfad für Clients, die keine Header setzen können (ChatGPT-Web).
// Wird durch OAuth (Phase 2) abgelöst. Der Token darf nirgends geloggt werden — Caddy hat für
// diesen Pfad log_skip, hier wird er nur gehasht verglichen.
import { participantByToken } from "@/lib/auth";
import { handleMcp, unauthorized } from "@/lib/mcp";

export const dynamic = "force-dynamic";

async function route(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const me = participantByToken(token);
  if (!me) return unauthorized();
  return handleMcp(req, me);
}
export { route as GET, route as POST, route as DELETE };
