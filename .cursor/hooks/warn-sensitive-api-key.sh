#!/usr/bin/env bash
# warn-sensitive-api-key.sh — Block prompt submit if it looks like it contains an API key.
set -euo pipefail

INPUT_JSON="$(cat)"

python3 - "$INPUT_JSON" <<'PY'
import json
import re
import sys

payload = json.loads(sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read())
prompt = payload.get("prompt") or ""

# High-signal secret patterns (fake/test keys still match so you can verify the hook).
PATTERNS = [
    ("OpenAI / Anthropic style key", re.compile(r"\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b")),
    ("GitHub PAT", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b")),
    ("GitHub fine-grained PAT", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b")),
    ("AWS access key ID", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Stripe secret key", re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{20,}\b")),
    ("Bearer token", re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b", re.IGNORECASE)),
    ("Generic API key assignment", re.compile(
        r"(?i)\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|client[_-]?secret)\b\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{16,}"
    )),
]

hits = []
for label, pattern in PATTERNS:
    if pattern.search(prompt):
        hits.append(label)

if hits:
    kinds = ", ".join(dict.fromkeys(hits))
    message = (
        f"Possible secret detected in your prompt ({kinds}). "
        "Remove the key before submitting, or use an env var / secret manager instead."
    )
    print(json.dumps({"continue": False, "user_message": message}))
else:
    print(json.dumps({"continue": True}))
PY
