import { useEffect, useRef, useState, type ReactNode } from "react"
import { animate, useReducedMotion } from "motion/react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { fmtMoney } from "./store"
import { useSummary } from "./useRecon"
import { delayMs } from "./speed"

function AnimatedMoney({
  cents,
  className,
  testId,
}: {
  cents: number
  className?: string
  testId?: string
}) {
  const [shown, setShown] = useState(cents)
  const last = useRef(cents)
  const reduced = useReducedMotion()
  useEffect(() => {
    const control = animate(last.current, cents, {
      duration: reduced ? 0 : delayMs(240) / 1000,
      ease: "easeOut",
      onUpdate(value) {
        last.current = value
        setShown(Math.round(value))
      },
    })
    return () => control.stop()
  }, [cents, reduced])
  return (
    <span
      data-testid={testId}
      className={cn("text-right whitespace-nowrap tabular-nums", className)}
    >
      {fmtMoney(shown)}
    </span>
  )
}

function BalanceLine({
  label,
  cents,
  strong = false,
}: {
  label: string
  cents: number
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-xs",
        strong
          ? "border-t-hair border-line pt-3 font-medium text-fg"
          : "text-fg-3"
      )}
    >
      <span>{label}</span>
      <AnimatedMoney cents={cents} />
    </div>
  )
}

export function ReconBalance({
  variant = "full",
  className,
  afterDifference,
}: {
  variant?: "full" | "compact"
  afterDifference?: ReactNode
  className?: string
}) {
  const summary = useSummary()
  const left = summary.open + summary.awaitingApproval
  const progress = Math.min(100, (summary.resolved / summary.total) * 100)
  if (variant === "compact")
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 text-xs text-fg-3",
          className
        )}
        aria-live="polite"
      >
        <span>Difference</span>
        <AnimatedMoney
          cents={summary.difference}
          testId="difference"
          className={
            summary.difference === 0
              ? "font-medium text-brand"
              : "font-medium text-fg"
          }
        />
        {afterDifference}
        <span>·</span>
        <span>
          <span data-testid="items-left">{left}</span> left{summary.awaitingApproval > 0 && ` · ${summary.awaitingApproval} with Daniel`}
        </span>
        <span
          role="progressbar"
          aria-label="Exceptions resolved"
          aria-valuenow={summary.resolved}
          aria-valuemin={0}
          aria-valuemax={summary.total}
          className="ml-1 h-1.5 w-20 overflow-hidden rounded-full bg-fill-selected"
        >
          <span
            className="block h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>
    )
  return (
    <section
      aria-label="Reconciliation balance"
      className={cn("rounded-lg border-hair border-line bg-surface", className)}
    >
      <div className="grid gap-5 p-4 sm:grid-cols-2 sm:gap-8">
        <div className="flex flex-col gap-3">
          <BalanceLine
            label="Statement ending"
            cents={summary.statementEnding}
          />
          <BalanceLine
            label="+ Deposits in transit"
            cents={summary.inTransit}
          />
          <BalanceLine
            label="− Outstanding checks"
            cents={summary.outstanding}
          />
          <BalanceLine
            label="Adjusted bank"
            cents={summary.adjustedBank}
            strong
          />
        </div>
        <div className="flex flex-col gap-3">
          <BalanceLine label="GL balance" cents={summary.glBalance} />
          <BalanceLine label="± Adjustments" cents={summary.bookAdjustments} />
          <div className="hidden h-4 sm:block" aria-hidden="true" />
          <BalanceLine
            label="Adjusted book"
            cents={summary.adjustedBook}
            strong
          />
        </div>
      </div>
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-t-hair border-line px-4 py-3"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">Difference</span>
          <span className="text-fg-4">
            · <span data-testid="items-left">{left}</span> left{summary.awaitingApproval > 0 && ` · ${summary.awaitingApproval} with Daniel`}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 text-xl font-semibold tracking-tight",
            summary.difference === 0 && "text-brand"
          )}
        >
          {summary.difference === 0 && <Check className="size-4" />}
          <AnimatedMoney cents={summary.difference} testId="difference" />
        </div>
      </div>
    </section>
  )
}
