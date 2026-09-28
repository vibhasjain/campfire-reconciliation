import { Check, LockKeyhole, X } from "lucide-react"
import { AiMark } from "./AiMark"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { acceptSuggestion, rejectSuggestion } from "./actions"
import { suggestionSummary, type Suggestion as ReconSuggestion } from "./data"
import { EvidenceChip } from "./Evidence"
import type { ReactNode } from "react"
import { useItem } from "./useRecon"

export interface SuggestionProps {
  suggestion: ReconSuggestion
  size?: "compact" | "full"
  active?: boolean
  onAccept?: () => void
  onReject?: () => void
  acceptLabel?: string
  footer?: ReactNode
  rejectLabel?: string
}

export function Suggestion({
  suggestion,
  size = "full",
  active = true,
  onAccept,
  onReject,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
  footer,
}: SuggestionProps) {
  const item = useItem(suggestion.itemId)
  const disabled = item?.status !== "open"
  const compact = size === "compact"
  return (
    <section
      data-suggestion-id={suggestion.id}
      data-active={active}
      aria-label={`Suggestion: ${suggestion.title}`}
      className={cn(
        "min-w-0 rounded-lg border-hair border-line bg-surface",
        active &&
          "shadow-[0_0_8px_var(--c-ai-glow)]"
      )}
    >
      <div className={cn("flex flex-col gap-2.5", compact ? "p-3" : "p-4")}>
        {/* Mark and tag sit in boxes one title line tall, so all three share the first line's center. */}
        <div className="flex items-start gap-2">
          <span className="flex h-5 shrink-0 items-center">
            <AiMark />
          </span>
          <h3 className="min-w-0 flex-1 text-xs leading-5 font-medium text-fg">
            {suggestion.title}
          </h3>
          <span
            data-confidence
            className={cn(
              "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium tabular-nums",
              suggestion.confidence >= 90
                ? "bg-brand-tint text-brand"
                : suggestion.confidence >= 70
                  ? "bg-fill-hover text-fg-3"
                  : "bg-fill-subtle text-accent-orange-text"
            )}
            aria-label={`${suggestion.confidence}% confidence`}
          >
            {suggestion.confidence}%
          </span>
        </div>
        <p className="text-xs leading-5 break-words text-fg-3">
          {suggestionSummary(suggestion)}
        </p>
        {suggestion.approval && (
          <div
            className="flex items-center gap-1.5 text-xs text-fg-3"
            title={suggestion.approval.reason}
          >
            <LockKeyhole className="size-4 shrink-0" />
            Needs Daniel’s approval
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="brand"
            size="sm"
            data-action="accept"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              if (onAccept) onAccept()
              else acceptSuggestion(suggestion.itemId, suggestion.id)
            }}
          >
            <Check className="size-4" />
            {item?.status === "awaiting_approval"
              ? "Awaiting Daniel"
              : item?.status === "resolved"
                ? "Accepted"
                : suggestion.approval
                  ? "Send to Daniel"
                  : acceptLabel}
            <Kbd className="ml-1 h-4 min-w-4 bg-surface/10 px-1 text-[10px] text-white">
              A
            </Kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-action="reject"
            disabled={disabled}
            className="text-fg-3"
            onClick={(event) => {
              event.stopPropagation()
              if (onReject) onReject()
              else rejectSuggestion(suggestion.itemId, suggestion.id)
            }}
          >
            <X className="size-4" />
            {rejectLabel}
            <Kbd className="ml-1 h-4 min-w-4 bg-fill-subtle px-1 text-[10px] text-fg-4">
              X
            </Kbd>
          </Button>
          {Boolean(suggestion.attachmentIds?.length) && (
            <div className="ml-auto flex flex-wrap justify-end gap-1.5">
              {suggestion.attachmentIds?.map((id) => (
                <EvidenceChip key={id} attachmentId={id} />
              ))}
            </div>
          )}
        </div>
        {footer}
      </div>
    </section>
  )
}
