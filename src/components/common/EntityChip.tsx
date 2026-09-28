import type { MouseEvent } from "react"
import { FileText } from "lucide-react"
import { AiMark } from "@/recon/AiMark"
import type { EntityRef } from "@/data/types"
import { cn } from "@/lib/utils"
import { Avatar } from "./Avatar"

export type EntityChipVariant = "link" | "outline" | "mention" | "context" | "plain"

/** Generic mention/context chip. Any interaction is supplied by its caller. */
export function EntityChip({ entity, variant = "plain", onClick, className }: {
  entity: EntityRef
  variant?: EntityChipVariant
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  const label = entity.label ?? (entity.id === "ember" ? "Ember" : entity.id)
  const size = variant === "context" ? 12 : variant === "mention" ? 14 : 16
  const content = <>
    {entity.type === "member" ? <Avatar name={label} size={size} /> : entity.type === "agent" ? <AiMark /> : (
      <FileText className="shrink-0 text-fg-3" style={{ width: size, height: size }} />
    )}
    <span className="truncate">{label}</span>
  </>
  const base = cn("inline-flex min-w-0 items-center gap-1 text-fg", {
    "text-sm": variant === "plain" || variant === "link",
    "h-6 rounded-md border-hair border-line bg-surface px-1.5 text-sm shadow-button": variant === "outline",
    "h-[18px] rounded-sm border-hair border-line px-1 text-xxs text-fg-3": variant === "context",
    "max-w-full align-baseline": variant === "mention",
  }, className)
  return onClick ? (
    <button type="button" className={cn(base, "text-left")} onClick={onClick}>{content}</button>
  ) : <span className={base}>{content}</span>
}
