import { restoreSlice, persistSlice } from "@/data/persistence"
import { useRef, useSyncExternalStore } from "react"
import { createStore, shallowEqual } from "@/data/store"
import type { ReconItem, ReconState } from "./data"
import { createReconStore, summarize } from "./store"

export const recon = createReconStore()
recon.restore(restoreSlice("recon", recon.getState(), value =>
  Object.values(value.items).every(item =>
    [...item.suggestions, ...item.hidden].every(s => typeof s.id === "string" && Array.isArray(s.factors) && Array.isArray(s.bankIds) && Array.isArray(s.bookIds)) &&
    [...item.bankIds].every(id => !!value.bankLines[id]) && item.bookIds.every(id => !!value.bookLines[id])
  ) && value.actions.every(a => !!a.before?.items && Array.isArray(a.touches))
))
persistSlice("recon", recon.getState, recon.subscribe)

export interface ReconUIState {
  selectedItemId: string | null
  selectedLines: { bank: string[]; book: string[] }
  suggestionIndex: Record<string, number>
  threadFor: string | null
  threadDraft: Record<string, string>
  pageChatOpen: boolean
  inboxOpen: boolean
  shortcutsOpen: boolean
  completed: boolean
}
export const reconUi = createStore<ReconUIState>({
  selectedItemId: null,
  selectedLines: { bank: [], book: [] },
  suggestionIndex: {},
  threadFor: null,
  threadDraft: {},
  pageChatOpen: false,
  inboxOpen: false,
  shortcutsOpen: false,
  completed: restoreSlice("completed", false),
})

persistSlice("completed", () => reconUi.get().completed, reconUi.subscribe)

// Submission covers the current revision; any committed change or reset reopens review.
recon.subscribe(() => {
  if (reconUi.get().completed)
    reconUi.set((state) => ({ ...state, completed: false }))
})

/** Cached snapshots let selectors safely return arrays and summaries. */
function useSelected<S, T>(
  get: () => S,
  subscribe: (listener: () => void) => () => void,
  selector: (state: S) => T
): T {
  const cache = useRef<{
    state: S
    selector: (state: S) => T
    value: T
  } | null>(null)
  const snapshot = () => {
    const state = get()
    const prev = cache.current
    if (prev?.state === state && prev.selector === selector) return prev.value
    const next = selector(state)
    const value = prev && shallowEqual(prev.value, next) ? prev.value : next
    cache.current = { state, selector, value }
    return value
  }
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
export function useRecon<T>(selector: (state: ReconState) => T): T {
  return useSelected(recon.getState, recon.subscribe, selector)
}
export function useReconUi<T>(selector: (state: ReconUIState) => T): T {
  return useSelected(reconUi.get, reconUi.subscribe, selector)
}
export const useSummary = () => useRecon(summarize)
export const useItem = (id: string | null | undefined) =>
  useRecon((state) => (id ? state.items[id] : undefined))

export function itemAmount(item: ReconItem, state = recon.getState()): number {
  const bank = item.bankIds.reduce(
    (sum, id) => sum + state.bankLines[id].amount,
    0
  )
  if (!item.bankIds.length && !item.bookIds.length)
    return item.suggestions[0]?.bookDelta ?? 0
  return item.bankIds.length
    ? bank
    : item.bookIds.reduce((sum, id) => sum + state.bookLines[id].amount, 0)
}
export function queueItems(state: ReconState): ReconItem[] {
  const touched = new Set(
    state.actions.flatMap((action) => Object.keys(action.before.items))
  )
  const gated = (item: ReconItem) =>
    Number(item.suggestions.some((s) => s.approval))
  const timing = (item: ReconItem) => Number(["in_transit", "outstanding"].includes(item.suggestions[0]?.action))
  return Object.values(state.items)
    .filter((item) =>
      item.kind === "exception"
        ? item.status !== "resolved" || touched.has(item.id)
        : item.status !== "resolved"
    )
    .sort(
      (a, b) =>
        gated(a) - gated(b) ||
        timing(b) - timing(a) ||
        (b.suggestions[0]?.confidence ?? 0) -
          (a.suggestions[0]?.confidence ?? 0) ||
        a.id.localeCompare(b.id)
    )
}
/** Next open item in the queue, wrapping after the current item. */
export function nextOpenAfter(itemId: string): ReconItem | undefined {
  const queue = queueItems(recon.getState())
  const index = queue.findIndex((item) => item.id === itemId)
  return [...queue.slice(index + 1), ...queue.slice(0, index + 1)].find(
    (item) => item.status === "open" && item.id !== itemId
  )
}
export const useQueue = () => useRecon(queueItems)
export function reconciledItems(state: ReconState): ReconItem[] {
  const recent = new Map<string, number>()
  state.actions.forEach((action, index) =>
    Object.keys(action.before.items).forEach((id) => recent.set(id, index))
  )
  return Object.values(state.items)
    .filter((item) => item.status === "resolved")
    .sort(
      (a, b) =>
        Number(b.kind === "exception") - Number(a.kind === "exception") ||
        (recent.get(b.id) ?? -1) - (recent.get(a.id) ?? -1) ||
        a.id.localeCompare(b.id)
    )
}
export const useReconciled = () => useRecon(reconciledItems)

if (typeof window !== "undefined") {
  Object.assign(window, {
    __recon: {
      store: recon,
      ui: reconUi,
      summary: () => summarize(recon.getState()),
    },
  })
}
