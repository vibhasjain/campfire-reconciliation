import { ActionTooltip } from "@/components/ui/tooltip"
import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Keyboard,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommentsInbox, ThreadPin } from "@/comments"
import {
  recon,
  queueItems,
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
import { AiMark } from "@/recon/AiMark"
import { Money } from "@/recon/Money"
import { Suggestion } from "@/recon/Suggestion"
import { ReconBalance } from "@/recon/ReconBalance"
import { DoneState } from "@/recon/DoneState"
import { PageChat } from "@/recon/PageChat"
import { ShortcutsDialog } from "@/recon/ShortcutsDialog"
import { useReconKeys } from "@/recon/keys"
import type { ReconItem } from "@/recon/data"
import { focusRow, nextOpenAfter } from "./navigation"
import "./ledger.css"

function selectItem(id: string) {
  reconUi.set((s) => ({ ...s, selectedItemId: id }))
}

function LedgerLine({
  id,
  side,
  onOpen,
}: {
  id: string
  side: "bank" | "book"
  onOpen: () => void
}) {
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
      onClick={(event) => {
        onOpen()
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
      }}
    >
      <span className="paired-line-meta">
        <span className="paired-side-label">
          {side === "book" ? "Books" : "Bank"}
        </span>
        <time className="text-fg-3 tabular-nums" dateTime={line.date}>
          {line.date.slice(5).replace("-", "/")}
        </time>
      </span>
      <span className="paired-description">{line.description}</span>
      <Money cents={line.amount} />
    </button>
  )
}

