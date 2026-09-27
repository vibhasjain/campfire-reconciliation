import { focusPage } from "@/recon/focus"
// In-memory shell state. No navigation or storage side effects.
import { isValidElement, useSyncExternalStore, type ReactNode } from "react"
import { createStore } from "@/data/store"
import type { ConfirmDialogProps } from "@/components/common/ConfirmDialog"

export type DialogRequest =
  | { kind: "confirm"; props: ConfirmDialogProps }
  | { kind: "custom"; render: () => ReactNode }

export type HalfSheetTarget = { title?: string; content: ReactNode }
export type UIState = {
  dialog: DialogRequest | null
  halfSheet: HalfSheetTarget | null
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  paletteOpen: boolean
}

const store = createStore<UIState>({
  dialog: null,
  halfSheet: null,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  paletteOpen: false,
})

export const ui = {
  get: store.get,
  set: (patch: Partial<UIState>) => {
    const previous = store.get()
    store.set((state) => ({ ...state, ...patch }))
    if ((previous.dialog && patch.dialog === null) || (previous.halfSheet && patch.halfSheet === null) || (previous.paletteOpen && patch.paletteOpen === false)) focusPage()
  },
  subscribe: store.subscribe,
}

export function useUI<T>(select: (state: UIState) => T): T {
  return useSyncExternalStore(ui.subscribe, () => select(ui.get()))
}

export const openDialog = (dialog: DialogRequest) => ui.set({ dialog })
export const closeDialog = () => ui.set({ dialog: null })

/** Open a node directly, or provide a title and content for the panel. */
export function openHalfSheet(content: ReactNode | HalfSheetTarget) {
  const target = content !== null && typeof content === "object" && !isValidElement(content) && "content" in content
    ? content
    : { content }
  ui.set({ halfSheet: target })
}
export const closeHalfSheet = () => ui.set({ halfSheet: null })
