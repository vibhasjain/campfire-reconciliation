import { db } from "@/data/store"
import {
  send,
  isRunning,
  isAwaitingApproval,
  resolveApproval,
} from "@/agent/engine"
import {
  discoverCandidates,
  bookFee,
  editFromInstruction,
  compactItems,
} from "@/agent/scripts/recon"
import { comments, postToThread, seedThreads } from "@/comments"
import {
  acceptSuggestion,
  rejectSuggestion,
  unreconcileItem,
  matchSelection,
  revertAction,
  flushApprovals,
} from "./actions"
import {
  recon,
  reconUi,
  queueItems,
  nextOpenAfter,
  reconciledItems,
} from "./useRecon"
import { summarize } from "./store"
import { emberExchanges, emberFollowUps } from "./data"
import { setFastMode } from "./speed"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function ok(result: { ok: boolean; reason?: string }, message: string) {
  assert(result.ok, `${message}: ${result.reason ?? "failed"}`)
}
async function until(check: () => boolean, label: string, timeout = 5000) {
  const started = Date.now()
  while (!check()) {
    if (Date.now() - started > timeout) throw new Error(`Timed out: ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
function reset() {
  recon.reset()
  reconUi.set((state) => ({
    ...state,
    selectedItemId: null,
    selectedLines: { bank: [], book: [] },
    suggestionIndex: {},
    completed: false,
  }))
}
// Fixture hydration must preserve sparse inbox rows and leave demo follow-ups untouched.
const seededMessages = Object.values(db.get().messages).filter(message => message.chatId.startsWith("thread:"))
assert(Object.keys(comments.get().threads).length === 19 && seededMessages.length === 23, "Sparse seed hydrates nineteen threads and twenty-three messages")
assert(Object.values(comments.get().threads).filter(thread => !thread.resolved).length === 7, "Only review conversations enter the open inbox")
assert(Object.values(comments.get().unread).every(count => count === 0) &&
  Object.values(comments.get().emberUnread).every(value => !value), "Historical notes do not create unread badges")
for (const id of ["r02", "r09", "r11"])
  assert(!comments.get().threads[`thread:${id}`] && !db.get().chats[`thread:${id}`], "Live-demo items have no seeded pin or chat")
assert(!recon.getState().actions.some(action => action.kind === "addSuggestion"), "Seeds do not consume follow-up suggestions")
seedThreads()
assert(Object.values(db.get().messages).filter(message => message.chatId.startsWith("thread:")).length === 23, "Seed hydration is idempotent")

setFastMode(true)
reset()
function latestEmber(thread: string) {
  return Object.values(db.get().messages).filter(m => m.chatId === thread && m.author === "ember").at(-1)
}
async function exchange(itemId: string, expected: string, text = "[[agent:ember]]") {
  const thread = await postToThread(itemId, text, [{ type: "agent", id: "ember" }])
  await until(() => !isRunning(thread), `Ember reply for ${itemId}`)
  assert(latestEmber(thread)?.parts.some(p => p.type === "text" && p.markdown === expected), `Expected reply: ${expected}`)
  return thread
}
const suggestionReply = (itemId: string) => `Here's a new suggestion: ${emberFollowUps[itemId].title}. It's up top.`
const teammateAsk = (itemId: string) => `[[member:${emberExchanges[itemId].teammate}]] ${emberExchanges[itemId].ask}`
const pendingIds = Object.values(recon.getState().items).filter(item => item.kind === "exception").map(item => item.id)
assert(pendingIds.length === 14 && pendingIds.every(id => emberExchanges[id]), "All fourteen pending items have exchange copy")
// The first four E + Enter turns on Datadog, then each other item, loop in order.
for (const itemId of ["r11", ...pendingIds.filter(id => id !== "r11")]) {
  const original = recon.getState().items[itemId].suggestions
  const copy = emberExchanges[itemId]
  reconUi.set(state => ({ ...state, suggestionIndex: { [itemId]: original.length - 1 } }))
  await exchange(itemId, suggestionReply(itemId))
  const added = recon.getState().items[itemId].suggestions
  assert(added.length === original.length + 1 && added[0].id === `${itemId}-ember-follow-up`, "Suggestion turn prepends exactly one follow-up")
  assert(added.slice(1).every((candidate, i) => candidate.id === original[i].id), "Original suggestions retain their order")
  assert(reconUi.get().suggestionIndex[itemId] === 0, "New follow-up is selected for its pop-in")
  await exchange(itemId, copy.answer)
  assert(copy.answer !== added[0].reasoning, "Answer supplies supporting detail instead of repeating the proposal")
  const before = Object.keys(db.get().messages)
  const thread = await exchange(itemId, teammateAsk(itemId))
  const teammate = Object.values(db.get().messages).filter(m => !before.includes(m.id) && m.chatId === thread && m.author === copy.teammate)
  assert(teammate.length === 1 && teammate[0].text === copy.reply && teammate[0].role === "user", "Teammate posts one normal thread message")
  assert(Date.parse(teammate[0].createdAt) >= Date.parse(latestEmber(thread)!.createdAt), "Teammate follows Ember’s ask")
  await exchange(itemId, copy.history)
  assert(recon.getState().items[itemId].suggestions.length === added.length, "Answer, teammate and history add no suggestions")
  ok(acceptSuggestion(itemId), "Accept the new follow-up through the shared action")
  await flushApprovals()
  assert(recon.getState().items[itemId].status === "resolved", "Follow-up acceptance resolves the item")
}
assert(summarize(recon.getState()).done, "All follow-ups preserve the reconciled balance")
reset()
// Switching threads shares the cursor; typed instructions cannot divert the cycle.
await exchange("r11", `Got it. ${suggestionReply("r11")}`, "@Ember find another candidate")
await exchange("r07", emberExchanges.r07.answer, "@Ember book this as a bank fee")
await exchange("r08", teammateAsk("r08"), "@Ember explain the confidence")
await exchange("r04", emberExchanges.r04.history, "@Ember none of these match")
assert(recon.getState().actions.filter(action => action.kind === "addSuggestion").length === 1, "Only the suggestion slot changes reconciliation")
// Looping onto an item with a follow-up consumes the suggestion slot and answers.
await exchange("r11", emberExchanges.r11.answer, "@Ember")
await exchange("r11", teammateAsk("r11"))
await exchange("r11", emberExchanges.r11.history)
assert(recon.getState().items.r11.suggestions.filter(s => s.id === "r11-ember-follow-up").length === 1, "Loop does not duplicate the follow-up")
reset()
// Rejection and undo must not recreate a follow-up when the cycle loops.
for (const undo of [false, true]) {
  await exchange("r02", suggestionReply("r02"))
  if (undo) ok(revertAction(recon.getState().actions.at(-1)!.id), "Undo follow-up")
  else ok(rejectSuggestion("r02"), "Reject follow-up")
  const count = recon.getState().items.r02.suggestions.length
  await exchange("r02", emberExchanges.r02.answer)
  await exchange("r02", teammateAsk("r02"))
  await exchange("r02", emberExchanges.r02.history)
  await exchange("r02", emberExchanges.r02.answer)
  assert(recon.getState().items.r02.suggestions.length === count, "Removed follow-up is not recreated")
  await exchange("r02", teammateAsk("r02"))
  await exchange("r02", emberExchanges.r02.history)
  reset()
}
const queue = queueItems(recon.getState())
assert(queue[0].id === "r06" && queue[1].id === "r05", "Timing adjustments lead the queue")
const routine = queue.filter(
  (item) => !item.suggestions.some((s) => s.approval)
)
assert(
  queue
    .slice(0, routine.length)
    .every((item) => !item.suggestions.some((s) => s.approval)),
  "Routine work precedes approval gates"
)
assert(
  routine.slice(2).every(
    (item, i) =>
      i === 0 ||
      routine.slice(2)[i - 1].suggestions[0].confidence >= item.suggestions[0].confidence
  ),
  "Routine confidence descends"
)
assert(nextOpenAfter(queue.at(-1)!.id)?.id === queue[0].id, "Next open wraps")
ok(acceptSuggestion(queue[0].id), "Accept queue head")
assert(
  nextOpenAfter(queue[0].id)?.id === queue[1].id,
  "Next open advances from accepted item"
)
assert(
  compactItems([recon.getState().items.r14]).includes("$1,150.00"),
  "Beginning discrepancy uses book delta"
)
assert(
  compactItems(queue).startsWith("14 items remain, starting with ") &&
    !compactItems(queue).includes("\n"),
  "Remaining items use one sentence with a count and the next item"
)
reset()
assert(
  queueItems(recon.getState()).length === 14,
  "Queue starts with all 14 exceptions"
)
for (const item of Object.values(recon.getState().items).filter(
  (item) => item.kind === "exception"
))
  ok(acceptSuggestion(item.id), `Accept ${item.id}`)
await flushApprovals()
const completed = summarize(recon.getState())
assert(
  completed.done &&
    completed.resolved === 14 &&
    completed.autoMatched === 207 &&
    completed.adjustedBank === 902986658,
  "All 14 actions and Daniel approvals reconcile to the expected balance"
)
assert(
  reconciledItems(recon.getState())
    .slice(0, 14)
    .every((item) => item.kind === "exception"),
  "Resolved exceptions precede auto pairs"
)
reconUi.set((state) => ({ ...state, completed: true }))
ok(unreconcileItem("r01"), "Reopen a submitted reconciliation")
assert(!reconUi.get().completed, "A new action invalidates the submitted state")
reconUi.set((state) => ({ ...state, completed: true }))
recon.reset()
assert(!reconUi.get().completed, "Reset invalidates the submitted state")

reset()
const gated = acceptSuggestion("r08")
assert(
  gated.ok && recon.getState().items.r08.status === "awaiting_approval",
  "Gated acceptance waits for Daniel"
)
await flushApprovals()
assert(
  recon.getState().items.r08.status === "resolved",
  "Daniel resolves a gated acceptance"
)
ok(revertAction(gated.actionId), "Undo gated acceptance after approval")
assert(
  recon.getState().items.r08.status === "open",
  "Undo also reverses the automatic approval"
)
const interrupted = acceptSuggestion("r08")
assert(interrupted.ok, "Accept for cancellation check")
ok(revertAction(interrupted.actionId), "Undo before Daniel responds")
await flushApprovals()
assert(
  recon.getState().items.r08.status === "open",
  "A canceled request cannot be approved later"
)
reset()
ok(acceptSuggestion("r08"), "Start a request before resetting")
recon.reset()
ok(acceptSuggestion("r08"), "Accept again after resetting action IDs")
await flushApprovals()
assert(
  recon.getState().actions.filter((action) => action.kind === "approve")
    .length === 1,
  "A stale request cannot approve a replacement acceptance"
)

reset()
reconUi.set((state) => ({ ...state, suggestionIndex: { r02: 1 } }))
ok(rejectSuggestion("r02"), "Reject active alternate")
assert(
  recon.getState().items.r02.suggestions.length === 1,
  "Reject hides only the active candidate"
)
ok(acceptSuggestion("r02"), "Accept clamps a stale carousel index")
reset()
const fee = bookFee("r02")
ok(fee, "Bank-only fee helper runs headlessly")
assert(
  recon.getState().actions.at(-1)?.actor === "ember",
  "Scripted mutation is attributed to Ember"
)

reset()
reconUi.set((state) => ({
  ...state,
  selectedItemId: "r08",
  selectedLines: { bank: ["r08-bank"], book: ["r08-book"] },
}))
const mismatch = matchSelection()
assert(
  !mismatch.ok && mismatch.delta === -2500,
  "Manual mismatches expose the exact cent delta"
)
assert(
  recon.getState().actions.length === 0,
  "Manual mismatch does not mutate reconciliation"
)
reconUi.set((state) => ({
  ...state,
  selectedLines: {
    bank: ["r12-bank"],
    book: [...recon.getState().items.r12.bookIds],
  },
}))
ok(matchSelection(), "Manual many-to-one match")
assert(
  recon.getState().items.r12.status === "resolved",
  "Selected Cascade lines fully resolve"
)
const auto = recon.findAuto({ date: "2026-09-28", text: "stripe" })[0]
assert(auto, "Stripe payout is discoverable")
const reopened = unreconcileItem(auto.id)
assert(reopened.ok, "Auto pair can be unreconciled")
assert(
  queueItems(recon.getState()).some((item) => item.id === auto.id),
  "Reopened auto pair joins queue"
)
ok(revertAction(reopened.actionId), "Undo auto unreconcile")

reset()
const accepted = acceptSuggestion("r01")
assert(accepted.ok, "Accepted action available for conflict check")
const edited = editFromInstruction("r01", "the date should be 9/15")
assert(edited.ok, "Natural date edit is supported")
const blocked = revertAction(accepted.actionId)
assert(
  !blocked.ok && blocked.reason.includes("later action"),
  "Undo preserves a later overlapping edit"
)
ok(revertAction(edited.actionId), "Undo line edit")
ok(revertAction(accepted.actionId), "Undo acceptance after the dependent edit")

reset()
const discovery = discoverCandidates("r04")
assert(
  discovery.candidates.some(
    (candidate) => candidate.invoiceNumber === "NTN-88213"
  ),
  "Pure discovery finds the Notion invoice"
)
assert(
  discovery.actions.length === 2 &&
    discovery.actions.every((action) => action.actor === "ember"),
  "Discovery and addSuggestion each record Ember actions"
)
ok(
  rejectSuggestion("r04", discovery.candidates[0].id),
  "Reject the surfaced invoice"
)
assert(
  discoverCandidates("r04").candidates.length === 0 &&
    !recon
      .getState()
      .items.r04.suggestions.some(
        (candidate) => candidate.invoiceNumber === "NTN-88213"
      ),
  "A rejected hidden candidate is not resurrected by another search"
)
reset()
// Explicit tool discovery remains available in page chat with item context.
const thread = send({
  chatId: "page-discovery",
  text: "@ember none of these match",
  mentions: [],
  attachments: [],
  context: [{ type: "reconItem", id: "r04" }],
})
await until(() => !isRunning(thread), "Notion page reply")
assert(recon.getState().items.r04.suggestions.some(candidate => candidate.id === "r04-invoice-NTN-88213"), "Page engine path surfaces NTN-88213")
const turns = Object.values(db.get().messages).filter(
  (message) => message.chatId === thread
)
assert(
  turns.filter((message) => message.text === "@ember none of these match")
    .length === 1,
  "Engine adds Maya’s message once"
)
assert(
  turns.some(
    (message) =>
      message.author === "ember" &&
      message.parts.some(
        (part) => part.type === "card" && part.card.kind === "recon-candidate"
      )
  ),
  "Ember emits a reversible candidate in page chat"
)
assert(recon.getState().items.r04.suggestions[reconUi.get().suggestionIndex.r04].invoiceNumber === "NTN-88213", "Discovered invoice is active")
const candidateReply = turns.find(
  (message) =>
    message.author === "ember" &&
    message.parts.some(
      (part) => part.type === "card" && part.card.kind === "recon-candidate"
    )
)!
assert(
  candidateReply.parts.filter((part) => part.type === "card").length === 1,
  "Discovery emits one outcome card"
)
const candidatePart = candidateReply.parts.find(
  (part) => part.type === "card" && part.card.kind === "recon-candidate"
)!
assert(
  candidatePart.type === "card" &&
    "actionId" in candidatePart.card &&
    typeof candidatePart.card.actionId === "string",
  "Candidate carries its reversible addition"
)
ok(revertAction(candidatePart.card.actionId), "Revert candidate addition")
assert(
  reconUi.get().selectedItemId === "r04",
  "Revert selects the restored item"
)
assert(
  !recon
    .getState()
    .items.r04.suggestions.some(
      (candidate) => candidate.id === "r04-invoice-NTN-88213"
    ),
  "Revert removes the added candidate"
)
assert(
  candidateReply.parts.some(
    (part) =>
      part.type === "steps" &&
      part.status === "Searched the AP inbox, bills and GL ±30 days"
  ),
  "Discovery steps collapse to a past-tense summary"
)

reset()
const eligible = Object.values(recon.getState().items).filter(
  (item) => item.status === "open" && item.suggestions[0]?.confidence >= 90
)
const page = send({
  chatId: "page",
  text: "accept everything above 90%",
  mentions: [],
  attachments: [],
  context: [],
})
await until(
  () =>
    Object.values(db.get().approvals).some(
      (approval) => approval.chatId === page && isAwaitingApproval(approval.id)
    ),
  "Batch review card"
)
const approval = Object.values(db.get().approvals).find(
  (approval) => approval.chatId === page && isAwaitingApproval(approval.id)
)!
assert(
  approval.rows.length === eligible.length,
  "Batch review contains exactly the eligible suggestions"
)
assert(
  recon.getState().actions.length === 0,
  "Batch waits for explicit approval before mutating"
)
ok(
  rejectSuggestion("r02", recon.getState().items.r02.suggestions[0].id),
  "Reject a reviewed candidate while batch approval is pending"
)
resolveApproval(approval.id, "all", "approve")
await until(() => !isRunning(page), "Approved batch")
assert(
  eligible
    .filter((item) => item.id !== "r02")
    .every((item) => recon.getState().items[item.id].status === "resolved"),
  "Approved batch completes unchanged reviewed suggestions"
)
assert(
  recon.getState().items.r02.status === "open" &&
    recon.getState().items.r02.suggestions[0].confidence < 90,
  "Batch never substitutes a new lower-confidence candidate for the one reviewed"
)
const closing = Object.values(db.get().messages)
  .filter((message) => message.chatId === page && message.role === "assistant")
  .at(-1)
  ?.parts.at(-1)
assert(
  closing?.type === "text" &&
    closing.markdown.includes("(As of ") && closing.markdown.includes(`Accepted ${eligible.length - 1} suggestions.`),
  "Batch reports the actual number accepted"
)
assert(
  recon
    .getState()
    .actions.filter((action) => action.kind === "accept")
    .every((action) => action.actor === "ember"),
  "Batch actions are attributed to Ember"
)

await flushApprovals()
reset()
const summaryChat = send({ chatId: "page", text: "what's left?", mentions: [], attachments: [], context: [] })
await until(() => !isRunning(summaryChat), "Live summary")
const summaryPart = Object.values(db.get().messages).filter(m => m.chatId === summaryChat && m.role === "assistant").at(-1)?.parts.at(-1)
assert(summaryPart?.type === "text" && /\(As of \d{1,2}:\d{2} [AP]M\)$/.test(summaryPart.markdown), "Live answer ends with local time")
assert(summaryPart.snapshot?.question === "what's left?" && summaryPart.snapshot.clock === recon.getState().clock, "Snapshot retains exact question and revision")
ok(acceptSuggestion("r06"), "Change state after summary")
assert(summaryPart.snapshot.clock !== recon.getState().clock, "Live answer becomes stale after a state change")
reset()
setFastMode(undefined)
console.log("ALL FLOW CHECKS PASSED")
