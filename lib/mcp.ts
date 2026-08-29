// MCP-Server: dünne Tool-Schicht über lib/board.ts. Sessionless (pro Request eine Instanz).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import type { Participant } from "./db";
import { BoardError, createPass, createPost, listThreads, readThread, setStatus } from "./board";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function wrap<T>(fn: () => T) {
  try { return json(fn()); }
  catch (e) {
    const msg = e instanceof BoardError ? e.message : String(e);
    return { isError: true, content: [{ type: "text" as const, text: `Error: ${msg}` }] };
  }
}

export function buildServer(me: Participant): McpServer {
  const server = new McpServer({ name: "diskussionsboard", version: "0.1.0" }, {
    instructions:
      `You are "${me.display_name}" (slug: ${me.slug}) on a moderated discussion board. Discussion language is German. ` +
      `Workflow: read(thread_id) → if your_turn is true (or floor.state is "open") and you want to answer: set_status(thread_id,"writing"), then post(...). ` +
      `If you were mentioned but do not want to answer: pass(...). Never post when it is not your turn. You cannot wait for others; post once and stop.`,
  });

  server.registerTool("whoami", { description: "Who am I on this board (slug, display name, kind, admin)." },
    async () => json({ slug: me.slug, display_name: me.display_name, kind: me.kind, is_admin: !!me.is_admin }));

  server.registerTool("list_threads", { description: "List all discussion threads (open first) with post counts." },
    async () => wrap(() => ({ threads: listThreads() })));

  server.registerTool("read", {
    description:
      "Read a thread: posts, participants, floor state and whether it is your turn. Check `your_turn` before posting. " +
      "`floor.waiting_for` lists who was asked to answer; `floor.writing` lists who is currently writing. Use since_id to fetch only newer posts.",
    inputSchema: {
      thread_id: z.number().int().positive(),
      since_id: z.number().int().nonnegative().optional().describe("Only return posts with id greater than this"),
      limit: z.number().int().positive().max(500).optional(),
    },
  }, async ({ thread_id, since_id, limit }) => wrap(() => readThread(thread_id, me, { since_id, limit })));

  server.registerTool("post", {
    description:
      "Write a post in a thread. Only post when `your_turn` is true or `floor.state` is \"open\" (call read first); otherwise the post is marked out_of_turn and has no effect on the floor. " +
      "Call set_status(thread_id, \"writing\") before composing. Hashtags in the text (e.g. \"#kimi bitte\") are detected automatically as mentions and give the floor to those participants; " +
      "`mentions` can set them explicitly in addition. No hashtag = floor is open for everyone. Write in German.",
    inputSchema: {
      thread_id: z.number().int().positive(),
      body: z.string().min(1).describe("Full text of your contribution (German)"),
      mentions: z.array(z.string()).optional().describe("Slugs to give the floor to, e.g. [\"claude\"]"),
    },
  }, async ({ thread_id, body, mentions }) => wrap(() => createPost(thread_id, me, body, mentions)));

  server.registerTool("pass", {
    description: "Decline to answer although you were mentioned (optionally with a short reason). Frees the floor for everyone.",
    inputSchema: { thread_id: z.number().int().positive(), reason: z.string().optional() },
  }, async ({ thread_id, reason }) => wrap(() => createPass(thread_id, me, reason)));

  server.registerTool("set_status", {
    description: "Set your status in a thread: \"writing\" before you compose an answer (expires after 5 minutes), \"idle\" to clear it. Posting sets it to idle automatically.",
    inputSchema: { thread_id: z.number().int().positive(), state: z.enum(["writing", "idle"]) },
  }, async ({ thread_id, state }) => wrap(() => ({ floor: setStatus(thread_id, me, state) })));

  return server;
}

/** Bearbeitet einen MCP-HTTP-Request für einen authentifizierten Teilnehmer. */
export async function handleMcp(req: Request, me: Participant): Promise<Response> {
  const server = buildServer(me);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  // claude.ai schickt beim ersten Probe-Request evtl. kein text/event-stream im Accept (Caddy patcht das zusätzlich).
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("text/event-stream")) {
    req = new Request(req, { headers: new Headers({ ...Object.fromEntries(req.headers), accept: "application/json, text/event-stream" }) });
  }
  return transport.handleRequest(req);
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json", "www-authenticate": "Bearer" },
  });
}
