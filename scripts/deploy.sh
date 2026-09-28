#!/bin/sh
# Build locally and publish dist to production (Netlify's own builds are stopped to save build minutes).
# Runs from .git/hooks/post-commit on every commit on main; skip once with SKIP_DEPLOY=1 git commit ...
set -e
cd "$(git rev-parse --show-toplevel)"
[ "$(git branch --show-current)" = main ] || exit 0
[ -n "$SKIP_DEPLOY" ] && exit 0
npm run build
netlify deploy --prod --no-build --dir dist --message "$(git log -1 --format='%h %s')"
