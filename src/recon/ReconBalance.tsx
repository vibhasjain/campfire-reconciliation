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
      className={cn(
        "shrink-0 text-right whitespace-nowrap tabular-nums",
        className
      )}
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
        "flex min-w-0 items-center justify-between gap-4 text-xs",
        strong
          ? "border-t-hair border-line pt-3 font-medium text-fg"
          : "text-fg-3"
      )}
    >
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
      <AnimatedMoney cents={cents} />
    </div>
  )
}

export function ReconBalance({
  variant = "full",
  className,
  afterDifference,
  showProgress = true,
}: {
  variant?: "full" | "compact"
  afterDifference?: ReactNode
  /** Compact only: the "· bar N left" tail. */
  showProgress?: boolean
  className?: string
}) {
  const summary = useSummary()
  const left = summary.open + summary.awaitingApproval
  const progress = Math.min(100, (summary.resolved / summary.total) * 100)
  if (variant === "compact")
    return (
      <div
        className={cn(
          "recon-balance-compact flex min-w-0 items-center gap-2 text-xs text-fg-3",
          className
        )}
        aria-live="polite"
      >
        <span className="w-16 shrink-0 truncate">Difference</span>
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
        {showProgress && (
          <>
            <span className="w-1 shrink-0 truncate">·</span>
            <span
              role="progressbar"
              aria-label="Exceptions resolved"
              aria-valuenow={summary.resolved}
              aria-valuemin={0}
              aria-valuemax={summary.total}
              className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-fill-selected"
            >
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <span
                className="shrink-0 whitespace-nowrap tabular-nums"
                data-testid="items-left"
              >
                {left}
              </span>
              <span className="min-w-0 truncate">
                left
                {summary.awaitingApproval > 0 &&
                  ` · ${summary.awaitingApproval} with Daniel`}
              </span>
            </span>
          </>
        )}
      </div>
    )
  return (
    <section
      aria-label="Reconciliation balance"
      className={cn("rounded-lg border-hair border-line bg-surface", className)}
    >
      <div className="grid gap-5 p-4 sm:grid-cols-2 sm:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
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
        <div className="flex min-w-0 flex-col gap-3">
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
        className="flex min-w-0 items-center justify-between gap-3 border-t-hair border-line px-4 py-3"
        aria-live="polite"
      >
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="w-16 shrink-0 truncate font-medium">Difference</span>
          <span className="min-w-0 truncate text-fg-4">
            · <span data-testid="items-left">{left}</span> left
            {summary.awaitingApproval > 0 &&
              ` · ${summary.awaitingApproval} with Daniel`}
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
