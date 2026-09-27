# UX test log

How each round works:
- `node tests/flows.mjs` drives all three versions through six flows with dev-browser at `?fast`, with keyboard and mouse also at 390px: keyboard-only, mouse-first, "none of these match" in a thread, the Cascade many-to-one match, unreconcile then re-accept, and an Ember change followed by Revert.
- A usability evaluator per version (a Codex agent driving dev-browser at normal speed) plays Maya through the same tasks plus a phone pass, thinking aloud, then scores 1–5.

## Round 1 — 2026-09-27

### Automated flows (all pass after fix round 1)

| | Keyboard: keys to clear 14 | Mouse: clicks to clear 14 | Thread candidate | Many-to-one | Unreconcile | Ember change → Revert |
|---|---|---|---|---|---|---|
| v1 Workbench | 15 (3.6s) | 15 (4.2s) | ✓ | ✓ | ✓ | ✓ |
| v2 Paired ledger | 28 (4.6s) | 28 (17.6s) | ✓ | ✓ | ✓ | ✓ |
| v3 Flow | 14 (3.4s) | 14 (3.9s) | ✓ | ✓ | ✓ | ✓ |

The first test pass found two real bugs, both fixed in fix round 1:
- In v1 and v2, when Ember resolved an item from its thread, the thread and its Revert card vanished with the row.
- In v3, the Undo toast covered the pinned Accept button on phones.

### Evaluator scores (1–5)

| | Speed | Clarity | Confidence | AI trust | Fluidity | Done-ness | Phone | Restraint |
|---|---|---|---|---|---|---|---|---|
| v1 Workbench | 4 | 3 | 3 | 3 | 4 | 3 | 3 | 4 |
| v2 Paired ledger | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 3 |
| v3 Flow | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 4 |

### Confusion shared across versions (fixed in the core)
- The reasoning line gets cut off, on desktop and phone alike.
- "Why" opens with weighted arithmetic. Maya wants the accounting facts first.
- Ember shows the found candidate twice, with raw search logs around it.
- The "what's left?" table overflows the page chat, and the beginning-balance item shows $0.00 instead of $1,150.
- Approval items toast "Accepted" while they are still waiting on Daniel.
- "Complete reconciliation" turns into "Submit for review", so the wording changes halfway through the action.
- Undo doesn't bring back the item it restored.
- Esc inside the composer doesn't close the chat.

### Confusion by version
- **v1:** the queue opens on approval items, so where to start isn't obvious. On phones, row names truncate.
- **v2:** after an accept, J jumps back to the first open item. J then Enter doesn't open the row. A green connector dot reads as "already matched", and the statement label doesn't say it's adjusted. On phones, Accept sits below the fold.
- **v3:** the thread composer takes focus after the view advances, so pressing A types an "a". Advancing goes to the earliest open item instead of the next one. Undo leaves the wrong card on screen. On phones, the reasoning truncates.
