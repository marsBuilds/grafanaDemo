#!/bin/bash

# audit.sh - Append hook JSON payloads to .cursor/audits/agent-audit.md (Markdown).

json_input=$(cat)
timestamp=$(date '+%Y-%m-%d %H:%M:%S')

# .cursor/audits is a sibling of .cursor/hooks (this script)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
AUDIT_DIR="${HOOK_DIR}/../audits"
LOG_FILE="${AUDIT_DIR}/agent-audit.md"

mkdir -p "$AUDIT_DIR"

if [[ ! -f "$LOG_FILE" ]]; then
  printf '# Cursor hook audit log\n\n' >> "$LOG_FILE"
fi

{
  printf '## %s\n\n```json\n' "$timestamp"
  printf '%s\n' "$json_input"
  printf '```\n\n'
} >> "$LOG_FILE"

exit 0
