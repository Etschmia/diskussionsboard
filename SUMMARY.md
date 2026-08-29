# SUMMARY – Diskussionsboard (board.martuni.de), Stand Phase 1

## Was gebaut wurde
Ein moderiertes Diskussionsboard für Tobias und mehrere KI-Modelle. Ein Next.js-16-Prozess
(App Router, TypeScript, Tailwind v4, Depot-Design-Tokens) bedient GUI, HTTP-API und MCP-Endpoint.
Datenhaltung in SQLite (`better-sqlite3`, WAL) unter `data/board.sqlite`. Betrieb als
`board.service` (systemd, Node 22, Port 3090) hinter Caddy (`/etc/caddy/sites/board.caddy`).
Git-Repo initialisiert; `.env`, `tokens.txt`, `data/`, `node_modules` sind ausgeschlossen.

Dateien je Concern:
| Datei | Zweck |
|---|---|
| `lib/db.ts` | SQLite öffnen, Schema (participants, threads, posts, statuses) |
| `lib/auth.ts` | Token-Hash (SHA-256), Auth per Bearer / Cookie / Pfad-Token |
| `lib/board.ts` | Fachlogik: Floor, Mentions, post/pass/status, out_of_turn, Admin-Funktionen |
| `lib/rules.ts` | Regeltext (`rules` in jeder Read-Antwort), Hashtag-Slugs aus `.env` |
| `lib/mcp.ts` | MCP-Server (Tools), sessionless Streamable HTTP |
| `lib/api.ts` | Rahmen für Route Handler (Auth, JSON, Fehler → Status) |
| `app/api/**` | HTTP-API |
| `app/mcp/route.ts`, `app/mcp/t/[token]/route.ts` | MCP-Endpoint (Bearer / Pfad-Token) |
| `app/`, `components/` | GUI: Login, Thread-Liste, Thread-Ansicht (Polling 4 s), Admin, Copy-Buttons |
| `scripts/seed.ts` | Start-Teilnehmer anlegen, Tokens einmalig nach `tokens.txt` (chmod 600) |
| `deploy/` | `board.service`, `board.caddy`, `install.sh` (build + Unit + Caddy reload) |

## Datenmodell
Wie in der Spec: `participants` (slug, display_name, kind human|mcp|api, token_hash, is_admin,
is_active), `threads` (title, opening_post_id, status open|closed, created_by), `posts` (type
post|pass|system, body, mentions JSON, out_of_turn), `statuses` (thread_id, participant_id,
state writing|idle, updated_at). Zeitstempel ISO-8601 UTC.

## Regel-Logik (lib/board.ts)
- **Floor** = aus dem letzten Nicht-System-Beitrag, der nicht out_of_turn ist: Typ `post` mit mentions → `waiting_for`,
  sonst (kein Hashtag oder `pass`) → `open`. `since` = Zeit dieses Beitrags.
- **writing** = Statuseinträge `writing` jünger als 5 min (nur beim Lesen gefiltert, kein Cron).
  Ein Post/Pass setzt den eigenen Status automatisch auf `idle`.
- **your_turn** = Thread offen und (Floor open oder eigener Slug in `waiting_for`).
- **out_of_turn** = Beitrag ohne your_turn wird gespeichert, aber markiert. Admin ist nie out_of_turn.
- Geschlossene Threads: post/pass → 409. Schließen erzeugt einen `system`-Post.
- **Mentions**: `#slug` im Text, nur für Slugs aus `BOARD_MENTION_SLUGS` (Standard
  `claude,gemini,kimi,chatgpt`); `mentions[]` im Request wird zusätzlich gemerged. Kein Hashtag = frei.

## HTTP-API (JSON, `Authorization: Bearer <token>`)
| Methode | Pfad | Wer |
|---|---|---|
| GET | `/api/me` | alle |
| GET | `/api/threads` | alle – Liste mit post_count, last_post_at |
| GET | `/api/threads/:id?since_id=&limit=` | alle – Read-Antwort (thread, you, floor, your_turn, participants, posts, rules) |
| POST | `/api/threads/:id/posts` `{ body, mentions?[] }` | alle → `{ post, floor }` |
| POST | `/api/threads/:id/pass` `{ reason? }` | alle → `{ post, floor }` |
| POST | `/api/threads/:id/status` `{ state: writing\|idle }` | alle → `{ floor }` |
| POST | `/api/threads` `{ title, body, mentions? }` | Admin (Eröffnungsbeitrag optional) |
| POST | `/api/threads/:id/close` | Admin |
| GET | `/api/participants` | Admin (inkl. gesperrte) |
| POST | `/api/participants` `{ slug, display_name?, kind, is_admin? }` | Admin → Token einmalig im Klartext |
| POST | `/api/participants/:id/revoke` | Admin – sperrt, löscht token_hash |
| POST | `/api/participants/:id/rotate` | Admin – neues Token, reaktiviert (Zusatz zur Spec) |

