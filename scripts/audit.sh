#!/usr/bin/env bash
# scripts/audit.sh — one-shot benchmark + UX audit probe for live.eidosagi.com
#
# Replaces the ~20-line parallel bash block the agent had been re-typing inline
# every BENCHMARK CHECK / UX IMPRESSION CHECK iteration (~6 times this session).
# Emits a single JSON blob so callers can pipe into jq / python / log_event.
#
# Usage:
#   bash scripts/audit.sh                     # text output
#   bash scripts/audit.sh --json              # compact JSON
#
# Probes, all in parallel:
#   1. H100  Ollama /api/version via SSH
#   2. A100  Ollama /api/version via SSH
#   3. A6000 Ollama /api/version via SSH
#   4. https://live.eidosagi.com/api/savings
#   5. https://live.eidosagi.com/api/events?limit=15
#   6. https://live.eidosagi.com/ (status + size)
#
# SSH keys expected at ~/.thunder/keys/<keyfile>.

set -u
MODE="${1:-text}"

KEY_DIR="$HOME/.thunder/keys"
ssh_probe() {
  local port="$1" key="$2" host="$3"
  ssh -o BatchMode=yes -o ConnectTimeout=6 -o StrictHostKeyChecking=no \
      -p "$port" -i "$KEY_DIR/$key" "ubuntu@$host" \
      "curl -s -m 5 http://localhost:11434/api/version" 2>/dev/null || echo '{"version":null}'
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
ssh_probe 32448 vx7agf6f 62.169.159.125 > "$TMP/h100"   &
ssh_probe 32079 uwpfv1j3 185.216.21.95  > "$TMP/a100"   &
ssh_probe 30117 jlaa7b09 69.19.136.6    > "$TMP/a6000"  &
curl -s -m 8 https://live.eidosagi.com/api/savings > "$TMP/sav" &
curl -s -m 8 "https://live.eidosagi.com/api/events?limit=15" > "$TMP/events" &
curl -s -m 8 -o /dev/null -w '%{http_code}' https://live.eidosagi.com/ > "$TMP/home" &
wait
HOME_STATUS=$(cat "$TMP/home")
export AUDIT_TMP="$TMP"
export AUDIT_MODE="$MODE"
export AUDIT_HOME="$HOME_STATUS"

python3 - <<'PYEOF'
import json, os, time
from datetime import datetime
from pathlib import Path

def j(path):
  try: return json.loads(Path(path).read_text())
  except Exception: return None

tmp = Path(os.environ["AUDIT_TMP"])
mode = os.environ.get("AUDIT_MODE", "text")
h  = j(tmp/"h100")  or {}
a  = j(tmp/"a100")  or {}
s6 = j(tmp/"a6000") or {}
sav = j(tmp/"sav")  or {}
evs = (j(tmp/"events") or {}).get("events", [])
home = os.environ.get("AUDIT_HOME","")

now = time.time()
bm = [e for e in evs if e.get("actor") == "benchmark"]
a6 = [e for e in bm if "A6000" in e.get("summary","")]
aborted = [e for e in bm if "aborted" in e.get("summary","")]
def age_min(e):
  try: return int((now - datetime.fromisoformat(e["ts"].replace("Z","+00:00")).timestamp())/60)
  except: return None
ages = [age_min(e) for e in bm[:3]]

out = {
  "gpus": {
    "H100":  h.get("version"),
    "A100":  a.get("version"),
    "A6000": s6.get("version"),
  },
  "savings": {
    "local_share": sav.get("local_share"),
    "usd_saved":   sav.get("usd_saved_estimate"),
    "total":       sav.get("total_events"),
  },
  "benchmarks": {
    "count_in_last_15_events": len(bm),
    "a6000_in_window":         len(a6),
    "aborted_in_window":       len(aborted),
    "recent_ages_min":         ages,
    "latest_summary":          bm[0]["summary"] if bm else None,
  },
  "critical_paths": {
    "home_status": int(home) if home.isdigit() else None,
  },
}

if mode == "--json":
  print(json.dumps(out, separators=(",",":")))
else:
  g = out["gpus"]
  sv = out["savings"]
  b = out["benchmarks"]
  print(f"GPUs  H100={g['H100'] or 'DOWN':8}  A100={g['A100'] or 'DOWN':8}  A6000={g['A6000'] or 'DOWN':8}")
  usd = sv.get("usd_saved") or 0
  print(f"SAV   share={(sv.get('local_share') or 0)*100:.1f}%  saved=${usd}  total={sv.get('total')}")
  print(f"BM    {b['count_in_last_15_events']}/15  A6000={b['a6000_in_window']}  aborted={b['aborted_in_window']}  ages={b['recent_ages_min']}")
  if b['latest_summary']:
    print(f"      latest: {b['latest_summary'][:90]}")
  print(f"HOME  {out['critical_paths']['home_status']}")
PYEOF
