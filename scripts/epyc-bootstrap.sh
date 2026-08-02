#!/usr/bin/env bash
# epyc-bootstrap.sh — one-command deploy of live.eidosagi.com onto the
# HOSTKEY EPYC bare-metal (epyc-56223.eidosagi.com, 162.120.18.7).
#
# Run from your laptop. Assumes you have SSH access as eidos@…:2299.
#
# What it does:
#   1. mkdir /srv/live-eidosagi/{data,caddy-data,caddy-config}
#   2. git clone (or pull) the repo at /srv/live-eidosagi/src
#   3. prompt for INGEST_TOKEN, write .env
#   4. docker compose build && up -d --wait
#   5. curl smoke check
#
# After this succeeds, the site is live on the EPYC at http://<EPYC-IP>.
# TLS on 443 comes from the Caddyfile once a DNS A record points at it.
#
# DNS step (still yours to do after this script runs green):
#   Cloudflare → eidosagi.com zone → A record epyc.live.eidosagi.com
#     → 162.120.18.7, proxied=off (grey cloud — Caddy handles TLS directly)
# Then visit https://epyc.live.eidosagi.com to dry-run for 48h before
# the main-domain cutover.

set -euo pipefail

HOST="${EPYC_HOST:-eidos@epyc-56223.eidosagi.com}"
PORT="${EPYC_PORT:-2299}"
REPO="${REPO_URL:-https://github.com/eidos-agi/live-eidosagi-com.git}"
# The migration scaffolding lives on this branch until merged to main.
BRANCH="${BRANCH:-migrate-epyc-scaffolding}"
REMOTE_DIR="/srv/live-eidosagi"

err()  { printf "\033[31m[ERR]\033[0m  %s\n" "$*" >&2; }
info() { printf "\033[36m[...]\033[0m  %s\n" "$*"; }
ok()   { printf "\033[32m[OK]\033[0m   %s\n" "$*"; }

# ── sanity ─────────────────────────────────────────────────────────────
command -v ssh >/dev/null || { err "ssh not found"; exit 1; }
command -v scp >/dev/null || { err "scp not found"; exit 1; }

info "Reaching ${HOST}:${PORT}…"
if ! ssh -o BatchMode=yes -o ConnectTimeout=8 -p "$PORT" "$HOST" "true" 2>/dev/null; then
  err "SSH to $HOST:$PORT failed. Check the key is in your agent + the host is up."
  exit 1
fi
ok "SSH reachable"

info "Checking Docker on the EPYC…"
ssh -p "$PORT" "$HOST" "docker version --format 'server {{.Server.Version}} · compose {{.Server.Components}}'" \
  | head -1 || { err "docker missing on EPYC"; exit 1; }

# ── remote directories ────────────────────────────────────────────────
info "Ensuring $REMOTE_DIR tree…"
ssh -p "$PORT" "$HOST" "sudo mkdir -p $REMOTE_DIR/{src,data,caddy-data,caddy-config}; sudo chown -R \$USER $REMOTE_DIR"
ok "directories ready"

# ── INGEST_TOKEN prompt ───────────────────────────────────────────────
if ! ssh -p "$PORT" "$HOST" "test -s $REMOTE_DIR/.env"; then
  printf "\nEPYC has no $REMOTE_DIR/.env yet. Paste the INGEST_TOKEN (same value Railway uses): "
  read -rs INGEST_TOKEN
  printf "\n"
  if [ -z "$INGEST_TOKEN" ]; then err "empty token"; exit 1; fi
  ssh -p "$PORT" "$HOST" "cat > $REMOTE_DIR/.env" <<EOF
INGEST_TOKEN=$INGEST_TOKEN
CLAUDE_EVENT_COST_USD=0.004
NEXT_PUBLIC_SITE_URL=https://epyc.live.eidosagi.com
EOF
  ssh -p "$PORT" "$HOST" "chmod 600 $REMOTE_DIR/.env"
  ok ".env written"
else
  ok ".env already exists — leaving untouched"
fi

# ── clone or pull source ──────────────────────────────────────────────
info "Syncing source to $REMOTE_DIR/src (branch $BRANCH)…"
ssh -p "$PORT" "$HOST" "
  if [ -d $REMOTE_DIR/src/.git ]; then
    cd $REMOTE_DIR/src
    git fetch origin
    git checkout $BRANCH
    git pull --ff-only origin $BRANCH
  else
    git clone --depth 20 --branch $BRANCH $REPO $REMOTE_DIR/src
  fi
"
ok "source synced"

# ── build + up ────────────────────────────────────────────────────────
info "Building and starting the stack (first run: ~3-5 min for pnpm install)…"
ssh -p "$PORT" "$HOST" "
  cd $REMOTE_DIR/src
  docker compose --env-file $REMOTE_DIR/.env build
  docker compose --env-file $REMOTE_DIR/.env up -d --wait
  docker compose ps
"
ok "stack up"

# ── smoke tests ───────────────────────────────────────────────────────
info "Smoke-checking localhost:80 on the EPYC…"
ssh -p "$PORT" "$HOST" "
  # Caddy on :80 should redirect to https (no cert yet without DNS); the
  # underlying web container should respond on its internal :3000.
  curl -sf -o /dev/null -w '  caddy :80 → HTTP %{http_code}\n' http://localhost/ || echo '  caddy not responding'
  curl -sf -o /dev/null -w '  web (compose internal :3000) → HTTP %{http_code}\n' \
    \$(docker compose -f $REMOTE_DIR/src/docker-compose.yml port web 3000 2>/dev/null || echo 'http://localhost:3000') \
    || echo '  web container not responding'
"

cat <<EOF

╭──────────────────────────────────────────────────────────────────────╮
│ Next: Cloudflare A record                                            │
│   epyc.live.eidosagi.com  →  162.120.18.7  (grey cloud, not orange)  │
│                                                                      │
│ Then Caddy will auto-issue a Let's Encrypt cert on first request to  │
│ https://epyc.live.eidosagi.com. 48h dry-run, then flip main domain.  │
╰──────────────────────────────────────────────────────────────────────╯
EOF
ok "bootstrap done"
