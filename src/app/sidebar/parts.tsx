import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"


/** Unavailable destinations: look real, do nothing. */
export function InertControl({ className, ...props }: Omit<ComponentProps<"button">, "onClick" | "disabled">) {
  return <button type="button" {...props} aria-disabled="true" className={cn("cursor-default outline-none focus-visible:ring-2 focus-visible:ring-focus", className)} />
}

export function SidebarFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative h-full min-w-0">
      <nav aria-label="Sidebar" className={cn("flex h-full w-full flex-col overflow-hidden border-r-hair border-line bg-sidebar", className)}>
        {children}
      </nav>
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
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </InertControl>
  )
}
