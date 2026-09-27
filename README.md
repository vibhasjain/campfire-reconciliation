# Campfire reconciliation prototype

A take-home for [Campfire](https://campfire.ai). Maya, a staff accountant, opens the September bank reconciliation on business day 3 of close. 207 lines are auto-matched and 14 are exceptions. The prototype helps her clear the exceptions quickly and confidently, and makes it obvious when she's done.

- **Live:** [campfire-reconciliation.netlify.app](https://campfire-reconciliation.netlify.app/version-control) — everything, versioned: [/v1](https://campfire-reconciliation.netlify.app/v1) Workbench · [/v2](https://campfire-reconciliation.netlify.app/v2) Paired ledger · [/v3](https://campfire-reconciliation.netlify.app/v3) Flow · [/story](https://campfire-reconciliation.netlify.app/story) · [/concepts](https://campfire-reconciliation.netlify.app/version-control#concepts) (Brilliant + Paper canvases) · [/references](https://campfire-reconciliation.netlify.app/references)
- **Notes:** [NOTES.md](NOTES.md) covers the time log, what I wouldn't ship, and what I don't fully understand.
- **Testing:** [UX-TEST.md](UX-TEST.md) has the automated flows and four usability rounds.
- **Transcript:** [transcript/](transcript/)

## Run it

```sh
npm install
npm run dev          # http://localhost:5173/v1 (also /v2, /v3, /story, /version-control)
npx tsx src/recon/store.check.ts   # data + store self-check: all 14 resolve to $0.00, reverts restore
npx tsx src/recon/flows.check.ts   # Ember flows, headless
node tests/flows.mjs --base http://localhost:4173   # browser flows via dev-browser (after npm run build && npm run preview)
```

Append `?fast` to a URL to skip the simulated delays. Work persists in localStorage; ⌘K → "Reset demo" starts over.

## Structure

- `src/recon/`: seed data (Arbor Analytics, Chase Operating ••4821, Sep 2026), the store with its action log and revert, suggestions, evidence, balance, done state, keymap, and page chat.
- `src/comments/`: per-transaction threads. This is a React port of the interaction model from [Komo](https://github.com/tjcages/komo) (MIT; see its LICENSE and NOTICE).
- `src/agent/`: the scripted Ember runtime and its reconciliation flows.
- `src/versions/v1|v2|v3/`: the three UX bets, built on the same core.
- `src/app/`, `src/components/`: an inert Campfire shell on top of my own design system.

Built with Claude Code and Codex. See the transcript.

Storyboard source docs and image-generation briefs live in `story-src/`.
