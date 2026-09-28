import type { ComponentProps, ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LAYOUT } from "../layout"
import { setWidth, useSidebarWidth, widthStore } from "./width"
import { cn } from "@/lib/utils"

export const PROTOTYPE_TOOLTIP = "Prototype: only this reconciliation is live"

/** Keep unavailable destinations focusable so the same explanation is available to everyone. */
export function InertControl({ children, className, ...props }: Omit<ComponentProps<"button">, "onClick" | "disabled">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" {...props} aria-disabled="true" className={cn("cursor-default outline-none focus-visible:ring-2 focus-visible:ring-focus", className)}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{PROTOTYPE_TOOLTIP}</TooltipContent>
    </Tooltip>
  )
}

/** Sidebar width stays adjustable by pointer and keyboard. */
export function SidebarResizeHandle() {
  const { width, dragging } = useSidebarWidth()
  const { min, max, step } = LAYOUT.sidebar
  return (
    <button
      type="button"
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      data-dragging={dragging || undefined}
      className="group/resize absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize outline-none max-lg:hidden"
      onKeyDown={(event) => {
        const next = { ArrowLeft: width - step, ArrowRight: width + step, Home: min, End: max }[event.key]
        if (next === undefined) return
        event.preventDefault()
        setWidth(next)
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        const startX = event.clientX
        const startWidth = width
        widthStore.set((state) => ({ ...state, dragging: true }))
        const move = (moveEvent: PointerEvent) => setWidth(startWidth + moveEvent.clientX - startX)
        const end = () => {
          widthStore.set((state) => ({ ...state, dragging: false }))
          window.removeEventListener("pointermove", move)
          window.removeEventListener("pointerup", end)
          window.removeEventListener("pointercancel", end)
        }
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", end)
        window.addEventListener("pointercancel", end)
      }}
    >
      <span className="mx-auto block h-full w-px bg-line-strong opacity-0 transition-opacity duration-150 group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 group-data-dragging/resize:opacity-100" />
    </button>
  )
}

export function SidebarFrame({ children, resizable = true, className }: { children: ReactNode; resizable?: boolean; className?: string }) {
  return (
    <div className="relative h-full min-w-0">
      <nav aria-label="Sidebar" className={cn("flex h-full w-full flex-col overflow-hidden border-r-hair border-line bg-sidebar", className)}>
        {children}
      </nav>
      {resizable && <SidebarResizeHandle />}
    </div>
  )
}

export const rowClass = "flex h-9 w-full min-w-0 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] text-fg-2 hover:bg-fill-subtle data-[active=true]:bg-fill-selected data-[active=true]:font-medium data-[active=true]:text-brand"

export function RowIcon({ children }: { children: ReactNode }) {
  return <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-[18px] [&_svg]:stroke-[1.7]">{children}</span>
}

export function SidebarRow({ icon, label, active = false, trailing, className }: { icon?: ReactNode; label: string; active?: boolean; trailing?: ReactNode; className?: string }) {
  return (
    <InertControl aria-current={active ? "page" : undefined} data-active={active} className={cn(rowClass, className)}>
      {icon && <RowIcon>{icon}</RowIcon>}
      <span title={label} className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </InertControl>
  )
}
