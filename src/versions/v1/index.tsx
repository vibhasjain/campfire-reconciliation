import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Keyboard,
  RotateCcw,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  TABLE_CELL,
  TABLE_HEADER,
  TABLE_ROW,
} from "@/components/common/table-styles"
import { openHalfSheet, closeHalfSheet, ui, useUI } from "@/app/ui-store"
import { CommentsInbox, ThreadPin, ThreadView } from "@/comments"
import { cn } from "@/lib/utils"
import {
  recon,
  reconUi,
  useRecon,
  useReconUi,
  useQueue,
  useReconciled,
  useSummary,
  useItem,
  itemAmount,
  queueItems,
} from "@/recon/useRecon"
import {
  cycleSuggestion,
  matchSelection,
  unreconcileItem,
} from "@/recon/actions"
import { useReconKeys } from "@/recon/keys"
import { Money, Delta } from "@/recon/Money"
import { fmtDate } from "@/recon/store"
import { ReconBalance } from "@/recon/ReconBalance"
import { AiMark } from "@/recon/AiMark"
import { LineRow } from "@/recon/LineRow"
import { SuggestionCarousel } from "@/recon/SuggestionCarousel"
import { DoneState } from "@/recon/DoneState"
import { PageChat } from "@/recon/PageChat"
import { ShortcutsDialog } from "@/recon/ShortcutsDialog"
import type { ReconItem, Action } from "@/recon/data"
import "./workbench.css"

const labels: Record<Action, string> = {
  match: "Match",
  match_many: "Match",
  match_adjust: "Match + fee",
  create_je: "Create JE",
  create_bill: "Create bill",
  fix_amount: "Fix amount",
  outstanding: "Outstanding",
  in_transit: "In transit",
  reverse_dup: "Reverse dup",
  reverse_void: "Reverse void",
}
function actionLabel(item: ReconItem) {
  const suggestion = item.suggestions[0]
  if (!suggestion) return "Review"
  if (suggestion.action === "match_many")
    return `Match ${suggestion.bookIds.length}`
  if (
    suggestion.action === "match_adjust" &&
    suggestion.entries?.some((entry) => /\bFX\b/i.test(entry.account))
  )
    return "Match + FX"
  return labels[suggestion.action]
}
const phoneLabels: Record<string, string> = {
  "Create JE": "JE",
  "Create bill": "Bill",
  Outstanding: "Outst.",
  "In transit": "Transit",
  "Fix amount": "Fix",
  "Match + fee": "+ fee",
  "Match + FX": "+ FX",
  "Reverse dup": "Dup",
  "Reverse void": "Void",
}
const groups = ["Books only", "Suggested", "Bank only", "Needs approval"]
const groupFor = (item: ReconItem) =>
  item.suggestions.some((s) => s.approval)
    ? "Needs approval"
    : !item.bankIds.length
      ? "Books only"
      : !item.bookIds.length
        ? "Bank only"
        : "Suggested"
const ordered = (items: ReconItem[]) =>
  groups.flatMap((group) => items.filter((item) => groupFor(item) === group))

// Follows v1's grouped display order, which differs from the core queue order.
function nextOpenAfter(itemId: string) {
  const items = ordered(queueItems(recon.getState()))
  const index = items.findIndex((item) => item.id === itemId)
  return [...items.slice(index + 1), ...items.slice(0, index + 1)].find(
    (item) => item.id !== itemId && item.status === "open"
  )
}

function useSheetChatOffset() {
  const sheetOpen = useUI((state) => Boolean(state.halfSheet))
  useEffect(() => {
    const body = document.body
    const previous = body.style.getPropertyValue("--page-chat-offset")
    const reset = () =>
      previous
        ? body.style.setProperty("--page-chat-offset", previous)
        : body.style.removeProperty("--page-chat-offset")
    if (!sheetOpen) return
    const sheet = document.querySelector<HTMLElement>(
      '[data-slot="half-sheet"]'
    )
    if (!sheet) return
    const desktop = window.matchMedia("(min-width: 1024px)")
    const update = () => {
      if (desktop.matches)
        body.style.setProperty(
          "--page-chat-offset",
          `${sheet.getBoundingClientRect().width}px`
        )
      else reset()
    }
    const observer = new ResizeObserver(update)
    observer.observe(sheet)
    desktop.addEventListener("change", update)
    update()
    return () => {
      observer.disconnect()
      desktop.removeEventListener("change", update)
      reset()
    }
  }, [sheetOpen])
}

