# Campfire reconciliation take-home

Public repo, deployed by Netlify (site `campfire-reconciliation`) on every push to `main`: https://campfire-reconciliation.netlify.app. Push straight to `main`; no feature branches or PRs. Commits use the GitHub noreply address (set in this repo's git config).

## What lives where
- `/` → `/version-control`: the index of every artifact, newest first, design-system cards, arrow keys + Enter. **Every new artifact gets an entry in `src/site/versions.ts`.**
- `/v1`, `/v2`, `/v3`: the coded prototypes (Workbench, Paired ledger, Flow) built on the shared core in `src/recon`, `src/comments`, `src/agent`; each version in `src/versions/v1|v2|v3`. Older Code versions are frozen alias deploys (`code-1-0--campfire-reconciliation.netlify.app/campfire1` …).
- `/story/`: the storyboard deck (static, `public/story/`); its working docs and image briefs live in `story-src/` (not served).
- `/concepts/<slug>/`: the Brilliant (A, B) and Paper (C, D) canvases as static HTML exports in `public/concepts/`. Never hand-edit those exports; page-level fixes (dark canvas, labels, zoom, home pill, legibility) are applied at build time by `scripts/seo.mjs`. `scripts/paper-to-html.mjs` re-renders Paper pages.
- `/references`: curated screenshots (`public/references`, data in `src/site/references.ts`). No personal info in any image.
- `transcript/session.md`: exported with `scripts/export-transcript.py`; private redaction terms live in the gitignored `private/redact-terms.txt`.
- `private/`: gitignored local-only material. Never commit it.

## Build and checks
- `npm run build` (tsc, vite, then `scripts/seo.mjs`, which writes per-page titles, favicons and OG tags, and app-route HTML files). `npm run lint`.
- `npx tsx src/recon/store.check.ts`, `npx tsx src/recon/flows.check.ts`, `npx tsx src/recon/persistence.check.ts`.
- `node tests/flows.mjs --base <url>`: 24 browser flow runs across the three versions (dev-browser).

## Rules
- Restraint: calm, opinionated, no information density, no explanatory copy. Light mode. Money is tabular and right-aligned, with negatives in parentheses.
- Zoom only on the canvases, and only through their own zoom; everything else loads `/no-zoom.js`.
- Everything should open instantly. Keep the version-control page's JS small, lazy-load the prototype, prefetch on intent, and keep images compressed.
- Every page keeps a home link to `/version-control` (the Campfire logo in the prototypes, the story title, the canvas pill).
- Netlify: keep `built_with_badge_enabled` off.
