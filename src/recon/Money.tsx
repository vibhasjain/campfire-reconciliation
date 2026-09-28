import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { fmtMoney } from "./store"

type MoneyProps = Omit<ComponentProps<"span">, "children"> & { cents: number }

export function Money({ cents, className, ...props }: MoneyProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 text-right whitespace-nowrap tabular-nums",
        cents === 0 && "text-fg-4",
        className
      )}
      {...props}
    >
      {fmtMoney(cents)}
    </span>
  )
}

export function Delta({ cents, className, ...props }: MoneyProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 text-right whitespace-nowrap tabular-nums",
        cents === 0 ? "text-fg-4" : "text-fg-2",
        className
      )}
      {...props}
    >
      {fmtMoney(cents, { sign: "plus" })}
    </span>
  )
}
