import type { ReactNode } from "react"

export type ToastOptions = {
  tone?: "info" | "success" | "error"
  action?: { label: string; onClick: () => void }
  /** Adds a "Training Ember" line: the action taught Ember something. */
  training?: boolean
  /** ms; default 5000 */
  duration?: number
}
type ToastItem = ToastOptions & { id: number; message: ReactNode }

export let items: ToastItem[] = []
let seq = 0
export const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

/** Show a toast (bottom-right stack, spring in, ~5s dwell). Returns its id. */
export function toast(message: ReactNode, opts: ToastOptions = {}) {
  const id = ++seq
  items = [...items, { ...opts, id, message }]
  emit()
  setTimeout(() => dismissToast(id), opts.duration ?? 5000)
  return id
}

export { Toaster } from "./Toaster"
