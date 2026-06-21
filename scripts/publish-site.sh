#!/usr/bin/env bash
#
# Publish the static site to here.now.
#
# Stages only the runtime files (index.html + html/js/styles/store/assets) into a
# temp folder and publishes that, so node_modules/.git/ts/etc. are never shipped
# (publishing the repo root sweeps in node_modules -> "curl: Argument list too long").
#
# Usage:
#   ./scripts/publish-site.sh            # update the saved slug (or create on first run)
#   ./scripts/publish-site.sh <slug>     # publish to a specific slug
#
# Requires the here.now skill's publish.sh and a saved API key (~/.herenow/credentials).

set -euo pipefail

# Resolve repo root (this script lives in <root>/scripts/)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PUBLISH_SH="${HERENOW_PUBLISH_SH:-$HOME/.agents/skills/here-now/scripts/publish.sh}"
if [[ ! -x "$PUBLISH_SH" ]]; then
  echo "error: here.now publish.sh not found at $PUBLISH_SH" >&2
  echo "       install the skill or set HERENOW_PUBLISH_SH to its path." >&2
  exit 1
fi

# Slug: 1st arg, else the one saved from a previous publish in .herenow/state.json.
SLUG="${1:-}"
if [[ -z "$SLUG" && -f ".herenow/state.json" ]] && command -v jq >/dev/null 2>&1; then
  SLUG="$(jq -r '.publishes | keys[0] // empty' .herenow/state.json)"
fi

# Files the live site actually needs.
ITEMS=(index.html serve.json html js styles store assets)

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

for item in "${ITEMS[@]}"; do
  [[ -e "$item" ]] && cp -r "$item" "$STAGE/"
done

echo "staged $(find "$STAGE" -type f | wc -l) files ($(du -sh "$STAGE" | cut -f1))" >&2

if [[ -n "$SLUG" ]]; then
  "$PUBLISH_SH" "$STAGE" --slug "$SLUG" --client copilot
else
  echo "no slug found; creating a new site..." >&2
  "$PUBLISH_SH" "$STAGE" --client copilot
fi
