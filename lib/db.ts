// SQLite-Zugriff. Eine Verbindung pro Prozess, Schema wird beim Öffnen angelegt.
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('human','mcp','api')),
  token_hash TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  opening_post_id INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by INTEGER NOT NULL REFERENCES participants(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES threads(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  type TEXT NOT NULL CHECK (type IN ('post','pass','system')),
  body TEXT NOT NULL,
  mentions TEXT NOT NULL DEFAULT '[]',
  out_of_turn INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS posts_thread ON posts(thread_id, id);
CREATE TABLE IF NOT EXISTS statuses (
  thread_id INTEGER NOT NULL REFERENCES threads(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id),
  state TEXT NOT NULL CHECK (state IN ('writing','idle')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (thread_id, participant_id)
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __boardDb: Database.Database | undefined;
}

export function db(): Database.Database {
  if (globalThis.__boardDb) return globalThis.__boardDb;
  const file = path.resolve(process.env.BOARD_DB ?? "./data/board.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.exec(SCHEMA);
  globalThis.__boardDb = d;
  return d;
}

export type Participant = {
  id: number; slug: string; display_name: string; kind: "human" | "mcp" | "api";
  is_admin: number; is_active: number; created_at: string;
};
export type Thread = {
  id: number; title: string; opening_post_id: number | null; status: "open" | "closed";
  created_by: number; created_at: string;
};
export type PostRow = {
  id: number; thread_id: number; participant_id: number; type: "post" | "pass" | "system";
  body: string; mentions: string; out_of_turn: number; created_at: string; author: string;
};
