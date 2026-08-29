# Diskussionsboard
Siehe README.md. Runtime ist Node (better-sqlite3 nativ gebaut) – nicht `bun --bun`, Bun crasht beim Laden des Moduls.
Deploy: `deploy/install.sh`. Service `board.service`, Port 3090, Caddy-Site `/etc/caddy/sites/board.caddy`.
Regeln/Floor-Logik zentral in `lib/board.ts`; keine Vorrats-Abstraktionen für OAuth (Phase 2) / Runner (Phase 3).
