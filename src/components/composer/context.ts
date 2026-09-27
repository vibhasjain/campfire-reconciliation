// Generic composer context chips and an optional prefill hand-off.
import type { ReactNode } from "react"
import type { EntityRef } from "@/data/types"

/** A named view supplied as conversation context. */
export type ViewChip = { kind: "view"; label: string; href: string; icon?: ReactNode }
export type ComposerChip = EntityRef | ViewChip
export const isViewChip = (c: ComposerChip): c is ViewChip => "kind" in c && c.kind === "view"

type Prefill = { text: string; context?: ComposerChip[] }
let pending: Prefill | null = null

/** The next page composer opens with this text and context, unsent. */
export function prefillComposer(p: Prefill) {
  pending = p
}
/** Read by the page composer on mount (cleared after the current tick, so StrictMode's double init sees it too). */
export function takePrefill(): Prefill | null {
  const p = pending
  if (p) setTimeout(() => pending === p && (pending = null), 0)
  return p
}