function SelectionPill() {
  const selection = useReconUi((s) => s.selectedLines)
  const state = useRecon((s) => s)
  const count = selection.bank.length + selection.book.length
  if (!count) return null
  const delta =
    selection.bank.reduce(
      (sum, id) => sum + (state.bankLines[id]?.amount ?? 0),
      0
    ) -
    selection.book.reduce(
      (sum, id) => sum + (state.bookLines[id]?.amount ?? 0),
      0
    )
  return (
    <div className="wb-selection fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border-hair border-line bg-surface px-3 py-2 text-xs whitespace-nowrap shadow-menu">
      <span>{count} selected</span>
      <span className="text-fg-3">
        Δ <Delta cents={delta} />
      </span>
      <Button
        variant="brand"
        data-action="match"
        onClick={() => matchSelection()}
        title="Match (M)"
      >
        Match <kbd>M</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear selection"
        onClick={() =>
          reconUi.set((s) => ({ ...s, selectedLines: { bank: [], book: [] } }))
        }
      >
        <X />
      </Button>
    </div>
  )
}

function Detail({ move }: { move: (delta: -1 | 1) => void }) {
  const id = useReconUi((s) => s.selectedItemId)
  const item = useItem(id)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => heading.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [id])
  if (!item) return null
  return (
    <div className="wb-detail" data-workbench-detail>
      <div className="flex items-start gap-3 py-5">
        <h2
          ref={heading}
          tabIndex={-1}
          className="min-w-0 flex-1 text-lg font-medium outline-none"
        >
          {item.title}
        </h2>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous item"
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next item"
            onClick={() => move(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="space-y-1 pb-4">
        {item.bankIds.map((lineId) => (
          <LineRow key={lineId} side="bank" lineId={lineId} />
        ))}
        {item.bookIds.map((lineId) => (
          <LineRow key={lineId} side="book" lineId={lineId} />
        ))}
        {!item.bankIds.length && !item.bookIds.length && (
          <div className="text-xs text-fg-3">
            Beginning balance{" "}
            <Money
              className="float-right"
              cents={item.suggestions[0]?.bookDelta ?? 0}
            />
          </div>
        )}
      </div>
      <div className="pb-5">
        {item.status === "resolved" ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs text-brand">
              <Check className="size-4" />
              Reconciled
            </span>
            <Button
              data-action="unreconcile"
              variant="outline"
              onClick={() => unreconcileItem(item.id)}
              title="Unreconcile (U)"
            >
              <RotateCcw />
              Unreconcile<kbd>U</kbd>
            </Button>
          </div>
        ) : (
          <SuggestionCarousel itemId={item.id} size="compact" />
        )}
      </div>
      <div className="border-t-hair border-line pt-4">
        <h3 className="pb-3 text-xs font-medium">Conversation</h3>
        <ThreadView
          key={item.id}
          itemId={item.id}
          variant="sheet"
          className="wb-thread"
        />
      </div>
    </div>
  )
}

