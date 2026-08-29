// Fachlogik des Boards: Floor-Berechnung, Mentions, Posten, Pass, Status, Read-Antwort.
// Wird von HTTP-API, MCP-Server und GUI gemeinsam genutzt.
import { db, type Participant, type Thread, type PostRow } from "./db";
import { RULES, mentionSlugs } from "./rules";

export const WRITING_TTL_MS = 5 * 60 * 1000;

export class BoardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Floor = {
  state: "open" | "waiting_for";
  waiting_for: string[];
  since: string | null;
  writing: string[];
};

export type PostOut = {
  id: number; author: string; type: "post" | "pass" | "system"; body: string;
  mentions: string[]; out_of_turn: boolean; created_at: string;
};

export type ReadResponse = {
  thread: { id: number; title: string; status: "open" | "closed"; created_at: string };
  you: { slug: string; display_name: string };
  floor: Floor;
  your_turn: boolean;
  participants: { slug: string; display_name: string; kind: string }[];
  posts: PostOut[];
  rules: string;
};

/** Hashtags im Text (#slug), nur für konfigurierte Slugs. */
export function parseMentions(body: string, extra: string[] = []): string[] {
  const known = new Set(mentionSlugs());
  const found = new Set<string>();
  for (const m of body.matchAll(/(^|[^\w#])#([a-z0-9_-]+)/gi)) {
    const s = m[2].toLowerCase();
    if (known.has(s)) found.add(s);
  }
  for (const s of extra) {
    const v = s.trim().toLowerCase().replace(/^#/, "");
    if (known.has(v)) found.add(v);
  }
  return [...found];
}

export function getThread(id: number): Thread {
  const t = db().prepare("SELECT * FROM threads WHERE id = ?").get(id) as Thread | undefined;
  if (!t) throw new BoardError(404, "thread not found");
  return t;
}

export function listThreads() {
  return db().prepare(`
    SELECT t.id, t.title, t.status, t.created_at, p.slug AS created_by,
      (SELECT COUNT(*) FROM posts WHERE thread_id = t.id) AS post_count,
      (SELECT MAX(created_at) FROM posts WHERE thread_id = t.id) AS last_post_at
    FROM threads t JOIN participants p ON p.id = t.created_by
    ORDER BY t.status = 'open' DESC, t.id DESC`).all() as {
      id: number; title: string; status: string; created_at: string; created_by: string;
      post_count: number; last_post_at: string | null;
    }[];
}

export function listParticipants(includeInactive = false) {
  return db().prepare(
    `SELECT id, slug, display_name, kind, is_admin, is_active, created_at FROM participants
     ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY is_admin DESC, id`
  ).all() as Participant[];
}

export function computeFloor(threadId: number): Floor {
  const last = db().prepare(
    "SELECT * FROM posts WHERE thread_id = ? AND type != 'system' ORDER BY id DESC LIMIT 1"
  ).get(threadId) as PostRow | undefined;
  const cutoff = new Date(Date.now() - WRITING_TTL_MS).toISOString();
  const writing = (db().prepare(
    `SELECT p.slug FROM statuses s JOIN participants p ON p.id = s.participant_id
     WHERE s.thread_id = ? AND s.state = 'writing' AND s.updated_at > ? ORDER BY s.updated_at`
  ).all(threadId, cutoff) as { slug: string }[]).map((r) => r.slug);
  const mentions: string[] = last && last.type === "post" ? JSON.parse(last.mentions) : [];
  if (mentions.length > 0) {
    return { state: "waiting_for", waiting_for: mentions, since: last!.created_at, writing };
  }
  return { state: "open", waiting_for: [], since: last?.created_at ?? null, writing };
}

function isYourTurn(floor: Floor, me: Participant): boolean {
  return floor.state === "open" || floor.waiting_for.includes(me.slug);
}

export function readThread(threadId: number, me: Participant, opts: { since_id?: number; limit?: number } = {}): ReadResponse {
  const t = getThread(threadId);
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const since = opts.since_id ?? 0;
  const rows = db().prepare(
    `SELECT po.*, pa.slug AS author FROM posts po JOIN participants pa ON pa.id = po.participant_id
     WHERE po.thread_id = ? AND po.id > ? ORDER BY po.id LIMIT ?`
  ).all(threadId, since, limit) as PostRow[];
  const floor = computeFloor(threadId);
  return {
    thread: { id: t.id, title: t.title, status: t.status, created_at: t.created_at },
    you: { slug: me.slug, display_name: me.display_name },
    floor,
    your_turn: t.status === "open" && isYourTurn(floor, me),
    participants: listParticipants().map((p) => ({ slug: p.slug, display_name: p.display_name, kind: p.kind })),
    posts: rows.map(toPost),
    rules: RULES,
  };
}

export function toPost(r: PostRow): PostOut {
  return {
    id: r.id, author: r.author, type: r.type, body: r.body,
    mentions: JSON.parse(r.mentions), out_of_turn: !!r.out_of_turn, created_at: r.created_at,
  };
}

function insertPost(threadId: number, me: Participant, type: "post" | "pass" | "system", body: string, mentions: string[], outOfTurn: boolean): PostOut {
  const d = db();
  const info = d.prepare(
    "INSERT INTO posts (thread_id, participant_id, type, body, mentions, out_of_turn) VALUES (?,?,?,?,?,?)"
  ).run(threadId, me.id, type, body, JSON.stringify(mentions), outOfTurn ? 1 : 0);
  d.prepare("INSERT INTO statuses (thread_id, participant_id, state) VALUES (?,?,'idle') ON CONFLICT(thread_id, participant_id) DO UPDATE SET state='idle', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')")
    .run(threadId, me.id);
  const row = d.prepare(
    "SELECT po.*, pa.slug AS author FROM posts po JOIN participants pa ON pa.id = po.participant_id WHERE po.id = ?"
  ).get(info.lastInsertRowid) as PostRow;
  return toPost(row);
}

export function createPost(threadId: number, me: Participant, body: string, mentions: string[] = []): { post: PostOut; floor: Floor } {
  const t = getThread(threadId);
  if (t.status !== "open") throw new BoardError(409, "thread is closed");
  body = body.trim();
  if (!body) throw new BoardError(400, "body is empty");
  const floor = computeFloor(threadId);
  const outOfTurn = !me.is_admin && !isYourTurn(floor, me);
  const post = insertPost(threadId, me, "post", body, parseMentions(body, mentions), outOfTurn);
  return { post, floor: computeFloor(threadId) };
}

export function createPass(threadId: number, me: Participant, reason?: string): { post: PostOut; floor: Floor } {
  const t = getThread(threadId);
  if (t.status !== "open") throw new BoardError(409, "thread is closed");
  const floor = computeFloor(threadId);
  const outOfTurn = !me.is_admin && !isYourTurn(floor, me);
  const post = insertPost(threadId, me, "pass", (reason ?? "").trim(), [], outOfTurn);
  return { post, floor: computeFloor(threadId) };
}

export function setStatus(threadId: number, me: Participant, state: "writing" | "idle"): Floor {
  getThread(threadId);
  db().prepare(
    `INSERT INTO statuses (thread_id, participant_id, state) VALUES (?,?,?)
     ON CONFLICT(thread_id, participant_id) DO UPDATE SET state=excluded.state, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`
  ).run(threadId, me.id, state);
  return computeFloor(threadId);
}

// --- Admin ---

export function requireAdmin(me: Participant) {
  if (!me.is_admin) throw new BoardError(403, "admin only");
}

export function createThread(me: Participant, title: string, body: string, mentions: string[] = []) {
  requireAdmin(me);
  title = title.trim();
  if (!title) throw new BoardError(400, "title is empty");
  const d = db();
  return d.transaction(() => {
    const info = d.prepare("INSERT INTO threads (title, created_by) VALUES (?,?)").run(title, me.id);
    const id = Number(info.lastInsertRowid);
    if (body.trim()) {
      const post = insertPost(id, me, "post", body.trim(), parseMentions(body, mentions), false);
      d.prepare("UPDATE threads SET opening_post_id = ? WHERE id = ?").run(post.id, id);
    }
    return getThread(id);
  })();
}

export function closeThread(me: Participant, threadId: number) {
  requireAdmin(me);
  const t = getThread(threadId);
  if (t.status === "closed") return t;
  db().prepare("UPDATE threads SET status = 'closed' WHERE id = ?").run(threadId);
  insertPost(threadId, me, "system", `Thread geschlossen von ${me.display_name}.`, [], false);
  return getThread(threadId);
}

export function createParticipant(me: Participant, input: { slug: string; display_name?: string; kind: "human" | "mcp" | "api"; is_admin?: boolean }, hashToken: (t: string) => string, generateToken: () => string) {
  requireAdmin(me);
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(slug)) throw new BoardError(400, "invalid slug");
  const token = generateToken();
  try {
    const info = db().prepare(
      "INSERT INTO participants (slug, display_name, kind, token_hash, is_admin) VALUES (?,?,?,?,?)"
    ).run(slug, input.display_name?.trim() || slug, input.kind, hashToken(token), input.is_admin ? 1 : 0);
    return { id: Number(info.lastInsertRowid), slug, token };
  } catch (e) {
    if (String(e).includes("UNIQUE")) throw new BoardError(409, "slug already exists");
    throw e;
  }
}

/** Token sperren. Teilnehmer bleibt sichtbar (Autor alter Beiträge), kann aber nichts mehr tun. */
export function revokeParticipant(me: Participant, id: number) {
  requireAdmin(me);
  if (id === me.id) throw new BoardError(400, "cannot revoke yourself");
  const r = db().prepare("UPDATE participants SET is_active = 0, token_hash = NULL WHERE id = ?").run(id);
  if (r.changes === 0) throw new BoardError(404, "participant not found");
}

/** Neues Token für bestehenden Teilnehmer (reaktiviert ihn). */
export function rotateToken(me: Participant, id: number, hashToken: (t: string) => string, generateToken: () => string) {
  requireAdmin(me);
  const token = generateToken();
  const r = db().prepare("UPDATE participants SET token_hash = ?, is_active = 1 WHERE id = ?").run(hashToken(token), id);
  if (r.changes === 0) throw new BoardError(404, "participant not found");
  return { id, token };
}
