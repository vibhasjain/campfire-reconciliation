import { Check, ChevronDown, LockKeyhole, Sparkles, X } from "lucide-react"
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
import { Money } from "./Money"
import { reconUi, useItem, useReconUi } from "./useRecon"

export interface SuggestionProps {
  suggestion: ReconSuggestion
  size?: "compact" | "full"
  active?: boolean
  onAccept?: () => void
  onReject?: () => void
  acceptLabel?: string
  rejectLabel?: string
}

const decimal = (value: number) => Number(value.toFixed(4)).toString()

export function Suggestion({
  suggestion,
  size = "full",
  active = true,
  onAccept,
  onReject,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
}: SuggestionProps) {
  const expanded = useReconUi(
    (state) => state.expandedWhy[suggestion.id] ?? false
  )
  const item = useItem(suggestion.itemId)
  const disabled = item?.status !== "open"
  const compact = size === "compact"
  const weightedTotal = suggestion.factors.reduce(
    (sum, factor) => sum + factor.weight * factor.score * 100,
    0
  )
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
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-ai">
            <Sparkles className="size-4" strokeWidth={1.5} />
          </span>
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
          className="truncate text-xs leading-5 text-fg-3"
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
                  <div className="min-w-0 flex-1 basis-36">
                    <div className="text-[11px] font-medium text-fg-2">
                      {factor.label}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-4 text-fg-3">
                      {factor.detail}
                    </div>
                  </div>
                  <span className="pt-0.5 text-right font-mono text-[10px] leading-4 whitespace-nowrap text-fg-3 tabular-nums">
                    {decimal(factor.weight)} × {decimal(factor.score * 100)}% ={" "}
                    {(factor.weight * factor.score * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 pt-2 text-[11px] font-medium">
                <span className="text-fg-2">Total confidence</span>
                <span
                  className="text-brand tabular-nums"
                  title={`Rounded weighted total: ${weightedTotal.toFixed(4)}%`}
                >
                  {suggestion.confidence}%
                </span>
              </div>
              <div
                className="mt-2 overflow-x-auto border-t-hair border-line-subtle pt-2 font-mono text-[10px] leading-4 whitespace-nowrap text-fg-3"
                title="Weighted factor scores, rounded to the nearest percent"
              >
                {formula}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="flex items-center gap-1.5">
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
              ? "Awaiting approval"
              : item?.status === "resolved"
                ? "Accepted"
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
      </div>
    </section>
  )
}
