import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  MessageSquare,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useMediaQuery } from "@/app/hooks"
import {
  CommentsInbox,
  ThreadView,
  ThreadPopover,
  focusThread,
} from "@/comments"
import { useDB } from "@/data/store"
import {
  recon,
  reconUi,
  useRecon,
  useReconUi,
  useSummary,
  useReconciled,
  itemAmount,
} from "@/recon/useRecon"
import {
  acceptSuggestion,
  activeSuggestion,
  cycleSuggestion,
  matchSelection,
  rejectSuggestion,
  unreconcileItem,
  useFlash,
} from "@/recon/actions"
import { useReconKeys } from "@/recon/keys"
import { Money } from "@/recon/Money"
import { LineRow } from "@/recon/LineRow"
import { Suggestion } from "@/recon/Suggestion"
import { ReconBalance } from "@/recon/ReconBalance"
import { DoneState } from "@/recon/DoneState"
import { PageChat } from "@/recon/PageChat"
import { ShortcutsDialog } from "@/recon/ShortcutsDialog"
import type { ReconItem } from "@/recon/data"
import "./flow.css"

function choose(id: string) {
  reconUi.set((s) => ({ ...s, selectedItemId: id, threadFor: null }))
}
function Status({ item }: { item: ReconItem }) {
  return item.status === "resolved" ? (
    <Check className="size-4 text-brand" />
  ) : item.status === "awaiting_approval" ? (
    <Clock3 className="size-4 text-accent-orange-text" />
  ) : (
    <Circle className="size-4 text-fg-4" />
  )
}
function ThreadDock({ id }: { id: string }) {
  const phone = useMediaQuery("(max-width: 639px)")
  const open = useReconUi((s) => s.threadFor === id)
  const hasMessages = useDB((s) =>
    Object.values(s.messages).some((m) => m.chatId === `thread:${id}`)
  )
  useEffect(() => {
    if (reconUi.get().threadFor === id) return
    const timer = window.setTimeout(() => {
      const active = document.activeElement
      if (
        reconUi.get().threadFor !== id &&
        active instanceof HTMLElement &&
        active.closest("[data-thread-item]")
      )
        active.blur()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [id])
  const trigger = (
    <button
      data-action="comment"
      className="flow-composer"
      onClick={() => focusThread(id)}
    >
      <MessageSquare className="size-4" />
      <span>Ask Ember or @mention…</span>
    </button>
  )
  if (phone) return <ThreadPopover itemId={id}>{trigger}</ThreadPopover>
  return (
    <div className="flow-thread rounded-lg border-hair border-line bg-surface">
      {open || hasMessages ? (
        <div>
          <ThreadView itemId={id} variant="docked" />
        </div>
      ) : (
        trigger
      )}
    </div>
  )
}
function FocusCard({ item }: { item: ReconItem }) {
  const index = useReconUi((s) => s.suggestionIndex[item.id] ?? 0)
  const selected = useReconUi((s) => s.selectedLines)
  const suggestion =
    item.suggestions[Math.min(index, item.suggestions.length - 1)]
  const flash = useFlash(item.id)
  const amount = itemAmount(item) || suggestion?.bookDelta || 0
  const bankIds = suggestion?.bankIds.length ? suggestion.bankIds : item.bankIds
  const bookIds = suggestion?.bookIds.length ? suggestion.bookIds : item.bookIds
  const label =
    item.status === "resolved"
      ? "Reconciled"
      : item.status === "awaiting_approval"
        ? "Awaiting approval"
        : suggestion?.approval
          ? "Needs approval"
          : !item.bookIds.length
            ? "Bank only"
            : !item.bankIds.length
              ? "Books only"
              : "Suggested match"
  return (
    <>
      <article
        data-item-id={item.id}
        data-selected="true"
        className={`flow-card rounded-[12px] border-hair border-line bg-surface ${flash ? "flow-flash" : ""}`}
      >
        <header className="flow-card-header">
          <p className="text-xs text-fg-3">{label}</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-2xl font-medium tracking-tight">
              {item.title}
            </h1>
            <Money
              cents={amount}
              className="flow-amount text-2xl font-medium"
            />
          </div>
        </header>
        <div className="flow-lines">
          {(["bank", "book"] as const).map((side) => (
            <div key={side}>
              {(side === "bank" ? bankIds : bookIds).length ? (
                (side === "bank" ? bankIds : bookIds).map((id) => (
                  <LineRow
                    key={id}
                    side={side}
                    lineId={id}
                    className={
                      (side === "bank"
                        ? recon.getState().bankLines[id]
                        : recon.getState().bookLines[id]
                      )?.amount === amount
                        ? "flow-line flow-same-amount"
                        : "flow-line"
                    }
                  />
                ))
              ) : (
                <div className="px-2 py-3 text-xs text-fg-3">
                  {side === "bank" ? "Not on statement" : "Not in books"}
                </div>
              )}
            </div>
          ))}
        </div>
        {suggestion && item.status !== "resolved" && (
          <div className="flow-suggestion">
            <Suggestion
              suggestion={{
                ...suggestion,
                entries: undefined,
                attachmentIds: suggestion.attachmentIds?.slice(0, 1),
              }}
              size="full"
              active={false}
            />
            {item.suggestions.length > 1 && (
              <div className="mt-2 flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  aria-label="Previous suggestion"
                  onClick={() => cycleSuggestion(item.id, -1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-fg-3">
                  {Math.min(index + 1, item.suggestions.length)} of{" "}
                  {item.suggestions.length}
                </span>
                <Button
                  variant="ghost"
                  aria-label="Next suggestion"
                  onClick={() => cycleSuggestion(item.id, 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        <footer className="flow-actions">
          {item.status === "resolved" ? (
            <Button
              data-action="unreconcile"
              variant="ghost"
              onClick={() => unreconcileItem(item.id)}
              title="Unreconcile · U"
            >
              <RotateCcw className="size-4" />
              Unreconcile
            </Button>
          ) : (
            <>
              <Button
                data-action="accept"
                variant="brand"
                className="flow-accept"
                disabled={item.status !== "open" || !suggestion}
                onClick={() => acceptSuggestion(item.id)}
                title="Accept · A / Enter"
              >
                <Check className="size-4" />
                {item.status === "awaiting_approval"
                  ? "Awaiting approval"
                  : "Accept"}
              </Button>
              <Button
                data-action="reject"
                variant="ghost"
                disabled={item.status !== "open" || !suggestion}
                onClick={() => rejectSuggestion(item.id)}
                title="Reject · X"
              >
                Reject
              </Button>
            </>
          )}
          {!!(selected.bank.length + selected.book.length) && (
            <Button
              data-action="match"
              variant="outline"
              onClick={() => matchSelection()}
              title="Match · M"
            >
              Match
            </Button>
          )}
        </footer>
      </article>
      <ThreadDock id={item.id} />
    </>
  )
}

export default function V3() {
  const items = useRecon((s) => Object.values(s.items))
  const exceptions = useMemo(
    () => items.filter((i) => i.kind === "exception"),
    [items]
  )
  const pending = useMemo(
    () => items.filter((i) => i.status !== "resolved"),
    [items]
  )
  const selectedId = useReconUi((s) => s.selectedItemId)
  const selectedLines = useReconUi((s) => s.selectedLines)
  const summary = useSummary()
  const reconciled = useReconciled()
  const [overview, setOverview] = useState(false)
  const [history, setHistory] = useState(false)
  const [lineMode, setLineMode] = useState(false)
  const reduced = useReducedMotion()
  const current = items.find((i) => i.id === selectedId) ?? pending[0]
  useEffect(() => {
    if (!selectedId && pending[0]) choose(pending[0].id)
  }, [selectedId, pending])
  // Observe core actions so pointer, keyboard, and Ember accepts all advance alike.
  useEffect(
    () =>
      recon.subscribe(() => {
        const state = recon.getState()
        const id = reconUi.get().selectedItemId
        if (!id || state.items[id]?.status === "open") return
        const action = state.actions.at(-1)
        if (
          !action ||
          ![
            "accept",
            "match",
            "match_many",
            "matchSelected",
            "approve",
          ].includes(action.kind)
        )
          return
        const next = Object.values(state.items).find((i) => i.status === "open")
        if (next) choose(next.id)
      }),
    []
  )
  const move = useCallback(
    (delta: -1 | 1) => {
      const list = pending.length ? pending : exceptions
      if (!list.length) return
      const index = list.findIndex((i) => i.id === reconUi.get().selectedItemId)
      choose(list[(index + delta + list.length) % list.length].id)
    },
    [pending, exceptions]
  )
  const enter = useCallback(() => {
    const id = reconUi.get().selectedItemId
    if (id && activeSuggestion(id)) acceptSuggestion(id)
  }, [])
  const cycle = useCallback((delta: -1 | 1) => {
    const id = reconUi.get().selectedItemId
    if (id) cycleSuggestion(id, delta)
  }, [])
  useReconKeys({ move, enter, cycle })
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (event.target as HTMLElement)?.closest(
          'input,textarea,[contenteditable="true"],[role="dialog"]'
        )
      )
        return
      if (event.key.toLowerCase() === "s") {
        event.preventDefault()
        move(1)
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault()
        setOverview((v) => !v)
      }
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [move])
  return (
    <section className="flow text-fg" data-version="3">
      <div className="flow-strip border-b-hair border-line">
        <div className="flow-navigation">
          <div className="flow-rail" aria-label="Exceptions">
            {exceptions.map((item) => (
              <button
                key={item.id}
                title={item.title}
                aria-label={`${item.title}: ${item.status}`}
                aria-current={current?.id === item.id ? "step" : undefined}
                onClick={() => choose(item.id)}
              >
                <span
                  className={`flow-dot ${item.status} ${current?.id === item.id ? "current" : ""}`}
                />
              </button>
            ))}
          </div>
          <Popover open={overview} onOpenChange={setOverview}>
            <PopoverTrigger asChild>
              <Button variant="ghost" title="Overview · L">
                All {exceptions.length}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="flow-overview w-[440px] max-w-[calc(100vw-24px)] p-2"
            >
              <Button variant="ghost" onClick={() => setLineMode((v) => !v)}>
                {lineMode ? "Exceptions" : "Select lines"}
              </Button>
              {lineMode ? (
                <div className="max-h-[60vh] overflow-y-auto">
                  {pending.flatMap((item) =>
                    (["bank", "book"] as const).flatMap((side) =>
                      (side === "bank" ? item.bankIds : item.bookIds).map(
                        (id) => (
                          <LineRow
                            key={id}
                            side={side}
                            lineId={id}
                            className="flow-line"
                          />
                        )
                      )
                    )
                  )}
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  {exceptions.map((item) => (
                    <div key={item.id}>
                      <button
                        data-item-id={item.id}
                        className="flow-list-row"
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey) {
                            reconUi.set((s) => ({
                              ...s,
                              selectedLines: {
                                bank: [
                                  ...new Set([
                                    ...s.selectedLines.bank,
                                    ...item.bankIds,
                                  ]),
                                ],
                                book: [
                                  ...new Set([
                                    ...s.selectedLines.book,
                                    ...item.bookIds,
                                  ]),
                                ],
                              },
                            }))
                          } else {
                            choose(item.id)
                            setOverview(false)
                          }
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                        <Money cents={itemAmount(item)} />
                        <Status item={item} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!!(selectedLines.bank.length + selectedLines.book.length) && (
                <Button
                  data-action="match"
                  variant="brand"
                  onClick={() => matchSelection()}
                  title="Match · M"
                >
                  Match
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
        <ReconBalance variant="compact" className="flow-balance" />
      </div>
      <div className="flow-history">
        <button className="text-xs text-fg-3" onClick={() => setHistory(true)}>
          Reconciled {summary.autoMatched} + {summary.resolved}
        </button>
      </div>
      <div className="flow-stage">
        <AnimatePresence mode="wait" initial={false}>
          {summary.done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flow-done"
            >
              <DoneState />
            </motion.div>
          ) : (
            current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: reduced ? 0 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -24 }}
                transition={{ duration: reduced ? 0 : 0.1 }}
              >
                <FocusCard item={current} />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => move(1)}
                    title="Skip · S / ↓"
                  >
                    Skip
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
      <Sheet open={history} onOpenChange={setHistory}>
        <SheetContent
          className="flow-history-sheet w-full! sm:max-w-[560px]!"
          onKeyDown={(event) => {
            if (
              event.key.toLowerCase() === "u" &&
              !(event.target as HTMLElement).closest(
                "input,textarea,[contenteditable]"
              )
            ) {
              const id = reconUi.get().selectedItemId
              if (id) {
                unreconcileItem(id)
                setHistory(false)
              }
            }
          }}
          aria-describedby={undefined}
        >
          <SheetTitle className="p-5">Reconciled</SheetTitle>
          <div className="overflow-y-auto px-3">
            {reconciled.map((item) => (
              <div
                data-item-id={item.id}
                key={item.id}
                className="flow-list-row"
              >
                <button
                  className="truncate text-left"
                  onClick={() => {
                    choose(item.id)
                    setHistory(false)
                  }}
                >
                  {item.title}
                </button>
                <Money cents={itemAmount(item)} />
                <Button
                  data-action="unreconcile"
                  variant="ghost"
                  aria-label={`Unreconcile ${item.title}`}
                  title="Unreconcile · U"
                  onFocus={() =>
                    reconUi.set((s) => ({ ...s, selectedItemId: item.id }))
                  }
                  onClick={() => {
                    unreconcileItem(item.id)
                    choose(item.id)
                    setHistory(false)
                  }}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <PageChat />
      <CommentsInbox />
      <ShortcutsDialog />
    </section>
  )
}
