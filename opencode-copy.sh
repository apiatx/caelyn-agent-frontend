#!/usr/bin/env bash
set -e
cd /home/runner/workspace

if ! command -v opencode >/dev/null 2>&1; then
  echo "OpenCode is not installed in this Replit environment."
  echo "Install it with: npm install -g opencode-ai"
  exit 1
fi

exec opencode "$@"
