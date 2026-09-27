import { Check, RotateCcw } from "lucide-react"
import type { Card } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Suggestion } from "./Suggestion"
import { Money } from "./Money"
import { useItem, useRecon, itemAmount } from "./useRecon"
import {
  acceptSuggestion,
  rejectSuggestion,
  revertAction,
  unreconcileItem,
} from "./actions"
import { fmtDate } from "./store"

type ReconCardType = Extract<
  Card,
  { kind: "recon-candidate" | "recon-change" | "recon-item" }
>
export type ReconCandidateCard = Extract<
  ReconCardType,
  { kind: "recon-candidate" }
> & { actionId?: string }

function CandidateCard({ card }: { card: ReconCandidateCard }) {
  const action = useRecon((state) =>
    state.actions.find((record) => record.id === card.actionId)
  )
  const item = useItem(card.itemId)
  const suggestion = item?.suggestions.find(
    (candidate) => candidate.id === card.suggestionId
  )
  if (!item || !suggestion)
    return (
      <div className="rounded-lg border-hair border-line px-3 py-2 text-xs text-fg-3">
        Candidate removed
      </div>
    )
  return (
    <Suggestion
      suggestion={suggestion}
      size="compact"
      active={item.status === "open"}
      rejectLabel="Not this one"
      footer={
        action && (
          <div className="flex items-center gap-1 text-[11px] text-fg-3">
            Added to suggestions ·{" "}
            <Button
              size="xs"
              variant="ghost"
              disabled={action.reverted}
              onClick={() => revertAction(action.id)}
            >
              {action.reverted ? "Reverted" : "Revert"}
            </Button>
          </div>
        )
      }
      onAccept={() => {
        acceptSuggestion(item.id, suggestion.id)
      }}
      onReject={() => {
        const result = rejectSuggestion(item.id, suggestion.id)
        if (result.ok)
          void import("@/comments").then(({ postToThread }) =>
            postToThread(item.id, "@ember find another match", [])
          )
      }}
    />
  )
}
function ChangeCard({
  card,
}: {
  card: Extract<ReconCardType, { kind: "recon-change" }>
}) {
  const action = useRecon((state) =>
    state.actions.find((record) => record.id === card.actionId)
  )
  const reverted = Boolean(action?.reverted)
  return (
    <div className="flex items-start gap-3 rounded-lg border-hair border-line bg-surface px-3 py-2.5">
      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1 text-xs">
        <div className="font-medium text-fg">{card.label}</div>
        {card.detail && <div className="mt-1 text-fg-3">{card.detail}</div>}
      </div>
      <Button
        size="xs"
        variant="ghost"
        disabled={!action || reverted}
        onClick={() => {
          revertAction(card.actionId)
        }}
      >
        {reverted ? (
          <Check className="size-4" />
        ) : (
          <RotateCcw className="size-4" />
        )}
        {reverted ? "Reverted" : "Revert"}
      </Button>
    </div>
  )
}
function ItemCard({
  card,
}: {
  card: Extract<ReconCardType, { kind: "recon-item" }>
}) {
  const item = useItem(card.itemId)
  const state = useRecon((state) => state)
  if (!item) return null
  const line =
    state.bankLines[item.bankIds[0]] ?? state.bookLines[item.bookIds[0]]
  return (
    <div
      className="rounded-lg border-hair border-line bg-surface p-3"
      data-item-id={item.id}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-fg">{item.title}</div>
          <div className="mt-1 text-xs text-fg-3">
            {line ? fmtDate(line.date) : ""} ·{" "}
            {item.status === "resolved"
              ? "Reconciled"
              : item.status === "awaiting_approval"
                ? "Awaiting Daniel"
                : "Open"}
          </div>
        </div>
        <Money cents={itemAmount(item, state)} className="text-xs" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-fg-3">
        <span>
          {item.bankIds.length} bank · {item.bookIds.length} book
        </span>
        <Button
          data-action="unreconcile"
          disabled={item.status === "open"}
          onClick={() => {
            unreconcileItem(item.id)
          }}
        >
          Unreconcile
        </Button>
      </div>
    </div>
  )
}
export function ReconCard({ card }: { card: ReconCardType }) {
  if (card.kind === "recon-candidate") return <CandidateCard card={card} />
  if (card.kind === "recon-change") return <ChangeCard card={card} />
  return <ItemCard card={card} />
}
