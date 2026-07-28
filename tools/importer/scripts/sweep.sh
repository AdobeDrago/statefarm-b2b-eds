#!/bin/bash
# Scrapes and converts every URL in a list file to this project's
# default-content .plain.html format, via extract_detail_page.py, with a
# coverage-validation tripwire after each page.
#
# Usage: tools/importer/scripts/sweep.sh <urls-file> [log-file]
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SKILL_DIR="/Users/gallardo/.claude/plugins/cache/adobe-skills/aem-edge-delivery-services/1.0.0/skills/scrape-webpage"
SCRAPE_TMP="$(mktemp -d)"
EXTRACT_SCRIPT="$REPO_ROOT/tools/importer/scripts/extract_detail_page.py"
VALIDATE_SCRIPT="$REPO_ROOT/tools/importer/scripts/validate_coverage.py"
URLS_FILE="$1"
LOG_FILE="${2:-/tmp/sweep-$(basename "$URLS_FILE" .txt).log}"

cd "$REPO_ROOT" || exit 1
: > "$LOG_FILE"
trap 'rm -rf "$SCRAPE_TMP"' EXIT

while IFS= read -r url; do
  [ -z "$url" ] && continue

  doc_path="${url#https://b2b.statefarm.com}"          # /b2b-content/...
  rel_path="${doc_path#/b2b-content/}"                  # section/...
  out_path="$REPO_ROOT/b2b-content/${rel_path}.plain.html"
  mkdir -p "$(dirname "$out_path")"

  rm -rf "$SCRAPE_TMP"
  mkdir -p "$SCRAPE_TMP"
  echo "=== $url ===" | tee -a "$LOG_FILE"
  if ! node "$SKILL_DIR/scripts/analyze-webpage.js" "$url" --output "$SCRAPE_TMP" >> "$LOG_FILE" 2>&1; then
    echo "SCRAPE FAILED: $url" | tee -a "$LOG_FILE"
    continue
  fi

  if python3 "$EXTRACT_SCRIPT" "$SCRAPE_TMP/cleaned.html" "$SCRAPE_TMP/metadata.json" "$out_path" >> "$LOG_FILE" 2>&1; then
    echo "OK: $out_path" | tee -a "$LOG_FILE"
    python3 "$VALIDATE_SCRIPT" "$SCRAPE_TMP/cleaned.html" "$out_path" "$url" | tee -a "$LOG_FILE"
  else
    echo "EXTRACT FAILED (needs manual handling): $url" | tee -a "$LOG_FILE"
    rm -f "$out_path"
  fi

  sleep 1
done < "$URLS_FILE"

echo "=== SWEEP COMPLETE: $URLS_FILE ===" | tee -a "$LOG_FILE"
