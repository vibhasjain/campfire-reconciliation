import { Check, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/common/toast"
import { openDialog } from "@/app/ui-store"
import { recon, reconUi, useReconUi, useSummary } from "./useRecon"
import { summarize } from "./store"
import { Money } from "./Money"

export function DoneState() {
  const summary = useSummary()
  const completed = useReconUi((state) => state.completed)
  const complete = () =>
    openDialog({
      kind: "confirm",
      props: {
        title: "Submit to Daniel Kim for review?",
        body: "September 2026 · Chase Operating ••4821",
        confirmLabel: "Submit for review",
        tone: "brand",
        onConfirm() {
          if (!summarize(recon.getState()).done) return
          reconUi.set((state) => ({ ...state, completed: true }))
          toast("Submitted to Daniel for review", { tone: "success" })
        },
      },
    })
  const button = (
    <Button
      data-testid="complete"
      variant="brand"
      size="sm"
      disabled={!summary.done || completed}
      onClick={complete}
    >
      {completed ? (
        <>
          <CheckCheck />
          Submitted for review
        </>
      ) : (
        "Complete reconciliation"
      )}
    </Button>
  )
  if (!summary.done)
    return (
      <div className="flex justify-end py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            {summary.open + summary.awaitingApproval} items left
            {summary.awaitingApproval
              ? ` · ${summary.awaitingApproval} awaiting approval`
              : ""}
            {summary.difference !== 0 ? " · Difference must be $0.00" : ""}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  return (
    <section
      data-testid="done"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border-hair border-line bg-brand-tint px-4 py-4"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-primary-foreground">
          <Check className="size-4" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-brand">
            Reconciled · $0.00 difference
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-fg-3">
            <span>{summary.resolved} resolved</span>
            <span>·</span>
            <span>{summary.autoMatched} auto-matched</span>
            <span>·</span>
            <span>
              Adjusted balance <Money cents={summary.adjustedBank} />
            </span>
          </div>
        </div>
      </div>
      {button}
    </section>
  )
}
