import type { MouseEvent } from "react"
import { Landmark, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BankLine, BookLine } from "./data"
import { fmtDate } from "./store"
import { reconUi, useRecon, useReconUi } from "./useRecon"
import { Money } from "./Money"

export type LineRowProps = {
  side: "bank" | "book"
  lineId?: string
  line?: BankLine | BookLine
  className?: string
}

/** Plain click selects the item; modified clicks build an explicit bank/book selection. */
export function LineRow({
  side,
  lineId,
  line: supplied,
  className,
}: LineRowProps) {
  const line = useRecon(
    (state) =>
      supplied ??
      (side === "bank"
        ? state.bankLines[lineId ?? ""]
        : state.bookLines[lineId ?? ""])
  )
  const selection = useReconUi((state) => state.selectedLines[side])
  const selectedItem = useReconUi((state) => state.selectedItemId)
  if (!line) return null
  const selected = selection.includes(line.id)
  const Icon = side === "bank" ? Landmark : BookOpen
  const reference =
    side === "book" ? `JE ${(line as BookLine).journal}` : line.reference
  function select(event: MouseEvent<HTMLButtonElement>) {
    if (!line) return
    const multi = event.metaKey || event.ctrlKey || event.shiftKey
    reconUi.set((state) => ({
      ...state,
      selectedItemId: line.itemId,
      selectedLines: multi
        ? {
            ...state.selectedLines,
            [side]: selected
              ? state.selectedLines[side].filter((id) => id !== line.id)
              : [...state.selectedLines[side], line.id],
          }
        : { bank: [], book: [] },
    }))
  }
  return (
    <button
      type="button"
      data-line-id={line.id}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={select}
      className={cn(
        "grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-2 py-2 text-left text-xs outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus sm:grid-cols-[64px_62px_minmax(0,1fr)_auto]",
        selected
          ? "bg-brand-tint ring-1 ring-brand/30 ring-inset"
          : selectedItem === line.itemId && "bg-fill-subtle",
        className
      )}
    >
      <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-fg-3">
        <Icon className="size-4 shrink-0" />
        <span>{side === "bank" ? "Bank" : "Books"}</span>
      </span>
      <time
        dateTime={line.date}
        className="hidden whitespace-nowrap text-fg-3 tabular-nums sm:block"
      >
        {fmtDate(line.date)}
      </time>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span title={line.description} className="truncate text-fg-2">{line.description}</span>
        <span className="truncate text-xxs text-fg-4">
          <span className="sm:hidden">{fmtDate(line.date)} · </span>
          {reference ?? line.payee ?? "Statement transaction"}
          {line.reference && side === "book" ? ` · ${line.reference}` : ""}
        </span>
      </span>
      <Money cents={line.amount} />
    </button>
  )
}
