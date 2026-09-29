import { useEffect } from "react"
import { ui } from "./ui-store"

/** The docked/page/thread composer marks its editable element with this attribute (S5 contract). */
export const COMPOSER_ATTR = "data-composer-editor"

export const MENTION_EMBER_EVENT = "composer:mention-ember"

export function focusComposer(root: ParentNode = document, mentionEmber = false) {
  const el = root.querySelector<HTMLElement>(`[${COMPOSER_ATTR}]`)
  if (mentionEmber) el?.dispatchEvent(new Event(MENTION_EMBER_EVENT, { bubbles: true }))
  el?.focus()
  return !!el
}

/** Shell owns the command palette; reconciliation owns its page and item shortcuts. */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const target = e.target instanceof HTMLElement ? e.target : null
      if (e.key !== "Escape" && target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase()
        if (k === "k") {
          e.preventDefault()
          ui.set({ paletteOpen: !ui.get().paletteOpen })
        }
        return
      }
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const el = document.activeElement as HTMLElement | null
        if (el?.closest(`[${COMPOSER_ATTR}]`) && !document.querySelector("[data-radix-popper-content-wrapper]")) el.blur()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
