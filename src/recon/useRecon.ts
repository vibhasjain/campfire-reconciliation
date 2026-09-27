import { useRef, useSyncExternalStore } from "react"
import { createStore, shallowEqual } from "@/data/store"
import type { ReconItem, ReconState } from "./data"
import { createReconStore, summarize } from "./store"

export const recon = createReconStore()

export interface ReconUIState {
  selectedItemId: string | null
  selectedLines: { bank: string[]; book: string[] }
  suggestionIndex: Record<string, number>
  expandedWhy: Record<string, boolean>
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
  expandedWhy: {},
  threadFor: null,
  threadDraft: {},
  pageChatOpen: false,
  inboxOpen: false,
  shortcutsOpen: false,
  completed: false,
})

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
  return item.bankIds.length
    ? bank
    : item.bookIds.reduce((sum, id) => sum + state.bookLines[id].amount, 0)
}
export function queueItems(state: ReconState): ReconItem[] {
  const touched = new Set(
    state.actions.flatMap((action) => Object.keys(action.before.items))
  )
  const impact = (item: ReconItem) => {
    const book = item.bookIds.reduce(
      (sum, id) => sum + state.bookLines[id].amount,
      0
    )
    const bank = item.bankIds.reduce(
      (sum, id) => sum + state.bankLines[id].amount,
      0
    )
    return Math.abs(bank - book || item.suggestions[0]?.bookDelta || 0)
  }
  const judgment = (item: ReconItem) =>
    item.suggestions.some((s) => s.approval)
      ? 2
      : !item.suggestions[0] || item.suggestions[0].confidence < 90
        ? 1
        : 0
  return Object.values(state.items)
    .filter((item) =>
      item.kind === "exception"
        ? item.status !== "resolved" || touched.has(item.id)
        : item.status !== "resolved"
    )
    .sort(
      (a, b) =>
        judgment(b) - judgment(a) ||
        impact(b) - impact(a) ||
        Math.abs(itemAmount(b, state)) - Math.abs(itemAmount(a, state)) ||
        a.id.localeCompare(b.id)
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
