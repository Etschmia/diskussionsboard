// MCP-Endpoint, Auth per Authorization: Bearer <token>.
import { authFromRequest } from "@/lib/auth";
import { handleMcp, unauthorized } from "@/lib/mcp";

export const dynamic = "force-dynamic";

async function route(req: Request) {
  const me = authFromRequest(req);
  if (!me) return unauthorized();
  return handleMcp(req, me);
}
export { route as GET, route as POST, route as DELETE };
