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
import type { Suggestion as ReconSuggestion } from "./data"
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

// ponytail: fixture calibration by band; real numbers come from accept/reject history per entity.
const calibration = (confidence: number) =>
  confidence >= 90
    ? "Last quarter, 97% of suggestions scored 90%+ were accepted."
    : confidence >= 70
      ? "Last quarter, 81% of suggestions scored 70–89% were accepted."
      : "Last quarter, 44% of suggestions scored under 70% were accepted."

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
  const formula = suggestion.factors
    .map((factor) => `${factor.weight.toFixed(2)}·${factor.key}`)
    .join(" + ")
  return (
    <section
      data-suggestion-id={suggestion.id}
      data-active={active}
      aria-label={`Suggestion: ${suggestion.title}`}
      className={cn(
        "min-w-0 rounded-lg border-hair border-line bg-surface",
        active &&
          "shadow-[0_0_0_3px_color-mix(in_oklch,var(--c-ai-glow)_24%,transparent)]"
      )}
    >
      <div className={cn("flex flex-col gap-2.5", compact ? "p-3" : "p-4")}>
        <div className="flex items-start gap-2">
          <AiMark className="mt-0.5" />
          <h3 className="min-w-0 flex-1 text-xs leading-5 font-medium text-fg">
            {suggestion.title}
          </h3>
          <span
            className={cn(
              "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium tabular-nums",
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
              variant="ghost"
              size="xs"
              className="-ml-1.5 gap-1 text-[11px] font-normal text-fg-3"
              onClick={(event) => event.stopPropagation()}
            >
              Why {suggestion.confidence}%?
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border-hair border-line-subtle bg-fill-subtle p-2.5">
              {suggestion.factors.map((factor) => (
                <div
                  key={factor.key}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b-hair border-line-subtle py-2 first:pt-0"
                >
                  <div className="w-full min-w-0">
                    <div className="text-[11px] leading-4 text-fg-3">
                      <span className="font-medium text-fg-2">
                        {factor.label}
                      </span>{" "}
                      · {factor.detail}
                    </div>
                    <div
                      aria-hidden="true"
                      className="mt-1.5 h-0.5 rounded-full bg-line-subtle"
                    >
                      <div
                        className="h-full rounded-full bg-brand/40"
                        style={{
                          width: `${factor.weight * factor.score * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-2 text-xs leading-4 text-fg-3">
                {calibration(suggestion.confidence)}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-fg-4">
                {formula} = {suggestion.confidence}%
              </div>
            </div>
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
            <Kbd className="ml-1 h-4 min-w-4 bg-surface/10 px-1 text-[10px] text-ai">
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
