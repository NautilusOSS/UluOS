#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
SERVICES_JSON="$REPO_ROOT/gateway/services.json"
PARENT_DIR="$(cd "$REPO_ROOT/.." && pwd)"

GIT_ORIGIN=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || echo "")
if [[ "$GIT_ORIGIN" == git@github.com:* ]]; then
  ORG=$(echo "$GIT_ORIGIN" | sed 's|git@github.com:||;s|/.*||')
  URL_PREFIX="git@github.com:${ORG}/"
  URL_SUFFIX=".git"
elif [[ "$GIT_ORIGIN" == https://github.com/* ]]; then
  ORG=$(echo "$GIT_ORIGIN" | sed 's|https://github.com/||;s|/.*||')
  URL_PREFIX="https://github.com/${ORG}/"
  URL_SUFFIX=".git"
else
  echo "Could not detect GitHub org from UluOS remote: $GIT_ORIGIN"
  echo "Set GITHUB_ORG env var to override (e.g. GITHUB_ORG=NautilusOSS)."
  ORG="${GITHUB_ORG:-}"
  if [ -z "$ORG" ]; then exit 1; fi
  URL_PREFIX="git@github.com:${ORG}/"
  URL_SUFFIX=".git"
fi

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

cloned=0
installed=0
skipped=0
failed=0

for REPO_NAME in $REPOS; do
  REPO_PATH="$PARENT_DIR/$REPO_NAME"

  if [ -d "$REPO_PATH" ]; then
    echo "  exists   $REPO_NAME"
  else
    REPO_URL="${URL_PREFIX}${REPO_NAME}${URL_SUFFIX}"
    echo "  clone    $REPO_NAME  ($REPO_URL)"
    if git clone "$REPO_URL" "$REPO_PATH" 2>/dev/null; then
      cloned=$((cloned + 1))
    else
      echo "  FAILED   could not clone $REPO_URL"
      failed=$((failed + 1))
      continue
    fi
  fi

  if [ -f "$REPO_PATH/package.json" ]; then
    if [ ! -d "$REPO_PATH/node_modules" ]; then
      echo "  install  $REPO_NAME"
      (cd "$REPO_PATH" && npm install --silent 2>/dev/null)
      installed=$((installed + 1))
    else
      skipped=$((skipped + 1))
    fi

    if node -e "const p=require('$REPO_PATH/package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" 2>/dev/null; then
      echo "  build    $REPO_NAME"
      if ! (cd "$REPO_PATH" && npm run build --silent 2>/dev/null); then
        echo "  FAILED   build failed for $REPO_NAME"
        failed=$((failed + 1))
      fi
    fi
  fi
done

# Also ensure gateway deps are installed
if [ -f "$REPO_ROOT/gateway/package.json" ] && [ ! -d "$REPO_ROOT/gateway/node_modules" ]; then
  echo "  install  gateway"
  (cd "$REPO_ROOT/gateway" && npm install --silent 2>/dev/null)
  installed=$((installed + 1))
fi

if [ -f "$REPO_ROOT/gateway/package.json" ] && \
   node -e "const p=require('$REPO_ROOT/gateway/package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" 2>/dev/null; then
  echo "  build    gateway"
  if ! (cd "$REPO_ROOT/gateway" && npm run build --silent 2>/dev/null); then
    echo "  FAILED   build failed for gateway"
    failed=$((failed + 1))
  fi
fi

# Register UluOS MCP server in global Cursor config
"$SCRIPT_DIR/setup-mcp.sh"

echo ""
echo "Done. cloned=$cloned  installed=$installed  skipped=$skipped  failed=$failed"
if [ $failed -gt 0 ]; then
  echo "Some repos failed to clone. Check access permissions or set GITHUB_ORG."
  exit 1
fi