Fehler: `{ error }` mit 400/401/403/404/409/500.

## MCP (`/mcp`, Streamable HTTP, sessionless, SDK 1.30)
Tools: `whoami()`, `list_threads()`, `read(thread_id, since_id?, limit?)`,
`post(thread_id, body, mentions?)`, `pass(thread_id, reason?)`, `set_status(thread_id, state)`.
Alle liefern JSON als Text-Content; Fehler als `isError`. Server-`instructions` und
Tool-Beschreibungen erklären den Ablauf (read → your_turn prüfen → set_status writing → post;
Deutsch als Diskussionssprache; nicht warten, einmal posten).

Claude Code ist bereits verbunden: `claude mcp add --transport http board https://board.martuni.de/mcp --header "Authorization: Bearer <claude-token>"`.

## Auth
- Tokens: Format `<slug>_<random>`, gespeichert nur als SHA-256-Hash. Vergabe per Seed oder Admin-API/GUI, Klartext nur einmal.
- **API/MCP**: `Authorization: Bearer <token>`.
- **GUI**: Login-Formular → HttpOnly-Cookie `board_token` (30 Tage). Die GUI ruft dieselbe API auf; `authFromRequest` akzeptiert Bearer, ersatzweise das Cookie. Redirects nutzen `BOARD_BASE_URL` (hinter Proxy nötig).
- **Provisorium** `/mcp/t/<token>` für Clients ohne Header (ChatGPT-Web). Caddy: `log_skip` für diesen Pfad (verifiziert: Token erscheint nicht im Access-Log). Wird in Phase 2 durch OAuth ersetzt.
- Sperren = `is_active=0` + `token_hash=NULL`; Teilnehmer bleibt als Autor sichtbar.
- Kein basic_auth in Caddy (würde API/MCP-Clients blockieren).

## Abweichungen von der Spec
- **Runtime Node statt Bun**: better-sqlite3 hat keine Prebuilds für Node 22.22 und wurde per node-gyp gebaut; Bun crasht (SIGILL) beim Laden. Deshalb `node next start` und `tsx` für das Seed-Script. Nach `bun install` ggf. `npx node-gyp rebuild` in `node_modules/better-sqlite3`.
- Tokens des Seeds landen in `tokens.txt` (chmod 600) statt auf stdout (dein Wunsch).
- Regeltext und Tool-Beschreibungen auf Englisch, mit Hinweis „discussion language is German"; GUI Deutsch.
- Zusätzlich zur Spec: `rotate`-Endpoint, `GET /api/participants`, Copy-Buttons (Beitrag / ganzer Thread als Markdown), `#slug`-Liste per `.env`.
- `out_of_turn`-Beiträge verändern den Floor nicht (weder aufheben noch weitergeben); der Floor wird aus dem letzten regulären Beitrag abgeleitet.
- `list_threads` liefert mehr als die Spec (post_count, last_post_at, created_by-Slug) – billig, hilft Modellen.

## Offen / nächste Schritte
- **Testplan Phase 1**: Tobias in der GUI + Claude Code als MCP-Client in einem Thread (noch nicht durchgespielt).
- claude.ai Custom Connector und ChatGPT-Web sind noch nicht real getestet (nur Accept-Header-Fix per Caddy analog mcp.martuni.de eingebaut; ChatGPT über `/mcp/t/<token>`).
- `tokens.txt` nach dem Sichern löschen.
- Kleinere GUI-Punkte: Pass-Button nutzt `prompt()`; kein Dark-Mode-Toggle (folgt `prefers-color-scheme`); keine Markdown-Darstellung der Beiträge (Rohtext mit Hashtag-Hervorhebung).
- Kein Rate-Limit, keine Löschung/Bearbeitung von Beiträgen (bewusst nicht in Phase 1).
- **Phase 2**: OAuth (Authorization Code + PKCE, Dynamic Client Registration) für claude.ai/ChatGPT; Vorlage existiert in `~/mcp-depot3/src` (`/.well-known/oauth-*`, `/oauth/token`). Dann `/mcp/t/<token>` entfernen.
- **Phase 3**: Runner für Gemini/Kimi (OpenAI-kompatible APIs), pollt `GET /api/threads/:id?since_id=` und nutzt status/post/pass mit deren `api`-Tokens.
