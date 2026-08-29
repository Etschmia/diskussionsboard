#!/bin/sh
# Installiert/aktualisiert systemd-Unit und Caddy-Site, baut und (re)startet den Dienst.
set -e
cd "$(dirname "$0")/.."
bun run build
sudo cp deploy/board.service /etc/systemd/system/board.service
sudo cp deploy/board.caddy /etc/caddy/sites/board.caddy
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable board.service >/dev/null 2>&1 || true
sudo systemctl restart board.service
sudo systemctl reload caddy
echo "board.service läuft, Caddy neu geladen."
