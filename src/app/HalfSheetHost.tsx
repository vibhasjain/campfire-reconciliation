import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { HalfSheetHeader } from "@/components/common/HalfSheetHeader"
import { useHalfSheet, type HalfSheetTarget } from "./halfsheet"
import { LAYOUT, STORAGE } from "./layout"
import { storage, useIsDesktop } from "./hooks"
import { useUI } from "./ui-store"
import { useSidebarWidth } from "./sidebar/width"
import { cn } from "@/lib/utils"

export type HalfSheetBodyProps = { target: HalfSheetTarget; close: () => void }
const clamp = (width: number) => Math.min(LAYOUT.halfSheet.max, Math.max(LAYOUT.halfSheet.min, width))

function isOverlayOpen() {
  return !!document.querySelector("[data-radix-popper-content-wrapper], [role=dialog][data-state=open], [role=alertdialog]")
}

/** A resizable right panel, driven entirely by ui-store; on small screens it fills the workspace. */
export function HalfSheetHost() {
  const { target, close } = useHalfSheet()
  const desktop = useIsDesktop()
  const collapsed = useUI((state) => state.sidebarCollapsed)
  const { width: sidebarWidth } = useSidebarWidth()
  const sidebar = desktop && !collapsed ? sidebarWidth : 0
  const [width, setWidth] = useState<number | null>(() => {
    const stored = Number(storage.get(STORAGE.halfSheetWidth))
    return stored ? clamp(stored) : null
  })
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!target) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isOverlayOpen()) return
      const focused = document.activeElement as HTMLElement | null
      if (focused?.closest("[contenteditable=true], textarea, input") && !ref.current?.contains(focused)) return
      close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [target, close])

  if (!target) return null

  const startDrag = (event: ReactPointerEvent) => {
    const element = ref.current
    if (!element) return
    event.preventDefault()
    const right = element.getBoundingClientRect().right
    setDragging(true)
    let last = element.offsetWidth
    const move = (moveEvent: PointerEvent) => {
      last = clamp(right - moveEvent.clientX)
      setWidth(last)
    }
    const end = () => {
      setDragging(false)
      storage.set(STORAGE.halfSheetWidth, String(Math.round(last)))
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
  }

  return (
    <div
      ref={ref}
      data-slot="half-sheet"
      role="region"
      aria-label={target.title ?? "Details"}
      className={cn("@container/halfsheet-content relative flex h-full shrink-0 py-2.5 pr-2.5 max-lg:absolute max-lg:inset-0 max-lg:z-20 max-lg:p-2.5", dragging && "select-none")}
      style={desktop ? {
        width: width ?? `calc((100vw - ${sidebar}px) / 2)`,
        minWidth: `min(${LAYOUT.halfSheet.min}px, calc(100vw - ${sidebar}px))`,
        maxWidth: `min(max(${LAYOUT.halfSheet.min}px, min(${LAYOUT.halfSheet.max}px, calc(100vw - ${sidebar + 400}px))), calc(100vw - ${sidebar}px))`,
      } : { width: "100%" }}
    >
      {desktop && <button
        type="button"
        role="separator"
        aria-label="Resize half sheet"
        aria-orientation="vertical"
        aria-valuemin={LAYOUT.halfSheet.min}
        aria-valuemax={LAYOUT.halfSheet.max}
        aria-valuenow={width ?? undefined}
        onPointerDown={startDrag}
        onKeyDown={(event) => {
          const current = width ?? ref.current?.offsetWidth ?? LAYOUT.halfSheet.min
          const next = { ArrowLeft: current + 16, ArrowRight: current - 16, Home: LAYOUT.halfSheet.min, End: LAYOUT.halfSheet.max }[event.key]
          if (next === undefined) return
          event.preventDefault()
          const value = clamp(next)
          setWidth(value)
          storage.set(STORAGE.halfSheetWidth, String(value))
        }}
        className="group absolute inset-y-0 -left-2 z-10 w-4 cursor-col-resize outline-none"
      >
        <span className={cn("mx-auto block h-full w-px bg-line-strong opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100", dragging && "opacity-100")} />
      </button>}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border-hair border-line bg-surface shadow-composer">
        <HalfSheetHeader left={<span className="text-sm font-medium text-fg">{target.title ?? "Details"}</span>} onClose={close} />
        <div className="min-h-0 flex-1 overflow-y-auto px-sheet-gutter">{target.content}</div>
      </div>
    </div>
  )
}
