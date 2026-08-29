// Legt die Start-Teilnehmer an und schreibt deren Tokens einmalig in tokens.txt (chmod 600).
// Bereits vorhandene Slugs werden übersprungen (Tokens bleiben unverändert).
import "dotenv/config";
import fs from "node:fs";
import { db } from "../lib/db";
import { hashToken, generateToken } from "../lib/auth";

const SEED: { slug: string; name: string; kind: "human" | "mcp" | "api"; admin?: boolean }[] = [
  { slug: "tobias", name: "Tobias", kind: "human", admin: true },
  { slug: "claude", name: "Claude", kind: "mcp" },
  { slug: "chatgpt", name: "ChatGPT", kind: "mcp" },
  { slug: "gemini", name: "Gemini", kind: "api" },
  { slug: "kimi", name: "Kimi", kind: "api" },
];

const d = db();
const lines: string[] = [];
for (const s of SEED) {
  const exists = d.prepare("SELECT id FROM participants WHERE slug = ?").get(s.slug);
  if (exists) { console.log(`skip ${s.slug} (exists)`); continue; }
  const token = generateToken(s.slug);
  d.prepare("INSERT INTO participants (slug, display_name, kind, token_hash, is_admin) VALUES (?,?,?,?,?)")
    .run(s.slug, s.name, s.kind, hashToken(token), s.admin ? 1 : 0);
  lines.push(`${s.slug}\t${token}`);
  console.log(`created ${s.slug}`);
}
if (lines.length) {
  const file = "tokens.txt";
  fs.appendFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  console.log(`tokens written to ${file} (chmod 600) – store them safely and delete the file.`);
}
