# Notes: Campfire bank reconciliation take-home

> Draft for Vibhas to edit before sending.

## Links
- **Everything, versioned:** https://firecamp-recon.netlify.app/version-control
- **Prototypes:** https://firecamp-recon.netlify.app/v1 (Workbench) · /v2 (Paired ledger) · /v3 (Flow).
- **Storyboard (the opener):** https://firecamp-recon.netlify.app/story
- **Vector concepts:** the full Brilliant and Paper canvases under /concepts, and references at /references.
- **Source with commit history:** github.com/vibhasjain/campfire-reconciliation. It began inside my site repo and was split out with `git subtree`, so every commit is the real one. All later work happens here. The session transcript is in `transcript/`.
- **How I tested:** `UX-TEST.md` has automated flows plus usability rounds, with scores for each version.

## What I built, in one paragraph
Maya opens the September reconciliation on business day 3. 207 lines are auto-matched and 14 are exceptions. The 14 cover all nine of Campfire's own test scenarios, plus FX, duplicates and the two-$4,000-payments trap. Every exception comes with an AI suggestion (Ember): a confidence score, a one-line reason, and a "why" with the underlying facts.

Accepting is one key, and anything can be undone. Maya, her teammates and Ember share a thread on each transaction. When Ember changes something from a thread (surfaces a missing invoice, books a fee, edits a line), that change shows up in the thread with a Revert. The three versions share the data, the logic and the Campfire shell. What differs is the UX bet:
- **Workbench:** queue plus side sheet.
- **Paired ledger:** books and bank aligned side by side, with AI pairs pre-connected.
- **Flow:** one focused decision at a time.

## Time log (ET)
| When | What |
|---|---|
| Sep 26 | Read the brief. Collected references: Campfire's current reconciliation screens, Rillet and Numeric videos, and a reference deck. Recorded voice notes with the proposal. |
| Sep 27 13:05–13:49 | Planning with Claude Code: digested the references and made design decisions. |
| 13:49–14:27 | Captured Campfire's live tokens, nav and fonts (read-only). Forked my CRM design system and stripped it. Built the data model and store, with a self-check that all 14 resolve to $0.00. |
| 14:27–14:45 | Shared core: suggestions, evidence, threads (a port of Komo's interaction model), Ember's scripted flows, keymap. |
| 14:15–15:00 | In parallel: four vector concepts (two in Brilliant, two in Paper) and the storyboard deck. |
| 14:45–15:00 | The three versions, built in parallel. |
| 15:00–16:00 | Automated flow tests and three rounds of usability evaluation and fixes. |
| _fill in_ | Presentation prep. |

## What I wouldn't ship
- **Ember is scripted, not a model.** Its thread and page-chat behaviour comes from intent-matched scripts over a local store, so anything off-script falls back to a generic answer. Shipping it needs a real model calling ledger tools, with evals, permissions and a hard boundary on what it may post.
- **The confidence numbers aren't calibrated.** "93%" comes from hand-set weights times factor scores. Until it's calibrated against real accept/reject data, I'd show bands (High / Check / Low), not percentages. The evaluators said the precision felt less credible than the evidence.
- **Collaboration is simulated.** Daniel approves after a delay and Priya's replies are scripted. There's no real multiplayer sync, notifications, or permissions on who can approve or revert what.
- **Reverting posted entries needs controls.** In the prototype, Revert on an entry in a closed period just rolls the state back. The real version needs reversing entries, period locks and an audit trail.
- **The persistence is a demo convenience.** State lives in the browser's localStorage.
- **The phone layout is legible, but it's not the real use case.** On a phone I'd keep approvals and review, not the full reconciliation.
- **Scale is untested.** The 207 auto-matched pairs are paginated, but thousands of lines, many accounts, and statement import aren't handled.
- **Accessibility isn't done.** It's keyboard-first, the focus handling was tested, and screen-reader labels exist in most places, but there has been no formal pass.

## What the tool built that I kept but don't fully understand
- **The streaming agent runtime and the Tiptap composer.** Both come from my CRM design system (also AI-built). I know their contracts (`send`, the `status`/`step`/`say`/`card`/`approve` calls) better than their internals.
- **The spring physics behind the comment popover's motion.** This is Komo's `card-motion` (MIT, vendored).
- **The fixture generator.** It's a seeded random generator plus one balancing transfer, which makes 219 statement lines tie out exactly. I verified the totals with assertions rather than reading every generated line.
- **Parts of the v2 connector geometry.** This covers the many-to-one bracket and the cross-connected contractor pair.
- **The storyboard frames.** Codex generated them from my scene descriptions. I directed them and picked the results; I didn't draw them.
