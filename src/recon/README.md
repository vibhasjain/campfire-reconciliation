# Shared reconciliation core

Import from `@/recon` or the named component module; comments only from `@/comments`.
All amounts are integer cents. State persists after 300ms in one localStorage snapshot per version path.
Recon, engine chats/messages/approvals, comments, and `reconUi.completed` restore
on reload. Interrupted streams finish; interrupted batch approvals are dismissed
and Daniel sign-offs resume. Storage errors fall back to fixtures. `?fast` never
reads or writes demo storage. “Reset demo” in ⌘K and “Start over” after submission
clear the current version snapshot and reload.
`src/versions/ReconScreen.tsx` is the reference composition for all three lanes.

## State

- `recon`: singleton framework-free store (`getState`, `subscribe`, mutations).
- `useRecon(selector)`, `useSummary()`, `useItem(id)`, `useQueue()`, `useReconciled()`.
- Queue: timing items (`in_transit` / `outstanding`) first, then other items by
  top-suggestion confidence descending, approval-gated
  items last; includes touched exceptions
  and reopened auto pairs. Resolved exceptions precede auto pairs in Reconciled.
- `reconUi.get()/set(updater)/subscribe`, `useReconUi(selector)` own selection,
  `selectedLines: {bank,book}`, `suggestionIndex`, `expandedWhy`, `threadFor`,
  `threadDraft`, `pageChatOpen`, `inboxOpen`, `shortcutsOpen`, `completed`.
- `window.__recon = { store: recon, ui: reconUi, summary: () => ... }` is the test API.
- `?fast` uses the single timing switch in `speed.ts`; tests can `setFastMode(true)`.

## Components

- `Money({cents, ...spanProps})`: right-aligned, tabular, parentheses, muted zero.
  `Delta` uses an explicit sign. `fmtMoney`, `fmtDate` are also exported.
- `LineRow({side: 'bank'|'book', lineId?, line?, className?})`: plain click selects
  the item; Command/Control/Shift-click toggles the line in `selectedLines`.
- `Suggestion({suggestion, size?: 'compact'|'full', active?, onAccept?, onReject?,
acceptLabel?, rejectLabel?, footer?})`: factors, evidence and entry preview; default actions.
- `SuggestionCarousel({itemId, size?, active?, onAccept?, onReject?})`: callbacks
  receive the active suggestion; visible index lives in `reconUi`.
- `EvidenceChip({attachmentId})`, `DocumentPreview({attachment})`: HTML documents.
- `ReconBalance({variant?: 'full'|'compact', className?})`: animated reconciliation.
- `DoneState()`: “Submit to Daniel”; disabled tooltip gives items left. Confirmation:
  “Submit this reconciliation to Daniel Kim for approval?”. After submission:
  “Submitted · waiting on Daniel” and disabled “Submitted”.
- `PageChat()`, `ShortcutsDialog()`: mount once per version. Shell header opens chat
  and CommentsInbox. Page chat is 380×540 desktop, bottom sheet on phones.
  Desktop right position is `calc(20px + var(--page-chat-offset, 0px))`;
  versions with right sheets set `--page-chat-offset` on a portal ancestor (body).
- `ReconCard({card})`: recon-candidate, recon-change, recon-item; agent dispatches it.

## Actions and keyboard

- `acceptSuggestion(itemId, suggestionId?)`, `rejectSuggestion(itemId, suggestionId?)`,
  `unreconcileItem(itemId)`, `matchSelection()`, `revertAction(actionId)` return `Result`.
- Defaults use Maya; scripts pass actor `ember`. Approval gates await Daniel's
  scripted reply. `flushApprovals()` lets checks await all pending approvals.
- Undo protects later edits; undoing an accepted approval also undoes its approval.
- `activeSuggestion(itemId)`, `cycleSuggestion(itemId, delta)`,
  `openItemThread(itemId, draft?)`, `useFlash(itemId)` support version controls.
- `useReconKeys({move(delta), enter?, cycle?, enabled?})` mounts once per version.
  Up/Down or K/J move; Left/Right cycle; Enter opens; A accepts; X rejects;
  U unreconciles; M matches; C opens/focuses comments; Cmd/Ctrl+E (J alias) toggles Ask Ember;
  ? opens shortcuts; Escape blurs a nonempty composer, then closes the top layer.
  Other shortcuts ignore editable/cmdk targets.
  Backtick, tilde and triple-click are reserved and never bound.

## Comments public boundary

