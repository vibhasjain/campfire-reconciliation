#!/bin/sh
# Build the committed tree locally and publish it to production (Netlify's own builds are stopped to save build minutes).
# Builds from a temporary worktree of HEAD, so uncommitted edits never ship.
# Runs from .git/hooks/post-commit on every commit on main; skip once with SKIP_DEPLOY=1 git commit ...
set -e
cd "$(git rev-parse --show-toplevel)"
[ "$(git branch --show-current)" = main ] || exit 0
[ -n "$SKIP_DEPLOY" ] && exit 0
repo=$PWD
dir=$(mktemp -d)
trap 'git -C "$repo" worktree remove --force "$dir"' EXIT
git worktree add -q --detach "$dir" HEAD
ln -s "$repo/node_modules" "$dir/node_modules"
cd "$dir"
npm run build
netlify deploy --prod --no-build --dir dist --site bd9088df-342c-4a37-9938-889e17040d8c --message "$(git log -1 --format='%h %s')"
