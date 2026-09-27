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
} from "@/agent/scripts/recon"
import { postToThread } from "@/comments"
import {
  acceptSuggestion,
  rejectSuggestion,
  unreconcileItem,
  matchSelection,
  revertAction,
  flushApprovals,
} from "./actions"
import { recon, reconUi, queueItems, reconciledItems } from "./useRecon"
import { summarize } from "./store"
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
setFastMode(true)
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
const thread = await postToThread("r04", "@ember none of these match", [])
await until(() => !isRunning(thread), "Notion thread reply")
assert(
  recon
    .getState()
    .items.r04.suggestions.some(
      (candidate) => candidate.invoiceNumber === "NTN-88213"
    ),
  "Thread engine path surfaces NTN-88213"
)
const turns = Object.values(db.get().messages).filter(
  (message) => message.chatId === thread
)
assert(
  turns.filter((message) => message.text === "@ember none of these match")
    .length === 1,
  "Comments and engine do not duplicate Maya’s message"
)
assert(
  turns.some(
    (message) =>
      message.author === "ember" &&
      message.parts.some(
        (part) => part.type === "card" && part.card.kind === "recon-candidate"
      )
  ),
  "Ember emits the actionable candidate card"
)
assert(
  turns.some(
    (message) =>
      message.parts.filter(
        (part) => part.type === "card" && part.card.kind === "recon-change"
      ).length === 2
  ),
  "Every discovery mutation gets a Revert card"
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
    closing.markdown.startsWith(`Accepted ${eligible.length - 1} suggestions.`),
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
setFastMode(undefined)
console.log("ALL FLOW CHECKS PASSED")
