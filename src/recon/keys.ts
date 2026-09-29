import { flushSync } from "react-dom"
import { focusPage } from "./focus"
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
  selectTab?: (tab: "Pending" | "Reconciled") => void
  toggleSidebar?: () => void
  comment?: () => boolean
  ember?: () => void
  scrollSheet?: (delta: -1 | 1) => boolean
  enabled?: boolean
}

/** Capture Escape before editors and Radix so each press handles one layer. */
export function useReconKeys({
  move,
  enter,
  cycle,
  selectTab,
  toggleSidebar,
  comment,
  ember,
  scrollSheet,
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
      if (["threadFor", "pageChatOpen", "inboxOpen", "shortcutsOpen"].some(key => previous[key as keyof typeof previous] && !next[key as keyof typeof next])) focusPage()
      previous = next
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const state = reconUi.get()
      if (event.key === "Escape") {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
        const editor = target?.closest<HTMLElement>(
          'textarea,input,[contenteditable]:not([contenteditable="false"])'
        )
        if (editor) {
          const text =
            editor instanceof HTMLInputElement ||
            editor instanceof HTMLTextAreaElement
              ? editor.value
              : editor.textContent
          editor.blur()
          // Quick comments dismiss on Escape even with a draft (kept in store).
          // In the review sheet the first Escape only leaves the text box; the next closes the sheet.
          if (editor.closest('[data-slot="half-sheet"]') || (text?.trim() && !editor.closest('[data-layer="thread"]'))) {
            event.preventDefault()
            event.stopImmediatePropagation()
            return
          }
        }
        // Evidence owns its Escape even when opened inside another layer.
        const evidence = document.querySelector<HTMLElement>('[data-recon-evidence][data-state="open"]')
        if (evidence) {
          flushSync(() => evidence.dispatchEvent(new Event("recon-close")))
          focusPage()
          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }
        const shell = ui.get()
        flushSync(() => {
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
        })
        focusPage()
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (ui.get().dialog || ui.get().paletteOpen || state.shortcutsOpen || document.querySelector('[role="dialog"][data-state="open"]')) return
      if (
        target?.closest(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[cmdk-root],[data-cmdk-root],[role="dialog"]'
        )
      )
        return
      const key = event.key.toLowerCase()
      if (
        (event.metaKey || event.ctrlKey) &&
        (key === "e" || key === "j") &&
        !event.altKey && !event.shiftKey
      ) {
        event.preventDefault()
        reconUi.set((current) => ({
          ...current,
          pageChatOpen: !current.pageChatOpen,
        }))
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.shiftKey && key !== "?" && key !== " ") return
      const id = state.selectedItemId
      const step = (delta: -1 | 1) =>
        cycle ? cycle(delta) : id && cycleSuggestion(id, delta)
      switch (key) {
        case "1":
        case "2":
          if (!selectTab) return
          selectTab(key === "1" ? "Pending" : "Reconciled")
          break
        case "[":
          if (!toggleSidebar) return
          toggleSidebar()
          break
        case "e":
          if (!ember) return
          ember()
          break
        case " ":
        case "pagedown":
        case "pageup":
          if (!scrollSheet?.(key === "pageup" || event.shiftKey ? -1 : 1)) return
          event.stopPropagation()
          break
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
          if (!comment?.() && id) focusThread(id)
          break
        case "?":
          reconUi.set((current) => ({ ...current, shortcutsOpen: true }))
          break
        default:
          return
      }
      event.preventDefault()
    }
    const onViewSuggestion = (event: Event) => {
      const id = (event as CustomEvent<string>).detail
      const selector = `[data-suggestion-id="${CSS.escape(id)}"]`
      if (!document.querySelector(selector)) flushSync(() => enter?.())
      requestAnimationFrame(() => document.querySelector(selector)?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
    }
    window.addEventListener("recon:view-suggestion", onViewSuggestion)
    window.addEventListener("keydown", onKey, true)
    return () => {
      unsubscribe()
      window.removeEventListener("recon:view-suggestion", onViewSuggestion)
      window.removeEventListener("keydown", onKey, true)
    }
  }, [move, enter, cycle, selectTab, toggleSidebar, comment, ember, scrollSheet, enabled])
}