function Group({
  item,
  expanded,
  onOpen,
  onToggle,
}: {
  item: ReconItem
  expanded: boolean
  onOpen: () => void
  onToggle: () => void
}) {
  const selected = useReconUi((s) => s.selectedItemId === item.id)
  const index = useReconUi((s) => s.suggestionIndex[item.id] ?? 0)
  const suggestion =
    item.suggestions[Math.min(index, item.suggestions.length - 1)]
  const detail = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!expanded || !window.matchMedia("(max-width: 767px)").matches) return
    const frame = requestAnimationFrame(() => {
      detail.current
        ?.querySelector('[data-action="accept"]')
        ?.parentElement?.scrollIntoView({ block: "nearest" })
    })
    return () => cancelAnimationFrame(frame)
  }, [expanded, index])
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
      tabIndex={-1}
      data-item-id={item.id}
      onClick={(event) => {
        if (
          !(event.target as HTMLElement).closest("button, a, input, textarea")
        )
          onOpen()
      }}
      data-selected={selected || undefined}
      data-resolved={resolved || undefined}
    >
      <div className="paired-grid">
        <div className="paired-side">
          {beginning ? (
            <button className="paired-beginning" onClick={onOpen}>
              <span className="paired-side-label">Books</span>
              <span>Beginning balance</span>
              <Money
                cents={suggestion?.bookDelta ?? item.resolution?.bookDelta ?? 0}
              />
            </button>
          ) : item.bookIds.length ? (
            item.bookIds.map((id) => (
              <LedgerLine key={id} id={id} side="book" onOpen={onOpen} />
            ))
          ) : (
            <button className="paired-ghost" onClick={onOpen}>
              <span className="paired-side-label">Books</span>
              <span>{ghost}</span>
            </button>
          )}
        </div>
        <button
          className="paired-connector"
          aria-label={`${item.status === "open" ? "Suggested: " : "Open "}${item.title}`}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {item.status === "open" && (
            <span className="paired-connector-cue">Suggested</span>
          )}
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
          <span
            className={`paired-node ${resolved || item.status === "awaiting_approval" ? "paired-status" : "paired-proposal"}`}
          >
            {resolved ? (
              <Check />
            ) : item.status === "awaiting_approval" ? (
              <Clock />
            ) : (
              <>
                <span className="paired-dot" />
                <AiMark className="paired-ai-mark" />
              </>
            )}
          </span>
        </button>
        <div className="paired-side">
          {item.bankIds.length ? (
            item.bankIds.map((id) => (
              <LedgerLine key={id} id={id} side="bank" onOpen={onOpen} />
            ))
          ) : (
            <button className="paired-ghost" onClick={onOpen}>
              <span className="paired-side-label">Bank</span>
              <span>
                {beginning
                  ? "August close"
                  : suggestion?.action === "in_transit"
                    ? "In transit · 10/01"
                    : "Outstanding"}
              </span>
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
              tooltip="Unreconcile" shortcut="U"
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
      {expanded && !resolved && (
        <div ref={detail} className="paired-detail">
          {suggestion ? (
            <>
              <Suggestion
                size="compact"
                active={selected}
                suggestion={suggestion}
              />
              {item.suggestions.length > 1 && (
                <div className="paired-alternatives">
                  <Button
                    tooltip="Previous suggestion" shortcut="←"
                    variant="ghost"
                    aria-label="Previous suggestion"
                    onClick={() => cycleSuggestion(item.id, -1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    tooltip="Next suggestion" shortcut="→"
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
  const threadFor = useReconUi((s) => s.threadFor)
  const selectedId = useReconUi((s) => s.selectedItemId)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  useEffect(() => {
    let previous = recon.getState()
    return recon.subscribe(() => {
      const current = recon.getState()
      const before = previous
      previous = current
      const action = current.actions.at(-1)
      const id = reconUi.get().selectedItemId
      if (
        !action ||
        action === before.actions.at(-1) ||
        !id ||
        reconUi.get().threadFor
      )
        return
      if (
        action.actor !== "maya" ||
        !["accept", "matchSelected"].includes(action.kind) ||
        !action.before.items[id]
      )
        return
      const next = nextOpenAfter(
        id,
        queueItems(before).map((item) => item.id)
      )
      reconUi.set((s) => ({ ...s, selectedItemId: next }))
      setExpandedId(next)
    })
  }, [])
  useEffect(() => {
    if (selectedId && !reconUi.get().threadFor && !reconUi.get().pageChatOpen)
      focusRow(selectedId)
  }, [selectedId])
  const openGroup = (id: string) => {
    selectItem(id)
    setExpandedId(id)
  }
  const toggleGroup = (id: string) => {
    selectItem(id)
    setExpandedId(expandedId === id ? null : id)
  }
  const [filter, setFilter] = useState("Unreconciled")
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const reduced = useReducedMotion()
  const [threadAnchor, setThreadAnchor] = useState({
    id: threadFor,
    inQueue: Boolean(
      threadFor && state.items[threadFor]?.status !== "resolved"
    ),
  })
  if (threadAnchor.id !== threadFor) {
    setThreadAnchor({
      id: threadFor,
      inQueue: Boolean(
        threadFor && state.items[threadFor]?.status !== "resolved"
      ),
    })
  }
  const heldItem =
    threadAnchor.inQueue && threadFor ? state.items[threadFor] : undefined
  const pending = [
    ...queue,
    ...(heldItem && !queue.some((item) => item.id === heldItem.id)
      ? [heldItem]
      : []),
  ].filter((item) => item.status !== "resolved" || item.id === heldItem?.id)

  const showResolved = expanded || filter !== "Unreconciled"
  // Keep the same keyed row and ThreadPin mounted until its thread closes.
  const availableResolved = reconciled.filter(
    (item) => !pending.some((pendingItem) => pendingItem.id === item.id)
  )
  const resolvedPage = availableResolved.slice(page * 15, (page + 1) * 15)
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
      setExpandedId(null)
      selectItem(next.id)
      focusRow(next.id)
    }
  }
  useReconKeys({
    move,
    enter: () => {
      const id = reconUi.get().selectedItemId ?? visible[0]?.id
      if (id) toggleGroup(id)
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
          Books (adjusted) <Money cents={summary.adjustedBook} />
        </div>
        <ReconBalance variant="compact" className="paired-balance" />
        <div>
          Statement (adjusted) <Money cents={summary.adjustedBank} />
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
          <ActionTooltip label="Show keyboard shortcuts" shortcut="?">
            <button
              aria-label="Keyboard shortcuts"
              onClick={() => reconUi.set((s) => ({ ...s, shortcutsOpen: true }))}
            >
              <Keyboard />
            </button>
          </ActionTooltip>
        </div>
        {showResolved && (
          <div className="paired-resolved">
            {resolvedPage.map((item) => (
              <Group
                key={item.id}
                item={item}
                expanded={selectedId === item.id && expandedId === item.id}
                onOpen={() => openGroup(item.id)}
                onToggle={() => toggleGroup(item.id)}
              />
            ))}
            <div className="paired-pagination">
              <Button
                tooltip="Previous page"
                variant="ghost"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                tooltip="Next page"
                variant="ghost"
                aria-label="Next page"
                disabled={(page + 1) * 15 >= availableResolved.length}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
        {filter !== "Reconciled" && pending.length > 0 && (
          <AnimatePresence initial={false} mode="popLayout">
            {pending.map((item) => (
              <Group
                key={item.id}
                item={item}
                expanded={selectedId === item.id && expandedId === item.id}
                onOpen={() => openGroup(item.id)}
                onToggle={() => toggleGroup(item.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="paired-done">
        <DoneState compact />
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
