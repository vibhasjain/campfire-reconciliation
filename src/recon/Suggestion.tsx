import { Check, ChevronDown, LockKeyhole, X } from "lucide-react"
import { AiMark } from "./AiMark"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"
import { acceptSuggestion, rejectSuggestion } from "./actions"
import { suggestionReasons, type Suggestion as ReconSuggestion } from "./data"
import { EvidenceChip } from "./Evidence"
import type { ReactNode } from "react"
import { fmtMoney } from "./store"
import { Money } from "./Money"
import { reconUi, useItem, useReconUi, useSummary } from "./useRecon"

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
  const expanded = useReconUi(
    (state) => state.expandedWhy[suggestion.id] ?? false
  )
  const item = useItem(suggestion.itemId)
  const disabled = item?.status !== "open"
  const compact = size === "compact"
  const summary = useSummary()
  const effect =
    (suggestion.inTransit ?? 0) -
    (suggestion.outstanding ?? 0) -
    suggestion.bookDelta
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
        <div className="flex items-start gap-2">
          <AiMark className="mt-0.5" />
          <h3 className="min-w-0 flex-1 text-xs leading-5 font-medium text-fg">
            {suggestion.title}
          </h3>
        </div>
        <p
          className="text-xs leading-5 break-words text-fg-3"
          title={suggestion.reasoning}
        >
          {suggestion.reasoning}
        </p>
        {suggestion.source === "ember" && (
          <span className="text-[11px] font-medium text-brand">
            Found by Ember
          </span>
        )}
        {Boolean(suggestion.attachmentIds?.length) && (
          <div className="flex flex-wrap gap-1.5">
            {suggestion.attachmentIds?.map((id) => (
              <EvidenceChip key={id} attachmentId={id} />
            ))}
          </div>
        )}
        {suggestion.approval && (
          <div
            className="flex items-center gap-1.5 text-xs text-fg-3"
            title={suggestion.approval.reason}
          >
            <LockKeyhole className="size-4 shrink-0" />
            Needs Daniel’s approval
          </div>
        )}
        {Boolean(suggestion.entries?.length) && (
          <div className="overflow-hidden rounded-md border-hair border-line-subtle">
            <table className="w-full table-fixed text-[11px]">
              <caption className="sr-only">Proposed journal entry</caption>
              <thead className="bg-fill-subtle text-fg-3">
                <tr>
                  <th
                    scope="col"
                    className="px-2.5 py-1.5 text-left font-normal"
                  >
                    Account
                  </th>
                  <th
                    scope="col"
                    className="w-24 px-2 py-1.5 text-right font-normal"
                  >
                    Debit
                  </th>
                  <th
                    scope="col"
                    className="w-24 px-2.5 py-1.5 text-right font-normal"
                  >
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {suggestion.entries?.map((entry, index) => (
                  <tr key={index} className="border-t-hair border-line-subtle">
                    <td
                      className="px-2.5 py-2 leading-4 text-fg-2"
                      title={entry.memo}
                    >
                      {entry.account}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Money cents={entry.debit} />
                    </td>
                    <td className="px-2.5 py-2 text-right">
                      <Money cents={entry.credit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Collapsible
          open={expanded}
          onOpenChange={(open) =>
            reconUi.set((state) => ({
              ...state,
              expandedWhy: { ...state.expandedWhy, [suggestion.id]: open },
            }))
          }
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="gap-1.5 border-ai/20 bg-ai-tint text-xs font-medium text-ai-ink shadow-[0_0_3px_var(--c-ai-glow)] hover:bg-ai-tint hover:text-ai-ink aria-expanded:bg-ai-tint aria-expanded:text-ai-ink"
              onClick={(event) => event.stopPropagation()}
            >
              <AiMark />
              {suggestion.confidence}% confidence
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-5 text-fg-2">
              {suggestionReasons(suggestion).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
        {!compact && (
          <p className="text-xs text-fg-3">
            {effect === 0
              ? "No change to the difference"
              : `Difference → ${fmtMoney(summary.difference + effect)}`}
          </p>
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
        </div>
        {footer}
      </div>
    </section>
  )
}
