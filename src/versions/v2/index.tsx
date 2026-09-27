import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Keyboard,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentsInbox, ThreadPin } from "@/comments"
import {
  reconUi,
  useRecon,
  useReconUi,
  useQueue,
  useReconciled,
  useSummary,
} from "@/recon/useRecon"
import {
  cycleSuggestion,
  matchSelection,
  unreconcileItem,
} from "@/recon/actions"
import { Money } from "@/recon/Money"
import { Suggestion } from "@/recon/Suggestion"
import { ReconBalance } from "@/recon/ReconBalance"
import { DoneState } from "@/recon/DoneState"
import { PageChat } from "@/recon/PageChat"
import { ShortcutsDialog } from "@/recon/ShortcutsDialog"
import { useReconKeys } from "@/recon/keys"
import type { ReconItem } from "@/recon/data"
import "./ledger.css"

function selectItem(id: string) {
  reconUi.set((s) => ({ ...s, selectedItemId: id }))
}

function LedgerLine({ id, side }: { id: string; side: "bank" | "book" }) {
  const line = useRecon((s) =>
    side === "book" ? s.bookLines[id] : s.bankLines[id]
  )
  const selected = useReconUi((s) => s.selectedLines[side].includes(id))
  if (!line) return null
  return (
    <button
      className="paired-line"
      data-line-id={id}
      data-selected={selected || undefined}
      aria-pressed={selected}
      title={line.description}
      onClick={(event) =>
        reconUi.set((s) => ({
          ...s,
          selectedItemId: line.itemId,
          selectedLines:
            event.metaKey || event.ctrlKey || event.shiftKey
              ? {
                  ...s.selectedLines,
                  [side]: selected
                    ? s.selectedLines[side].filter((value) => value !== id)
                    : [...s.selectedLines[side], id],
                }
              : { bank: [], book: [] },
        }))
      }
    >
      <time className="text-fg-3 tabular-nums" dateTime={line.date}>
        {line.date.slice(5).replace("-", "/")}
      </time>
      <span className="truncate">{line.description}</span>
      <Money cents={line.amount} />
    </button>
  )
}

