import { useEffect, useRef } from "react"
import { MessageSquare } from "lucide-react"
import { Composer } from "@/components/composer"
import { AskUserQuestion } from "@/features/agent"
import { setViewing, useRun } from "@/agent/engine"
import { shallowEqual, useDB } from "@/data/store"
import { useReconUi } from "@/recon/useRecon"
import { cn } from "@/lib/utils"
import { ensureThread, postToThread, threadChatId, viewThread } from "./store"
import { ThreadMessage } from "./ThreadMessage"

export type ThreadViewProps = {
  itemId?: string
  chatId?: string
  variant?: "popover" | "docked" | "sheet"
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
    const close = itemId ? viewThread(itemId) : undefined
    setViewing(chatId)
    return () => {
      close?.()
      setViewing(null)
    }
  }, [chatId, itemId])
  useEffect(() => {
    const node = scroller.current
    if (node) node.scrollTop = node.scrollHeight
  }, [tail, run])
  return (
    <div
      data-thread-item={itemId}
      data-chat-id={chatId}
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}
    >
      <div
        ref={scroller}
        className={cn(
          "min-h-24 flex-1 [scrollbar-width:thin] overflow-y-auto overscroll-contain px-4",
          variant === "popover" && "max-h-[min(50vh,360px)]"
        )}
      >
        {messages.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center gap-2 text-xs text-fg-4">
            <MessageSquare className="size-4" />
            {itemId
              ? "Start a conversation"
              : "Ask Ember about this reconciliation"}
          </div>
        ) : (
          messages.map((message) => (
            <ThreadMessage
              key={message.id}
              message={message}
              run={run?.messageId === message.id ? run : undefined}
            />
          ))
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t-hair border-line p-3">
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
