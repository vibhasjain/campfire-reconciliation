# Shared reconciliation core

Import from `@/recon` or the named component module; comments only from `@/comments`.
All amounts are integer cents. State is in memory; reload restores the fixture.
`src/versions/ReconScreen.tsx` is the reference composition for all three lanes.

## State

- `recon`: singleton framework-free store (`getState`, `subscribe`, mutations).
- `useRecon(selector)`, `useSummary()`, `useItem(id)`, `useQueue()`, `useReconciled()`.
- Queue: approval/judgment first, then absolute impact; includes touched exceptions
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
acceptLabel?, rejectLabel?})`: factors, evidence and entry preview; default actions.
- `SuggestionCarousel({itemId, size?, active?, onAccept?, onReject?})`: callbacks
  receive the active suggestion; visible index lives in `reconUi`.
- `EvidenceChip({attachmentId})`, `DocumentPreview({attachment})`: HTML documents.
- `ReconBalance({variant?: 'full'|'compact', className?})`: animated reconciliation.
- `DoneState()`: disabled completion before zero; confirm submits to Daniel.
- `PageChat()`, `ShortcutsDialog()`: mount once per version. Shell header opens chat
  and CommentsInbox. Page chat is 380×540 desktop, bottom sheet on phones.
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
  ? opens shortcuts; Escape closes the top layer. Editable/cmdk targets are ignored.
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
- Sandbox builds: export `CAMPFIRE_OUT_DIR=dist` for build and preview; deployment
  still defaults to `../campfire`. `npm run build`, `npm run lint`.
- Preview: `npm run preview -- --port 4802 --strictPort`; `/campfire1|2|3?fast`.

- Toasts sit above `var(--toast-offset)` (default 0). A version with a bottom-pinned bar sets it (e.g. on `document.body.style`) so toasts never cover its controls.
