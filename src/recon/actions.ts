import { useSyncExternalStore } from "react"
import { createStore } from "@/data/store"
import { toast } from "@/components/common/toast"
import type { Actor } from "./data"
import type { Result } from "./store"
import { fmtMoney } from "./store"
import { recon, reconUi } from "./useRecon"
import { delayMs, waitFor } from "./speed"

const flashes = createStore<Record<string, number>>({})
let observedClock = recon.getState().clock
recon.subscribe(() => {
  const state = recon.getState()
  if (state.clock < observedClock) flashes.set(() => ({}))
  const actions = state.actions.filter(
    (action) => Number(action.id.replace("action-", "")) > observedClock
  )
  observedClock = state.clock
  for (const action of actions) {
    const ids = Object.keys(action.before.items)
    const stamp = Date.now()
    flashes.set((previous) => ({
      ...previous,
      ...Object.fromEntries(ids.map((id) => [id, stamp])),
    }))
    setTimeout(
      () =>
        flashes.set((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(
              ([id, at]) => !ids.includes(id) || at !== stamp
            )
          )
        ),
      delayMs(1200)
    )
  }
})
export function useFlash(itemId: string): boolean {
  return useSyncExternalStore(
    flashes.subscribe,
    () => Boolean(flashes.get()[itemId]),
    () => false
  )
}
function show(message: string, options?: Parameters<typeof toast>[1]) {
  if (typeof window !== "undefined") toast(message, options)
}
function failure(result: Result): Result {
  if (!result.ok) show(result.reason, { tone: "error" })
  return result
}
export function activeSuggestion(itemId: string) {
  const item = recon.getState().items[itemId]
  if (!item?.suggestions.length) return undefined
  const index = Math.max(
    0,
    Math.min(
      reconUi.get().suggestionIndex[itemId] ?? 0,
      item.suggestions.length - 1
    )
  )
  return item.suggestions[index]
}
/** Steps through suggestions, wrapping at the ends; with a lone suggestion the card nudges instead. */
export function cycleSuggestion(itemId: string, direction: number) {
  const count = recon.getState().items[itemId]?.suggestions.length ?? 0
  if (!count) return
  if (count === 1) {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("recon:suggestion-edge", { detail: itemId }))
    return
  }
  reconUi.set((state) => ({
    ...state,
    suggestionIndex: {
      ...state.suggestionIndex,
      [itemId]: ((state.suggestionIndex[itemId] ?? 0) + direction + count) % count,
    },
  }))
}
const pendingApprovals = new Set<Promise<void>>()
const approvalRequests = new Map<string, object>()
export async function flushApprovals() {
  await Promise.all([...pendingApprovals])
}
function requestApproval(itemId: string, acceptedActionId: string) {
  const request = {}
  const acceptedAction = recon
    .getState()
    .actions.find((action) => action.id === acceptedActionId)
  approvalRequests.set(itemId, request)
  const currentRequest = () =>
    approvalRequests.get(itemId) === request &&
    recon
      .getState()
      .actions.some(
        (action) => action === acceptedAction && !action.reverted
      ) &&
    recon.getState().items[itemId]?.status === "awaiting_approval"
  const promise = (async () => {
    const { appendThreadMessage } = await import("@/comments")
    if (!currentRequest()) return
    appendThreadMessage(itemId, "Approval requested from @Daniel", "maya")
    await waitFor(1600)
    const state = recon.getState()
    if (!currentRequest()) return
    const approved = recon.approve(itemId, "daniel")
    if (approved.ok) {
      appendThreadMessage(itemId, "Approved.", "daniel")
      show(`Daniel approved · ${state.items[itemId].title}`, {
        tone: "success",
      })
    } else failure(approved)
  })()
  pendingApprovals.add(promise)
  const cleanup = () => {
    pendingApprovals.delete(promise)
    if (approvalRequests.get(itemId) === request)
      approvalRequests.delete(itemId)
  }
  void promise.then(cleanup, () => {
    cleanup()
    show("Approval request could not be completed", { tone: "error" })
  })
}
export function acceptSuggestion(
  itemId: string,
  suggestionId?: string,
  actor: Actor = "maya"
): Result {
  const item = recon.getState().items[itemId]
  const suggestion = suggestionId
    ? item?.suggestions.find((candidate) => candidate.id === suggestionId)
    : activeSuggestion(itemId)
  if (!item || !suggestion)
    return failure({ ok: false, reason: "No suggestion is available" })
  const result = recon.accept(itemId, suggestion.id, actor)
  if (!result.ok) return failure(result)
  if (
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
  )
    document.activeElement.blur()
  show(
    suggestion.approval
      ? "Sent to Daniel for approval"
      : `Accepted · ${item.title}`,
    {
      tone: "success",
      training: true,
      action: {
        label: "Undo",
        onClick: () => {
          revertAction(result.actionId)
        },
      },
    }
  )
  if (suggestion.approval) requestApproval(itemId, result.actionId)
  return result
}
export function rejectSuggestion(
  itemId: string,
  suggestionId?: string,
  actor: Actor = "maya"
): Result {
  const suggestion = suggestionId ?? activeSuggestion(itemId)?.id
  if (!suggestion)
    return failure({ ok: false, reason: "No suggestion is available" })
  const result = recon.reject(itemId, suggestion, actor)
  if (result.ok)
    show("Suggestion rejected", {
      training: true,
      action: {
        label: "Undo",
        onClick: () => {
          revertAction(result.actionId)
        },
      },
    })
  return failure(result)
}
export function unreconcileItem(itemId: string, actor: Actor = "maya"): Result {
  const item = recon.getState().items[itemId]
  const result = recon.unreconcile(itemId, actor)
  if (result.ok)
    show(`Unreconciled · ${item?.title ?? itemId}`, {
      action: {
        label: "Undo",
        onClick: () => {
          revertAction(result.actionId)
        },
      },
    })
  return failure(result)
}
export function openItemThread(itemId: string, draft?: string) {
  reconUi.set((state) => ({
    ...state,
    selectedItemId: itemId,
    threadFor: itemId,
    threadDraft: draft
      ? { ...state.threadDraft, [itemId]: draft }
      : state.threadDraft,
  }))
}
export function matchSelection(actor: Actor = "maya"): Result {
  const { selectedLines } = reconUi.get()
  const result = recon.matchSelected(
    selectedLines.bank,
    selectedLines.book,
    actor
  )
  if (!result.ok) {
    const state = recon.getState()
    const itemId =
      selectedLines.bank
        .map((id) => state.bankLines[id]?.itemId)
        .find(Boolean) ??
      selectedLines.book
        .map((id) => state.bookLines[id]?.itemId)
        .find(Boolean) ??
      reconUi.get().selectedItemId
    const detail =
      result.delta === undefined
        ? result.reason
        : `${result.reason} · Delta ${fmtMoney(result.delta)}`
    show(detail, {
      tone: "error",
      action: itemId
        ? {
            label: "Ask Ember",
            onClick: () =>
              openItemThread(
                itemId,
                `@ember Help match these lines. ${detail}`
              ),
          }
        : undefined,
    })
    return result
  }
  reconUi.set((state) => ({ ...state, selectedLines: { bank: [], book: [] } }))
  show(result.warning ?? "Selection matched", {
    tone: "success",
    action: {
      label: "Undo",
      onClick: () => {
        revertAction(result.actionId)
      },
    },
  })
  return result
}
export function revertAction(actionId: string, actor: Actor = "maya"): Result {
  const state = recon.getState()
  const index = state.actions.findIndex((action) => action.id === actionId)
  const target = state.actions[index]
  // An automatic Daniel approval is part of accepting a gated suggestion from the UI.
  if (target?.kind === "accept" && !target.reverted) {
    const dependent = state.actions
      .slice(index + 1)
      .filter(
        (action) =>
          !action.reverted &&
          action.kind !== "revert" &&
          action.touches.some((touch) => target.touches.includes(touch))
      )
    if (dependent.length === 1 && dependent[0].kind === "approve") {
      const undoneApproval = recon.revert(dependent[0].id, actor)
      if (!undoneApproval.ok) return failure(undoneApproval)
    }
  }
  const result = recon.revert(actionId, actor)
  if (result.ok) {
    const itemId = target?.itemId ?? Object.keys(target?.before.items ?? {})[0]
    if (itemId) {
      reconUi.set((current) => ({ ...current, selectedItemId: itemId }))
      show(`Restored · ${recon.getState().items[itemId]?.title ?? itemId}`, {
        tone: "success",
      })
    }
  }
  return failure(result)
}

// Resume Daniel's scripted sign-off when a reload interrupted the wait.
if (typeof window !== "undefined") {
  for (const item of Object.values(recon.getState().items)) {
    if (item.status !== "awaiting_approval") continue
    const action = recon.getState().actions.slice().reverse().find(a => a.itemId === item.id && a.kind === "accept" && !a.reverted)
    if (action) requestApproval(item.id, action.id)
  }
}
