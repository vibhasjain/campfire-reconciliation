import { useEffect, useRef } from "react"
import { HalfSheetHeader } from "@/components/common/HalfSheetHeader"
import { useHalfSheet, type HalfSheetTarget } from "./halfsheet"
import { LAYOUT } from "./layout"
import { useIsDesktop } from "./hooks"
import { useUI } from "./ui-store"
import { useSidebarWidth } from "./sidebar/width"

export type HalfSheetBodyProps = { target: HalfSheetTarget; close: () => void }

function isOverlayOpen() {
  return !!document.querySelector("[data-radix-popper-content-wrapper], [role=dialog][data-state=open], [role=alertdialog]")
}

/** A right panel, driven entirely by ui-store; on small screens it fills the workspace. */
export function HalfSheetHost() {
  const { target, close } = useHalfSheet()
  const desktop = useIsDesktop()
  const collapsed = useUI((state) => state.sidebarCollapsed)
  const { width: sidebarWidth } = useSidebarWidth()
  const sidebar = desktop && !collapsed ? sidebarWidth : 0
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.defaultPrevented || isOverlayOpen()) return
      const focused = document.activeElement as HTMLElement | null
      // First Esc leaves a text box (the sheet's own composer included); the next one closes the sheet.
      if (focused?.closest("[contenteditable=true], textarea, input")) {
        if (ref.current?.contains(focused)) focused.blur()
        return
      }
      close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [target, close])

  if (!target) return null

  return (
    <div
      ref={ref}
      data-slot="half-sheet"
      role="region"
      aria-label={target.title ?? "Details"}
      className="@container/halfsheet-content relative flex h-full shrink-0 py-2.5 pr-2.5 max-lg:absolute max-lg:inset-0 max-lg:z-20 max-lg:p-2.5"
      style={desktop ? {
        width: `calc((100vw - ${sidebar}px) / 2)`,
        minWidth: `min(${LAYOUT.halfSheet.min}px, calc(100vw - ${sidebar}px))`,
        maxWidth: `min(max(${LAYOUT.halfSheet.min}px, min(${LAYOUT.halfSheet.max}px, calc(100vw - ${sidebar + 400}px))), calc(100vw - ${sidebar}px))`,
      } : { width: "100%" }}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-hair border-line bg-surface shadow-composer">
        {/* One scrollport and gutter for chrome + content: even classic scrollbars
            reserve the same width for both. The header remains sticky. */}
        <div data-slot="half-sheet-scroll" className="min-h-0 flex-1 overflow-y-auto overscroll-none px-sheet-gutter">
          <HalfSheetHeader left={<span className="w-full truncate text-sm font-medium text-fg">{target.title ?? "Details"}</span>} right={target.aside} onClose={close} />
          {target.content}
        </div>
      </div>
    </div>
  )
}
