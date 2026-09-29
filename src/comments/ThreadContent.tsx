import { useEffect, useRef } from "react"
import { Composer } from "@/components/composer"
import { AskUserQuestion } from "@/features/agent"
import { setViewing, useRun } from "@/agent/engine"
import { shallowEqual, useDB } from "@/data/store"
import { useReconUi } from "@/recon/useRecon"
import { cn } from "@/lib/utils"
import {
  ensureThread,
  focusRequestedThread,
  postToThread,
  threadChatId,
  viewThread,
} from "./store"
import { ThreadMessage } from "./ThreadMessage"

export type ThreadViewProps = {
  itemId?: string
  chatId?: string
  /** inline: embedded in a container that already owns the gutter (e.g. the review sheet). */
  variant?: "popover" | "docked" | "sheet" | "inline"
  className?: string
}
export function ThreadView({
  itemId,
  chatId: givenChatId,
  variant = "docked",
  className,
}: ThreadViewProps) {
  const chatId = itemId ? threadChatId(itemId) : (givenChatId ?? "page")
  const messages = useDB(
    (state) =>
      Object.values(state.messages).filter(
        (message) => message.chatId === chatId
      ),
    shallowEqual
  )
  const question = useDB((state) => state.chats[chatId]?.pendingQuestion)
  const draft = useReconUi((state) =>
    itemId ? state.threadDraft[itemId] : undefined
  )
  const run = useRun(chatId)
  const scroller = useRef<HTMLDivElement>(null)
  const tail = messages.at(-1)
  useEffect(() => {
    if (itemId) focusRequestedThread(itemId)
  }, [itemId, draft])
  useEffect(() => {
    const close = itemId ? viewThread(itemId) : undefined
    setViewing(chatId)
    return () => {
      close?.()
      setViewing(null)
    }
  }, [chatId, itemId])
  // New messages (yours or Ember's, including a streaming reply) scroll the nearest scrolling area
  // to the bottom: the thread itself when floating, the whole sheet when inline. Opening doesn't.
  const opened = useRef(false)
  useEffect(() => {
    const node = scroller.current
    if (!node) return
    if (!opened.current) {
      opened.current = true
      if (variant === "inline") return
    }
    let area: HTMLElement | null = node
    while (area && !(area.scrollHeight > area.clientHeight && /auto|scroll/.test(getComputedStyle(area).overflowY)))
      area = area.parentElement
    area?.scrollTo({ top: area.scrollHeight, behavior: "smooth" })
  }, [tail, run, variant])
  return (
    <div
      data-thread-item={itemId}
      data-chat-id={chatId}
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}
    >
      <div
        ref={scroller}
        className={cn(
          "flex-1",
          // No empty-state prompt: an empty thread is just the composer.
          messages.length > 0 && "min-h-24",
          // Inline threads use their container's gutter and grow with the sheet, which does the scrolling; floating ones scroll themselves.
          variant === "inline"
            ? "px-0"
            : "[scrollbar-width:thin] overflow-y-auto overscroll-contain px-4",
          variant === "popover" && "max-h-[min(50vh,360px)]"
        )}
      >
        {messages.map((message) => (
          <ThreadMessage
            key={message.id}
            message={message}
            run={run?.messageId === message.id ? run : undefined}
          />
        ))}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2",
          // Inline threads live in a scrolling sheet: the composer stays pinned to its bottom.
          variant === "inline"
            ? "sticky bottom-0 z-10 mt-auto bg-surface pt-2 pb-sheet-gutter"
            : "border-t-hair border-line p-3"
        )}
      >
        {question && <AskUserQuestion chatId={chatId} q={question} />}
        <Composer
          key={`${chatId}:${draft ?? ""}`}
          variant="thread"
          chatId={chatId}
          compact
          autoFocus={false}
          prefillText={draft}
          placeholder={itemId ? "Comment or ask @ember…" : "Ask Ember…"}
          onSubmit={
            itemId
              ? (input) => {
                  ensureThread(itemId)
                  return postToThread(itemId, input.text, input.mentions)
                }
              : undefined
          }
          className="rounded-lg shadow-none"
        />
      </div>
    </div>
  )
}
