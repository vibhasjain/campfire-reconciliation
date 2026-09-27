import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function EmptyState({ title, body, action, className }: { title?: ReactNode; body: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {title && <div className="text-sm font-medium text-fg">{title}</div>}
      <div className="max-w-[360px] text-sm text-fg-3">{body}</div>
      {action}
    </div>
  )
}
