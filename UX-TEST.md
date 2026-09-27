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

## Round 3 — after fix round 3

### Automated flows: 24/24 pass
The thread flow now also checks that the accepted suggestion is the one Ember found. It's accepted with Esc then A, so the same run proves the keyboard continuity fix.

### Evaluator scores (1–5)

| | Speed | Clarity | Confidence | AI trust | Fluidity | Done-ness | Phone | Restraint |
|---|---|---|---|---|---|---|---|---|
| v1 Workbench | 4 | 4 | 4 | 3 | **5** | **2** | 4 | 4 |
| v2 Paired ledger | 4 | 4 | 4 | 4 | 4 | **3** | 4 | 4 |
| v3 Flow | 4 | 4 | 4 | 4 | **5** | **5** | 4 | 4 |

### Found and fixed after round 3
- **v1 done state rendered empty.** A local CSS override hid the core `DoneState` after its markup changed. Same cause for **v2**, where a CSS `:after` hack kept the headline on "Reconciled" after submission. Fix: the core `DoneState` gained a `compact` variant, and both hacks are deleted.
- **Phone toasts covered the next card's Accept or Reject** in v2 and v3. Fix: on phones, toasts now sit at the top under the header.
- **"What's left?" showed the beginning-balance item as $1,150.00** while the rows show ($1,150.00). Fix: `itemAmount` is signed everywhere.

### Left as designed
Evaluators keep calling the confidence formula "decorative". The owner asked for a formula-level why, so it stays, as a footnote under the facts. NOTES.md says I'd ship confidence bands instead of percentages until they're calibrated.

## Round 4 — v1 and v2 re-checked after the round 3 fixes (v3 had already passed)

| | Speed | Clarity | Confidence | AI trust | Fluidity | Done-ness | Phone | Restraint |
|---|---|---|---|---|---|---|---|---|
| v1 Workbench | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 |
| v2 Paired ledger | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 |

### Tweaks after round 4 (flows still 24/24)
- **AI trust.** The "why" footnote now says how the score has held up: "Last quarter, 97% of suggestions scored 90%+ were accepted." The formula stays below it. The calibration figures are fixture data; the real ones would come from each entity's accept/reject history.
- **Done-ness.** Before submitting, the done block says "Balanced · ready to submit", so "Reconciled" no longer overstates it.
- **Phone.** Only the newest toast shows, so a stack of toasts can't cover the progress line. On v2, auto-advance leaves room for the sticky summary when it scrolls to the next row.
- **Known edge case.** Resizing v1 from desktop to phone width without reloading leaves a gap on the left. Loading it at phone width is fine.

## Cross-version comparison (for the demo)

| | v1 Workbench | v2 Paired ledger | v3 Flow |
|---|---|---|---|
| The bet | Familiar triage: a queue plus a side sheet | Read across: books and bank aligned, with AI pairs pre-connected | One decision at a time |
| Keys to clear 14 (test, `?fast`) | 14 | 15 | 14 |
| Clicks to clear 14 | 15 | 15 | 14 |
| Mouse time to clear 14 (test) | 4.2s | 14.3s (every item expands inline) | 3.9s |
| Best at | Scanning and batching; the familiar table | Many-to-one and payee pairing, visible at a glance; closest to Campfire's two panes today | Speed, focus, and the clearest "done" (done-ness 5/5 in round 3) |
| Weakest at | Needs two surfaces, the table and the sheet | Slowest with a mouse; densest on a phone | Less overview (the "All exceptions" list is one key away) |
| Final evaluator scores | 3–4 (AI trust 3, phone 3) | 3–4 (AI trust 3, phone 3) | all 4–5 |

**Recommendation.** Ship v3's flow as the default. Keep v1's table as its overview view: the rail's "All exceptions" list already heads that way. Borrow v2's pre-aligned pairing for the many-to-one and name-pairing items.
