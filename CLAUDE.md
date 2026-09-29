# Campfire reconciliation take-home

Public repo, live at https://campfiredesign.netlify.app (Netlify site `campfiredesign`, renamed from `campfire-reconciliation`). Netlify's own builds are stopped (`stop_builds`) to save build minutes: every commit on `main` builds locally (from a clean worktree of the commit) and deploys to production through `scripts/deploy.sh`, run by `.git/hooks/post-commit`, which first folds in the latest transcript (re-create that hook on a fresh clone; `SKIP_DEPLOY=1` skips one). The owner reviews on the live site, not locally. Push straight to `main`; no feature branches or PRs. Commits use the GitHub noreply address (set in this repo's git config).

## What lives where
- `/`: the latest v1 prototype, always (same bundle as `/v1`).
- `/version-control`: the index of every artifact, newest first, design-system cards, arrow keys + Enter. **Every new artifact gets an entry in `src/site/versions.ts`.**
- `/v1`, `/v2`, `/v3`: the coded prototypes (Workbench, Paired ledger, Flow) built on the shared core in `src/recon`, `src/comments`, `src/agent`; each version in `src/versions/v1|v2|v3`.
- `/code/<version>/campfire1` (or `campfire2`, `campfire3`): frozen Code versions in `public/code/<version>/`, rebuilt from the Code commits in `src/site/versions.ts` with `node scripts/build-frozen.mjs`. The builder uses temporary detached worktrees, patches base-path routing and today's sidebar logo behavior, and builds without source maps or the historical SEO step. Run it explicitly before the normal build when refreshing snapshots; `npm run build` copies the saved outputs.
- `/story/`: the storyboard deck (static, `public/story/`); its working docs and image briefs live in `story-src/` (not served).
- `/concepts/<slug>/`: the Brilliant (A, B) and Paper (C, D) canvases as static HTML exports in `public/concepts/`. Never hand-edit those exports; page-level fixes (dark canvas, labels, zoom, home pill, legibility) are applied at build time by `scripts/seo.mjs`. `scripts/paper-to-html.mjs` re-renders Paper pages.
- `/references`: curated screenshots (`public/references`, data in `src/site/references.ts`). No personal info in any image.
- `transcript/session.md`: re-exported on every commit by the post-commit hook (`scripts/backup-transcript.sh` → `scripts/export-transcript.py`, amended into that commit before deploy); private redaction terms live in the gitignored `private/redact-terms.txt`.
- `private/`: gitignored local-only material. Never commit it.

## Build and checks
- `npm run build` (tsc, vite, then `scripts/seo.mjs`, which writes per-page titles, favicons and OG tags, and app-route HTML files). `npm run lint`.
- `npx tsx src/recon/store.check.ts`, `npx tsx src/recon/flows.check.ts`.
- `node tests/flows.mjs --base <url>`: 24 browser flow runs across the three versions (dev-browser).

## Rules
- Restraint: calm, opinionated, no information density, no explanatory copy. No focus rings or browser selected-state outlines anywhere (killed globally in `src/index.css`); hover and pressed states carry the UI. Light mode. Money is tabular and right-aligned, with negatives in parentheses.
- Zoom only on the canvases, and only through their own zoom; everything else loads `/no-zoom.js`.
- Everything should open instantly. Keep the version-control page's JS small, lazy-load the prototype, prefetch on intent, and keep images compressed.
- Every page keeps a home link to `/version-control` (the Campfire logo in the prototypes, the story title, the canvas pill).
- Netlify: keep `built_with_badge_enabled` off.