function Group({ item }: { item: ReconItem }) {
  const selected = useReconUi((s) => s.selectedItemId === item.id)
  const index = useReconUi((s) => s.suggestionIndex[item.id] ?? 0)
  const suggestion =
    item.suggestions[Math.min(index, item.suggestions.length - 1)]
  const resolved = item.status === "resolved"
  const rows = Math.max(item.bookIds.length, item.bankIds.length, 1)
  const pairs = resolved ? item.pairings : suggestion?.pairings
  const ghost =
    suggestion?.entries?.find((entry) => !entry.account.startsWith("1010"))
      ?.account ?? "Proposed entry"
  const beginning = item.id === "r14" && !item.bookIds.length
  return (
    <motion.article
      layout="position"
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      className="paired-group group"
      data-item-id={item.id}
      data-selected={selected || undefined}
      data-resolved={resolved || undefined}
    >
      <div className="paired-grid">
        <div className="paired-side">
          {beginning ? (
            <button
              className="paired-beginning"
              onClick={() => selectItem(item.id)}
            >
              Beginning balance{" "}
              <Money
                cents={suggestion?.bookDelta ?? item.resolution?.bookDelta ?? 0}
              />
            </button>
          ) : item.bookIds.length ? (
            item.bookIds.map((id) => (
              <LedgerLine key={id} id={id} side="book" />
            ))
          ) : (
            <button
              className="paired-ghost"
              onClick={() => selectItem(item.id)}
            >
              {ghost}
            </button>
          )}
        </div>
        <button
          className="paired-connector"
          aria-label={`Open ${item.title}`}
          aria-expanded={selected}
          onClick={() =>
            reconUi.set((s) => ({
              ...s,
              selectedItemId: selected ? null : item.id,
            }))
          }
        >
          <svg
            viewBox={`0 0 64 ${rows * 44}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {pairs?.length
              ? pairs.flatMap((pair, p) =>
                  pair.bookIds.map((bookId) => (
                    <path
                      key={`${p}-${bookId}`}
                      d={`M0 ${(item.bookIds.indexOf(bookId) + 0.5) * 44} C24 ${(item.bookIds.indexOf(bookId) + 0.5) * 44},40 ${(item.bankIds.indexOf(pair.bankIds[0]) + 0.5) * 44},64 ${(item.bankIds.indexOf(pair.bankIds[0]) + 0.5) * 44}`}
                    />
                  ))
                )
              : Array.from({ length: rows }, (_, n) => (
                  <path
                    key={n}
                    d={`M0 ${item.bookIds.length > 1 ? (n + 0.5) * 44 : rows * 22} H24 V${rows * 22} H64`}
                  />
                ))}
          </svg>
          <span className="paired-dot">
            {resolved ? (
              <Check />
            ) : item.status === "awaiting_approval" ? (
              <Clock />
            ) : (
              <Sparkles />
            )}
          </span>
        </button>
        <div className="paired-side">
          {item.bankIds.length ? (
            item.bankIds.map((id) => (
              <LedgerLine key={id} id={id} side="bank" />
            ))
          ) : (
            <button
              className="paired-ghost"
              onClick={() => selectItem(item.id)}
            >
              {beginning
                ? "August close"
                : suggestion?.action === "in_transit"
                  ? "In transit · 10/01"
                  : "Outstanding"}
            </button>
          )}
        </div>
        <div className="paired-tools">
          <ThreadPin itemId={item.id} />
          {resolved && (
            <Button
              variant="ghost"
              className="paired-unreconcile"
              data-action="unreconcile"
              aria-label={`Unreconcile ${item.title}`}
              title="Unreconcile (U)"
              onClick={() => {
                selectItem(item.id)
                unreconcileItem(item.id)
              }}
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      </div>
      {selected && !resolved && (
        <div className="paired-detail">
          {suggestion ? (
            <>
              <Suggestion
                size="compact"
                active={false}
                suggestion={{
                  ...suggestion,
                  entries: undefined,
                  attachmentIds: suggestion.attachmentIds?.slice(0, 1),
                }}
              />
              {item.suggestions.length > 1 && (
                <div className="paired-alternatives">
                  <Button
                    variant="ghost"
                    aria-label="Previous suggestion"
                    onClick={() => cycleSuggestion(item.id, -1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Next suggestion"
                    onClick={() => cycleSuggestion(item.id, 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => reconUi.set((s) => ({ ...s, threadFor: item.id }))}
            >
              Ask Ember
            </Button>
          )}
        </div>
      )}
    </motion.article>
  )
}

export default function V2() {
  const queue = useQueue()
  const reconciled = useReconciled()
  const summary = useSummary()
  const state = useRecon((s) => s)
  const selection = useReconUi((s) => s.selectedLines)
  const [filter, setFilter] = useState("Unreconciled")
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const reduced = useReducedMotion()
  const pending = queue
    .filter((item) => item.status !== "resolved")
    .sort((a, b) =>
      a.id === "r14" ? -1 : b.id === "r14" ? 1 : a.id.localeCompare(b.id)
    )
  const showResolved = expanded || filter !== "Unreconciled"
  const resolvedPage = reconciled.slice(page * 15, (page + 1) * 15)
  const visible = [
    ...(showResolved ? resolvedPage : []),
    ...(filter !== "Reconciled" ? pending : []),
  ]
  const move = (delta: -1 | 1) => {
    const current = visible.findIndex(
      (item) => item.id === reconUi.get().selectedItemId
    )
    const next =
      visible[Math.max(0, Math.min(visible.length - 1, current + delta))]
    if (next) {
      selectItem(next.id)
      requestAnimationFrame(() =>
        document
          .querySelector(`[data-item-id="${next.id}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      )
    }
  }
  useReconKeys({
    move,
    enter: () => {
      if (!reconUi.get().selectedItemId && visible[0]) selectItem(visible[0].id)
    },
    cycle: (delta) => {
      const id = reconUi.get().selectedItemId
      if (id) cycleSuggestion(id, delta)
    },
  })
  const book = selection.book.reduce(
    (sum, id) => sum + (state.bookLines[id]?.amount ?? 0),
    0
  )
  const bank = selection.bank.reduce(
    (sum, id) => sum + (state.bankLines[id]?.amount ?? 0),
    0
  )
  return (
    <section className="paired-ledger" data-version="2">
      <header className="paired-header">
        <div>
          <h1>Chase Operating ••4821</h1>
          <p>September 2026</p>
        </div>
        <div className="paired-filters" aria-label="Ledger filter">
          {["Unreconciled", "Reconciled", "All"].map((label) => (
            <button
              key={label}
              aria-pressed={filter === label}
              onClick={() => {
                setFilter(label)
                setPage(0)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="paired-summary">
        <div>
          Books <Money cents={summary.adjustedBook} />
        </div>
        <ReconBalance variant="compact" className="paired-balance" />
        <div>
          Statement <Money cents={summary.adjustedBank} />
        </div>
      </div>
      <div className="paired-ledger-surface">
        <div className="paired-columns">
          <span>Books (GL)</span>
          <span>Statement</span>
        </div>
        <div className="paired-strip">
          <button
            aria-expanded={showResolved}
            onClick={() => {
              if (filter !== "Unreconciled") setFilter("Unreconciled")
              setExpanded(!showResolved)
            }}
          >
            <ChevronRight className={showResolved ? "rotate-90" : ""} />
            {reconciled.length} reconciled
          </button>
          <button
            aria-label="Keyboard shortcuts"
            onClick={() => reconUi.set((s) => ({ ...s, shortcutsOpen: true }))}
          >
            <Keyboard />
          </button>
        </div>
        {showResolved && (
          <div className="paired-resolved">
            {resolvedPage.map((item) => (
              <Group key={item.id} item={item} />
            ))}
            <div className="paired-pagination">
              <Button
                variant="ghost"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                aria-label="Next page"
                disabled={(page + 1) * 15 >= reconciled.length}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
        {filter !== "Reconciled" && !summary.done && (
          <AnimatePresence initial={false} mode="popLayout">
            {pending.map((item) => (
              <Group key={item.id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="paired-done">
        <DoneState />
      </div>
      {(selection.bank.length > 0 || selection.book.length > 0) && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="paired-selection"
        >
          <span>
            Books <Money cents={book} />
          </span>
          <span>
            Bank <Money cents={bank} />
          </span>
          {book !== bank && (
            <span className="text-danger">
              Δ <Money cents={bank - book} />
            </span>
          )}
          <Button
            variant="brand"
            data-action="match"
            onClick={() => matchSelection()}
          >
            Match <kbd>M</kbd>
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              reconUi.set((s) => ({
                ...s,
                selectedLines: { bank: [], book: [] },
              }))
            }
          >
            Clear
          </Button>
        </motion.div>
      )}
      <PageChat />
      <CommentsInbox />
      <ShortcutsDialog />
    </section>
  )
}