- `ThreadView({itemId?, chatId?, variant?: 'popover'|'docked'|'sheet', className?})`.
  Use `chatId="page"` for Ember page chat; use `itemId` for comment threads.
- `ThreadPin({itemId, className?})` includes `ThreadPopover`; do not wrap twice.
- `ThreadPopover({itemId, children})` anchors a custom trigger.
- `CommentsInbox()`, `useUnreadCount()`, `toggleInbox()`, `focusThread(itemId,draft?)`.
- `postToThread(itemId,text,mentions?)` always posts Maya; Ember mentions/intents
  invoke the engine. Human mentions schedule teammate replies. Plain comments stay plain.
- `appendThreadMessage(itemId,text,author)`, `ensureThread`, `threadChatId`,
  `markThreadRead`, `setThreadResolved`, `reactTo`, `comments`, `useComments`.
- One lazy engine chat `thread:<itemId>`; the four fixture threads are seeded.
  Komo attribution, adapted types, pin stacks and motion stay in `src/comments`.

## Version test hooks and verification

- Item rows: `data-item-id`; line rows: `data-line-id`.
- Buttons: `data-action="accept|reject|unreconcile|match|comment"` as applicable.
- Keep `data-testid="difference|items-left|done|complete"` on their shared surfaces.
  Difference contains just formatted money; done exists only while summary.done.
- `npx tsx src/recon/store.check.ts` → ALL CHECKS PASSED.
- `npx tsx src/recon/flows.check.ts` → ALL FLOW CHECKS PASSED (real headless engine).
- `npx tsx src/recon/persistence.check.ts` checks reload, version isolation, fast
  bypass, blocked/corrupt storage, interrupted output and ID continuity.
- Sandbox builds: export `CAMPFIRE_OUT_DIR=dist` for build and preview; deployment
  still defaults to `../campfire`. `npm run build`, `npm run lint`.
- Preview: `npm run preview -- --port 4802 --strictPort`; `/campfire1|2|3?fast`.

- Toasts sit above `var(--toast-offset)` (default 0). A version with a bottom-pinned bar sets it (e.g. on `document.body.style`) so toasts never cover its controls.

## Usability contracts

- Meaning-bearing text wraps. Evidence labels may truncate. Expanded Why leads
  with each factor's label and detail plus a visual contribution bar (weight × score).
  One muted formula footnote shows the weights and final confidence.
- Full Suggestion shows “No change to the difference” for zero effect, otherwise
  “Difference → <fmtMoney(current difference + effect)>” above its actions.
  Effect in cents is `(inTransit ?? 0) - (outstanding ?? 0) - bookDelta`.
- Approval-gated accepts say “Send to Daniel”; toast “Sent to Daniel for approval”
  includes Undo. Pending status is “Awaiting Daniel”; approval toast is
  “Daniel approved · <item title>”.
- `nextOpenAfter(itemId): ReconItem | undefined` returns the next open queue item,
  wrapping and excluding the current item. Use its `.id` to advance selection.
- Successful Undo/Revert selects the restored item, flashes it, and toasts
  “Restored · <title>”. Conflicting later edits still block undo.
- ThreadView never autofocuses on mount or item/draft changes. C / `focusThread`
  and explicit clicks focus the composer. Accept blurs focus back to the page.
  Escape in a nonempty composer first blurs it; the next Escape closes the top
  layer. An empty composer blurs and closes its layer on the first Escape.
- Ember discovery collapses tool steps to “Searched the AP inbox, bills and GL ±30 days”.
  Item threads emit one compact `recon-change` addition with View / Revert.
  The item owns the active actionable suggestion with “Found by Ember”.
  Page chat retains the actionable `recon-candidate` card and Revert footer.
  Other mutations retain one change card each and completed tools collapse.
- Page answers use compact lists with six visible items then “and N more”, and
  close with the current difference. Live-state answers begin “As of <local time>”;
  changed revisions show “Out of date · Ask again”, resending the original question. Bulk review rows wrap and expand beyond six.
  `itemAmount` falls back to absolute top-suggestion bookDelta for items with no
  lines (r14: $1,150.00). Factor explanations use facts rather than wide tables.

- Counts append “· N with Daniel” only while approvals are pending.
- Overlay close restores focus to the main region synchronously; keyboard handling
  stays at window capture. Manual continuity check: open each evidence, shortcuts,
  thread, page-chat or sheet overlay, press Esc then immediately A/X/J/K; the first
  key must act on the selected item. Typing and open dialogs keep their own keys.
