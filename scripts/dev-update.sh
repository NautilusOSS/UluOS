#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
SERVICES_JSON="$REPO_ROOT/gateway/services.json"
PARENT_DIR="$(cd "$REPO_ROOT/.." && pwd)"

# ── Colors ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\033[0;32m' YELLOW='\033[0;33m' RED='\033[0;31m' CYAN='\033[0;36m' RESET='\033[0m'
else
  GREEN='' YELLOW='' RED='' CYAN='' RESET=''
fi

info()  { printf "${CYAN}  %-9s${RESET} %s\n" "$1" "$2"; }
ok()    { printf "${GREEN}  %-9s${RESET} %s\n" "$1" "$2"; }
warn()  { printf "${YELLOW}  %-9s${RESET} %s\n" "$1" "$2"; }
fail()  { printf "${RED}  %-9s${RESET} %s\n" "$1" "$2"; }

updated=0
installed=0
built=0
skipped=0
failed=0

# ── Pull a git repo, reinstall deps & rebuild if anything changed ─────
pull_and_refresh() {
  local name="$1" dir="$2"

  if [ ! -d "$dir/.git" ]; then
    warn "SKIP" "$name — not a git repo"
    skipped=$((skipped + 1))
    return
  fi

  local before after
  before=$(git -C "$dir" rev-parse HEAD 2>/dev/null)

  if ! git -C "$dir" pull --ff-only 2>/dev/null; then
    warn "DIVERGED" "$name — fast-forward failed, try manual merge/rebase"
    failed=$((failed + 1))
    return
  fi

  after=$(git -C "$dir" rev-parse HEAD 2>/dev/null)

  if [ "$before" = "$after" ]; then
    ok "UP-TO-DATE" "$name"
    skipped=$((skipped + 1))
    return
  fi

  ok "PULLED" "$name  $(echo "$before" | head -c 7)→$(echo "$after" | head -c 7)"
  updated=$((updated + 1))

  # Reinstall deps if package-lock changed
  if [ -f "$dir/package.json" ]; then
    if git -C "$dir" diff --name-only "$before" "$after" | grep -q 'package-lock.json\|package.json'; then
      info "INSTALL" "$name"
      (cd "$dir" && npm install --silent 2>/dev/null)
      installed=$((installed + 1))
    fi

    if node -e "const p=require('$dir/package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" 2>/dev/null; then
      info "BUILD" "$name"
      if (cd "$dir" && npm run build --silent 2>/dev/null); then
        built=$((built + 1))
      else
        fail "FAILED" "$name build"
        failed=$((failed + 1))
      fi
    fi
  fi
}

# ── 1. Update UluOS itself ───────────────────────────────────────────
echo ""
echo "Updating UluOS..."
echo ""
pull_and_refresh "UluOS" "$REPO_ROOT"

# ── 2. Discover and update child MCP repos ───────────────────────────
REPOS=$(node -e "
  const svc = require('$SERVICES_JSON');
  const seen = new Set();
  for (const s of svc.services) {
    const arg = (s.args || [])[0] || '';
    const match = arg.match(/^\\.\\.\\/([^/]+)\\//);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      console.log(match[1]);
    }
  }
")

if [ -n "$REPOS" ]; then
  echo ""
  echo "Updating MCP services..."
  echo ""
fi

for REPO_NAME in $REPOS; do
  REPO_PATH="$PARENT_DIR/$REPO_NAME"

  if [ ! -d "$REPO_PATH" ]; then
    warn "MISSING" "$REPO_NAME — run scripts/install-services.sh to clone"
    failed=$((failed + 1))
    continue
  fi

  pull_and_refresh "$REPO_NAME" "$REPO_PATH"
done

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "Done.  updated=$updated  installed=$installed  built=$built  skipped=$skipped  failed=$failed"

if [ $failed -gt 0 ]; then
  echo ""
  warn "NOTE" "Some repos had issues — see messages above."
  exit 1
fi