function Balance() {
  const s = useSummary()
  const lines: [string, number][] = [
    ["Statement ending", s.statementEnding],
    ["In transit", s.inTransit],
    ["Outstanding", -s.outstanding],
    ["Adjusted bank", s.adjustedBank],
    ["GL balance", s.glBalance],
    ["Adjustments", s.bookAdjustments],
    ["Adjusted book", s.adjustedBook],
  ]
  return (
    <div className="border-y-hair sticky top-0 z-10 flex items-center gap-2 border-line bg-page py-4">
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Reconciliation bridge"
            className="wb-balance flex min-h-9 flex-1 items-center rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ReconBalance
              variant="compact"
              afterDifference={<ChevronDown className="size-4 text-fg-3" />}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 max-w-[calc(100vw-2rem)] p-4"
        >
          <h2 className="mb-4 text-sm font-medium">Balance bridge</h2>
          <div className="space-y-3">
            {lines.map(([label, cents], index) => (
              <div
                key={label}
                className={cn(
                  "flex justify-between gap-4 text-xs text-fg-3",
                  (index === 3 || index === 6) &&
                    "border-t-hair border-line pt-3 font-medium text-fg"
                )}
              >
                <span>{label}</span>
                <Money cents={cents} />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Keyboard shortcuts"
        onClick={() => reconUi.set((s) => ({ ...s, shortcutsOpen: true }))}
      >
        <Keyboard />
      </Button>
    </div>
  )
}

export default function Workbench() {
  useSheetChatOffset()
  const queue = useQueue()
  const reconciled = useReconciled()
  const summary = useSummary()
  const state = useRecon((s) => s)
  const selected = useReconUi((s) => s.selectedItemId)
  const selection = useReconUi((s) => s.selectedLines)
  const [tab, setTab] = useState("To review")
  const [page, setPage] = useState(0)
  const pending = ordered(queue.filter((item) => item.status !== "resolved"))
  const all =
    tab === "To review"
      ? pending
      : tab === "Reconciled"
        ? reconciled
        : [...pending, ...reconciled]
  const visible = all.slice(page * 50, page * 50 + 50)
  const itemsRef = useRef(all)
  const tabRef = useRef(tab)
  const retainedIndex = useRef(0)
  useEffect(() => {
    itemsRef.current = all
    tabRef.current = tab
    const index = all.findIndex((item) => item.id === selected)
    if (index >= 0) retainedIndex.current = index
  })
  useEffect(() => {
    if (!reconUi.get().selectedItemId) {
      const first = itemsRef.current[0]
      if (first)
        reconUi.set((state) => ({ ...state, selectedItemId: first.id }))
    }
  }, [])
  // Detail reads the same selection, so Undo also restores an open sheet's item.
  useEffect(() => {
    if (!selected) return
    let scrollFrame = 0
    const frame = requestAnimationFrame(() => {
      let items = itemsRef.current
      if (
        !items.some((item) => item.id === selected) &&
        recon.getState().items[selected]?.status === "open"
      ) {
        setTab("To review")
        items = ordered(
          queueItems(recon.getState()).filter(
            (item) => item.status !== "resolved"
          )
        )
      }
      const index = items.findIndex((item) => item.id === selected)
      if (index >= 0) setPage(Math.floor(index / 50))
      scrollFrame = requestAnimationFrame(() => {
        document
          .querySelector(`[data-item-id="${selected}"]`)
          ?.scrollIntoView({ block: "nearest" })
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      cancelAnimationFrame(scrollFrame)
    }
  }, [selected])
  const move = useCallback(function navigate(delta: -1 | 1) {
    const items = itemsRef.current
    const index = items.findIndex(
      (item) => item.id === reconUi.get().selectedItemId
    )
    const nextIndex = Math.max(
      0,
      Math.min(
        items.length - 1,
        index < 0
          ? Math.max(0, retainedIndex.current + (delta < 0 ? -1 : 0))
          : index + delta
      )
    )
    const next = items[nextIndex]
    if (!next) return
    setPage(Math.floor(nextIndex / 50))
    reconUi.set((s) => ({ ...s, selectedItemId: next.id }))
    openHalfSheet({
      title: "Review transaction",
      content: <Detail move={navigate} />,
    })
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-item-id="${next.id}"]`)
        ?.scrollIntoView({ block: "nearest" })
    )
  }, [])
  const open = useCallback(
    (id: string) => {
      reconUi.set((s) => ({ ...s, selectedItemId: id }))
      openHalfSheet({
        title: "Review transaction",
        content: <Detail move={move} />,
      })
    },
    [move]
  )
  const enter = useCallback(() => {
    const id = reconUi.get().selectedItemId ?? itemsRef.current[0]?.id
    if (id) open(id)
  }, [open])
  const cycle = useCallback((delta: -1 | 1) => {
    const id = reconUi.get().selectedItemId
    if (id) cycleSuggestion(id, delta)
  }, [])
  useReconKeys({ move, enter, cycle })
  useEffect(() => {
    let lastAction = recon.getState().actions.at(-1)
    return recon.subscribe(() => {
      const state = recon.getState()
      const action = state.actions.at(-1)
      const fresh = action !== lastAction
      lastAction = action
      const id = reconUi.get().selectedItemId
      // Only Maya's explicit acceptance advances. Ember, matching and later
      // approvals retain the conversation and its reversible change card.
      if (
        !fresh ||
        !id ||
        tabRef.current !== "To review" ||
        action?.kind !== "accept" ||
        action.actor !== "maya" ||
        action.itemId !== id
      )
        return
      const next = nextOpenAfter(id)
      reconUi.set((s) => ({ ...s, selectedItemId: next?.id ?? null }))
      if (!next) closeHalfSheet()
    })
  }, [])
  useEffect(
    () => () => {
      if (ui.get().halfSheet) closeHalfSheet()
    },
    []
  )
  function select(event: MouseEvent, item: ReconItem) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      open(item.id)
      return
    }
    const anchor = all.findIndex((row) => row.id === selected)
    const end = all.findIndex((row) => row.id === item.id)
    const range =
      event.shiftKey && anchor >= 0
        ? all.slice(Math.min(anchor, end), Math.max(anchor, end) + 1)
        : [item]
    reconUi.set((s) => {
      const bank = new Set(s.selectedLines.bank),
        book = new Set(s.selectedLines.book)
      const remove =
        !event.shiftKey &&
        item.bankIds.every((id) => bank.has(id)) &&
        item.bookIds.every((id) => book.has(id))
      for (const row of range) {
        row.bankIds.forEach((id) => (remove ? bank.delete(id) : bank.add(id)))
        row.bookIds.forEach((id) => (remove ? book.delete(id) : book.add(id)))
      }
      return {
        ...s,
        selectedItemId: item.id,
        selectedLines: { bank: [...bank], book: [...book] },
      }
    })
  }
  return (
    <section className="wb-page px-4 py-6 lg:px-7" data-version="1">
      <header className="wb-header mb-2 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Chase Operating ••4821
          </h1>
          <p className="mt-1.5 text-xs text-fg-3">September 2026</p>
        </div>
        <div
          role="tablist"
          aria-label="Transaction status"
          className="flex rounded-md border-hair border-line bg-segment p-1"
        >
          {["To review", "Reconciled", "All"].map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => {
                setTab(name)
                setPage(0)
              }}
              className={cn(
                "min-h-9 rounded-md px-3 text-xs whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-focus",
                tab === name
                  ? "bg-segment-active font-medium text-fg"
                  : "text-fg-3"
              )}
            >
              {name}
              {name !== "All" && (
                <span className="ml-2 text-fg-3 tabular-nums">
                  {name === "To review" ? pending.length : reconciled.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>
      <Balance />
      {summary.done && tab === "To review" ? (
        <div className="wb-done mt-8">
          <DoneState compact />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border-hair border-line">
          <table className="wb-table w-full table-fixed border-collapse">
            <colgroup>
              <col className="wb-date w-20" />
              <col />
              <col className="w-32" />
              <col className="wb-suggestion w-40" />
              <col className="wb-pin w-20" />
            </colgroup>
            <thead>
              <tr>
                {["Date", "Description", "Amount", "Suggestion", ""].map(
                  (label, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={cn(
                        TABLE_HEADER,
                        i === 0 && "wb-date",
                        i === 2 && "text-right",
                        i === 3 && "wb-suggestion",
                        i === 4 && "wb-pin"
                      )}
                    >
                      <span className={!label ? "sr-only" : undefined}>
                        {label || "Conversation"}
                      </span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {visible.map((item, rowIndex) => {
                  const group =
                    item.status === "resolved" ? "Reconciled" : groupFor(item)
                  const previous = visible[rowIndex - 1]
                  const showGroup =
                    !previous ||
                    group !==
                      (previous.status === "resolved"
                        ? "Reconciled"
                        : groupFor(previous))
                  const line =
                    state.bankLines[item.bankIds[0]] ??
                    state.bookLines[item.bookIds[0]]
                  const multi = [...item.bankIds, ...item.bookIds].some((id) =>
                    [...selection.bank, ...selection.book].includes(id)
                  )
                  return (
                    <motion.tr
                      key={item.id}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      data-item-id={item.id}
                      data-selected={selected === item.id || multi || undefined}
                      tabIndex={0}
                      aria-label={item.title}
                      onClick={(event) => select(event, item)}
                      onFocus={(event) => {
                        if (event.target === event.currentTarget)
                          reconUi.set((s) => ({
                            ...s,
                            selectedItemId: item.id,
                          }))
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault()
                          open(item.id)
                        }
                      }}
                      className={cn(
                        TABLE_ROW,
                        "group outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                        showGroup && "wb-group-start"
                      )}
                    >
                      <td className={cn(TABLE_CELL, "wb-date text-fg-3")}>
                        {showGroup && (
                          <div className="wb-group-label">
                            {group}
                            <span className="ml-2 tabular-nums">
                              {
                                all.filter(
                                  (row) =>
                                    (row.status === "resolved"
                                      ? "Reconciled"
                                      : groupFor(row)) === group
                                ).length
                              }
                            </span>
                          </div>
                        )}
                        {line ? fmtDate(line.date) : "Sep 1"}
                      </td>
                      <td
                        className={cn(TABLE_CELL, "wb-name")}
                        title={item.title}
                      >
                        <span>{item.title}</span>
                      </td>
                      <td className={cn(TABLE_CELL, "text-right")}>
                        <Money
                          cents={
                            line
                              ? itemAmount(item, state)
                              : (item.suggestions[0]?.bookDelta ?? 0)
                          }
                        />
                      </td>
                      <td className={cn(TABLE_CELL, "wb-suggestion")}>
                        <span className="flex items-center gap-2 text-xs text-fg-3">
                          {item.status === "resolved" ? (
                            <Check className="size-4 shrink-0 text-brand" />
                          ) : item.status === "awaiting_approval" ? (
                            <Clock3 className="size-4 shrink-0 text-brand" />
                          ) : (
                            <AiMark />
                          )}
                          <span className="wb-action-label">
                            {item.status === "resolved"
                              ? "Reconciled"
                              : item.status === "awaiting_approval"
                                ? "Awaiting Daniel"
                                : actionLabel(item)}
                          </span>
                          <span className="wb-phone-action">
                            {item.status === "resolved"
                              ? "Done"
                              : item.status === "awaiting_approval"
                                ? "Daniel"
                                : (phoneLabels[actionLabel(item)] ??
                                  actionLabel(item))}
                          </span>
                        </span>
                      </td>
                      <td className={cn(TABLE_CELL, "wb-pin relative")}>
                        <ThreadPin itemId={item.id} />
                        {item.status === "resolved" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-action="unreconcile"
                            aria-label={`Unreconcile ${item.title}`}
                            title="Unreconcile (U)"
                            className="wb-unreconcile absolute top-1 right-1"
                            onClick={(event) => {
                              event.stopPropagation()
                              unreconcileItem(item.id)
                            }}
                          >
                            <RotateCcw />
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
      <footer className="mt-4 flex items-center justify-end">
        {all.length > 50 && (
          <div className="flex items-center gap-2 text-xs text-fg-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft />
            </Button>
            <span>
              {page + 1} / {Math.ceil(all.length / 50)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={(page + 1) * 50 >= all.length}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </footer>
      <SelectionPill />
      <PageChat />
      <CommentsInbox />
      <ShortcutsDialog />
    </section>
  )
}
