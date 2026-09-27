import { useEffect, useRef } from "react"
import { ui } from "@/app/ui-store"
import { focusThread } from "@/comments"
import {
  acceptSuggestion,
  rejectSuggestion,
  unreconcileItem,
  matchSelection,
  cycleSuggestion,
} from "./actions"
import { reconUi } from "./useRecon"

export type ReconKeyOptions = {
  move: (delta: -1 | 1) => void
  enter?: () => void
  cycle?: (delta: -1 | 1) => void
  enabled?: boolean
}

/** A single keymap for every version; Radix owns Escape inside its own layers. */
export function useReconKeys({
  move,
  enter,
  cycle,
  enabled = true,
}: ReconKeyOptions) {
  const order = useRef<
    ("threadFor" | "pageChatOpen" | "inboxOpen" | "shortcutsOpen")[]
  >([])
  useEffect(() => {
    if (!enabled) return
    const layerOrder = order.current
    let previous = reconUi.get()
    const unsubscribe = reconUi.subscribe(() => {
      const next = reconUi.get()
      for (const key of [
        "threadFor",
        "pageChatOpen",
        "inboxOpen",
        "shortcutsOpen",
      ] as const) {
        if (next[key] && next[key] !== previous[key]) {
          const index = layerOrder.indexOf(key)
          if (index >= 0) layerOrder.splice(index, 1)
          layerOrder.push(key)
        }
      }
      previous = next
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const state = reconUi.get()
      if (event.key === "Escape") {
        const shell = ui.get()
        if (shell.dialog) ui.set({ dialog: null })
        else if (shell.paletteOpen) ui.set({ paletteOpen: false })
        else {
          const fallback = [
            "pageChatOpen",
            "inboxOpen",
            "threadFor",
            "shortcutsOpen",
          ] as const
          const layer = [...fallback, ...layerOrder]
            .reverse()
            .find((key) => state[key])
          if (layer)
            reconUi.set((current) => ({
              ...current,
              [layer]: layer === "threadFor" ? null : false,
            }))
          else if (shell.halfSheet) ui.set({ halfSheet: null })
          else return
        }
        event.preventDefault()
        return
      }
      if (
        target?.closest(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[cmdk-root],[data-cmdk-root],[role="dialog"]'
        )
      )
        return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "j" && !event.altKey) {
        event.preventDefault()
        reconUi.set((current) => ({
          ...current,
          pageChatOpen: !current.pageChatOpen,
        }))
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const id = state.selectedItemId
      const step = (delta: -1 | 1) =>
        cycle ? cycle(delta) : id && cycleSuggestion(id, delta)
      switch (key) {
        case "arrowup":
        case "k":
          move(-1)
          break
        case "arrowdown":
        case "j":
          move(1)
          break
        case "arrowleft":
          step(-1)
          break
        case "arrowright":
          step(1)
          break
        case "enter":
          if (target?.closest("button,a") || !enter) return
          enter()
          break
        case "a":
          if (id) acceptSuggestion(id)
          break
        case "x":
          if (id) rejectSuggestion(id)
          break
        case "u":
          if (id) unreconcileItem(id)
          break
        case "m":
          matchSelection()
          break
        case "c":
          if (id) focusThread(id)
          break
        case "?":
          reconUi.set((current) => ({ ...current, shortcutsOpen: true }))
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      unsubscribe()
      window.removeEventListener("keydown", onKey)
    }
  }, [move, enter, cycle, enabled])
}
