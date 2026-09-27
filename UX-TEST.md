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

## Round 2 — after fix rounds 1 and 2

### Automated flows: 24/24 pass

| | Keyboard: keys to clear 14 | Mouse: clicks to clear 14 |
|---|---|---|
| v1 Workbench | 14 (3.5s) | 15 (4.2s) |
| v2 Paired ledger | 15 (3.6s; was 28) | 15 (14.3s; was 28 clicks) |
| v3 Flow | 14 (3.5s) | 14 (3.9s) |

### Evaluator scores (1–5)

| | Speed | Clarity | Confidence | AI trust | Fluidity | Done-ness | Phone | Restraint |
|---|---|---|---|---|---|---|---|---|
| v1 Workbench | 4 | 4 | 4 | 4 | 4 | **3** | 4 | 4 |
| v2 Paired ledger | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
| v3 Flow | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |

### Still open (going into round 3)
- A reload loses resolutions, approvals and the submission. All three evaluators flagged it.
- The final action's wording. "Mark complete" still surprises Maya because it starts Daniel's approval; the evaluators expect "Submit".
- On Notion, the found proposal appears twice: in the item and in the thread.
- After Esc closes an overlay, the first keypress is lost.
- The "what's left?" answer carries no timestamp, so reopening the chat shows it as if it were current.
- Some accepts move the difference away from zero, because the $86,400 deposit in transit sits late in the queue.
- By version:
  - **v1:** the heading still says "Ready for review" after submitting, and phone rows show only the glyph with no action label.
  - **v2:** stacked phone rows have no side labels, and the fee reasoning copy contradicts itself.
  - **v3:** the rail's link is called "All 14", and the phone breadcrumb cuts off "••4821".
