#!/bin/sh
# Re-export the redacted session transcript from every Campfire session, oldest first.
# The take-home started in ~/Documents/cv (two sessions), then moved to this repo.
set -e
cd "$(git rev-parse --show-toplevel)"
P="$HOME/.claude/projects"
CV="$P/$(echo "$HOME/Documents/cv" | tr / -)"
HERE="$P/$(pwd -P | tr / -)"
python3 scripts/export-transcript.py transcript/session.md \
  "$CV/8cf6a44b-5c8b-4ad5-b575-d52d635d3abc.jsonl" \
  "$CV/4e78e90b-39a8-479d-9c2c-4044a9c254f9.jsonl" \
  $(ls -tr "$HERE"/*.jsonl)
