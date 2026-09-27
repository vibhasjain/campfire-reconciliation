import { useCallback, useMemo, useState } from "react"
import { Check, ChevronDown, Keyboard, Link2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CommentsInbox, ThreadPin, focusThread } from "@/comments"
import {
  reconUi,
  useItem,
  useQueue,
  useReconciled,
  useReconUi,
  useSummary,
} from "@/recon/useRecon"
import { matchSelection, unreconcileItem, useFlash } from "@/recon/actions"
import { LineRow } from "@/recon/LineRow"
import { SuggestionCarousel } from "@/recon/SuggestionCarousel"
import { ReconBalance } from "@/recon/ReconBalance"
import { DoneState } from "@/recon/DoneState"
import { PageChat } from "@/recon/PageChat"
import { ShortcutsDialog } from "@/recon/ShortcutsDialog"
import { useReconKeys } from "@/recon/keys"

function ItemRow({
  itemId,
  compact = false,
}: {
  itemId: string
  compact?: boolean
}) {
  const item = useItem(itemId)
  const selected = useReconUi((state) => state.selectedItemId === itemId)
  const flash = useFlash(itemId)
  if (!item) return null
  return (
    <article
      data-item-id={item.id}
      data-selected={selected || undefined}
      className={cn(
        "group rounded-lg border-hair border-line bg-surface p-3 transition-colors",
        selected && "border-brand/40",
        flash && "bg-ai-tint"
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            reconUi.set((state) => ({ ...state, selectedItemId: item.id }))
          }
          className="min-w-0 flex-1 truncate text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {item.title}
        </button>
        {item.status === "resolved" && (
          <span className="flex items-center gap-1 text-xxs text-brand">
            <Check className="size-4" />
            Reconciled
          </span>
        )}
        {item.status === "awaiting_approval" && (
          <span className="text-xxs text-fg-3">Awaiting Daniel</span>
        )}
        <ThreadPin itemId={item.id} />
        {item.status === "resolved" && (
          <Button
            data-action="unreconcile"
            aria-label={`Unreconcile ${item.title}`}
            variant="ghost"
            onClick={() => unreconcileItem(item.id)}
          >
            <RotateCcw />
            Unreconcile
          </Button>
        )}
      </header>
      <div className="flex flex-col gap-0.5">
        {item.bankIds.map((lineId) => (
          <LineRow key={lineId} side="bank" lineId={lineId} />
        ))}
        {item.bookIds.map((lineId) => (
          <LineRow key={lineId} side="book" lineId={lineId} />
        ))}
      </div>
      {!item.bankIds.length && !item.bookIds.length && (
        <p className="px-2 py-2 text-xs text-fg-3">
          Prior-period adjustment · August close
        </p>
      )}
      {!compact && item.status === "open" && (
        <div className="mt-3">
          <SuggestionCarousel
            itemId={item.id}
            size="compact"
            active={selected}
          />
        </div>
      )}
    </article>
  )
}

/** Reference composition for the three UX lanes. Shared components own behavior. */
// Reference composition of the shared core (not routed). Versions live in v1|v2|v3.
export default function Harness({ version }: { version: 1 | 2 | 3 }) {
  const queue = useQueue()
  const reconciled = useReconciled()
  const summary = useSummary()
  const [showReconciled, setShowReconciled] = useState(false)
  // Touched rows stay in the queue until the resolved list is opened; mount each pin once.
  const visibleQueue = useMemo(
    () =>
      showReconciled
        ? queue.filter((item) => item.status !== "resolved")
        : queue,
    [queue, showReconciled]
  )
  const selectedLines = useReconUi((state) => state.selectedLines)
  const move = useCallback(
    (delta: -1 | 1) => {
      if (!visibleQueue.length) return
      const index = visibleQueue.findIndex(
        (item) => item.id === reconUi.get().selectedItemId
      )
      const next =
        visibleQueue[
          Math.max(
            0,
            Math.min(
              visibleQueue.length - 1,
              index < 0
                ? delta > 0
                  ? 0
                  : visibleQueue.length - 1
                : index + delta
            )
          )
        ]
      reconUi.set((state) => ({ ...state, selectedItemId: next.id }))
      document
        .querySelector(`[data-item-id="${next.id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    },
    [visibleQueue]
  )
  const enter = useCallback(() => {
    const id = reconUi.get().selectedItemId
    if (id) focusThread(id)
  }, [])
  useReconKeys({ move, enter })
  return (
    <section
      className="mx-auto w-full max-w-[1100px] px-4 py-6 lg:px-8"
      data-version={version}
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Chase Operating ••4821
          </h1>
          <p className="mt-1 text-xs text-fg-3">
            September 2026 · Business day 3
          </p>
        </div>
        <Button
          variant="ghost"
          aria-label="Keyboard shortcuts"
          onClick={() =>
            reconUi.set((state) => ({ ...state, shortcutsOpen: true }))
          }
        >
          <Keyboard />
          <span className="hidden sm:inline">Shortcuts</span>
        </Button>
      </header>
      <ReconBalance />
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium">
          Exceptions{" "}
          <span className="ml-1 text-fg-4 tabular-nums">
            {summary.open + summary.awaitingApproval}
          </span>
        </h2>
        <Button
          data-action="match"
          onClick={() => matchSelection()}
          disabled={!selectedLines.bank.length && !selectedLines.book.length}
        >
          <Link2 />
          Match selection
          {selectedLines.bank.length + selectedLines.book.length > 0
            ? ` (${selectedLines.bank.length + selectedLines.book.length})`
            : ""}
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {visibleQueue.map((item) => (
          <ItemRow key={item.id} itemId={item.id} />
        ))}
      </div>
      <div className="my-5">
        <Button
          variant="ghost"
          aria-expanded={showReconciled}
          onClick={() => setShowReconciled((value) => !value)}
        >
          <ChevronDown
            className={cn(
              "transition-transform",
              !showReconciled && "-rotate-90"
            )}
          />
          Reconciled{" "}
          <span className="text-fg-4 tabular-nums">{reconciled.length}</span>
        </Button>
        {showReconciled && (
          <div className="mt-3 flex flex-col gap-2">
            {reconciled.map((item) => (
              <ItemRow key={item.id} itemId={item.id} compact />
            ))}
          </div>
        )}
      </div>
      <DoneState />
      <PageChat />
      <CommentsInbox />
      <ShortcutsDialog />
    </section>
  )
}
