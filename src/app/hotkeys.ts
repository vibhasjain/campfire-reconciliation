import { useEffect } from "react"
import { ui } from "./ui-store"

/** The docked/page/thread composer marks its editable element with this attribute (S5 contract). */
export const COMPOSER_ATTR = "data-composer-editor"

export function focusComposer() {
  const el = document.querySelector<HTMLElement>(`[${COMPOSER_ATTR}]`)
  el?.focus()
  return !!el
}

/** Global shortcuts (shell.md §12): ⌘K palette toggle, ⌘J focus composer, Esc blurs the composer. Nothing else. */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const k = e.key.toLowerCase()
        if (k === "k") {
          e.preventDefault()
          ui.set({ paletteOpen: !ui.get().paletteOpen })
        } else if (k === "j") {
          e.preventDefault()
          focusComposer()
        }
        return
      }
      if (e.key === "Escape" && !e.defaultPrevented) {
        const el = document.activeElement as HTMLElement | null
        if (el?.closest(`[${COMPOSER_ATTR}]`) && !document.querySelector("[data-radix-popper-content-wrapper]")) el.blur()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
