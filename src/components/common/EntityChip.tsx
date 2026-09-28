import type { MouseEvent } from "react"
import { FileText } from "lucide-react"
import { AiMark } from "@/recon/AiMark"
import { recon } from "@/recon/useRecon"
import type { Actor } from "@/recon/data"
import type { EntityRef } from "@/data/types"
import { cn } from "@/lib/utils"
import { Avatar } from "./Avatar"

export type EntityChipVariant = "link" | "outline" | "mention" | "context" | "plain"

// A person's signature color, shared by their avatar tint and their @mentions.
const mentionColor: Record<Actor, string> = {
  maya: "text-brand",
  daniel: "text-accent-blue-text",
  priya: "text-accent-purple-text",
  ember: "text-ai-ink",
}

/** Generic mention/context chip. Any interaction is supplied by its caller. */
export function EntityChip({ entity, variant = "plain", onClick, className }: {
  entity: EntityRef
  variant?: EntityChipVariant
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  className?: string
}) {
  const label = entity.label ?? (entity.id === "ember" ? "Ember" : entity.id)
  if (variant === "mention" && (entity.type === "member" || entity.type === "agent")) {
    // People and Ember read as "@Full Name" in their color: no avatar, no chip.
    const teammate = recon.getState().teammates[entity.id as Actor]
    return <span className={cn("font-medium", mentionColor[entity.id as Actor] ?? "text-fg", className)}>@{teammate?.name ?? label}</span>
  }
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
