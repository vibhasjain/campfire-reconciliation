import { useMemo } from "react"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { shallowEqual, useDB } from "@/data/store"
import { reconUi } from "@/recon/useRecon"
import { cn } from "@/lib/utils"
import { ParticipantStack } from "./ParticipantAvatar"
import { ThreadPopover } from "./ThreadPopover"
import { useComments, threadChatId } from "./store"
import { pinStacks } from "./pin-stacks"

export function ThreadPin({
  itemId,
  className,
}: {
  itemId: string
  className?: string
}) {
  const threads = useComments((state) => state.threads)
  const emberUnread = useComments(
    (state) => state.emberUnread[threadChatId(itemId)] ?? false
  )
  const membership = useMemo(
    () => pinStacks(Object.values(threads), (thread) => thread.anchor.itemId),
    [threads]
  )
  const group = membership.get(threadChatId(itemId))
  const messages = useDB(
    (state) =>
      Object.values(state.messages).filter((message) =>
        group
          ? group.some((thread) => thread.id === message.chatId)
          : message.chatId === threadChatId(itemId)
      ),
    shallowEqual
  )
  return (
    <ThreadPopover itemId={itemId}>
      <Button
        tooltip="Open comments"
        shortcut="C"
        type="button"
        variant="ghost"
        size="sm"
        data-action="comment"
        aria-label={
          messages.length
            ? `${messages.length} comments on this item`
            : "Comment on this item"
        }
        onClick={(event) => {
          event.stopPropagation()
          reconUi.set((state) => ({ ...state, selectedItemId: itemId }))
        }}
        className={cn(
          "relative h-8 gap-1.5 px-2 text-fg-3",
          !messages.length &&
            "opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0",
          className
        )}
      >
        {messages.length > 0 ? (
          <>
            <ParticipantStack
              actors={messages.map(
                (message) =>
                  message.author ??
                  (message.role === "assistant" ? "ember" : "maya")
              )}
            />
            <span className="text-xxs tabular-nums">{messages.length}</span>
          </>
        ) : (
          <MessageSquare className="size-4" />
        )}
        {emberUnread && (
          <span
            aria-label="Unread reply from Ember"
            className="absolute top-0.5 right-0.5 size-1.5 rounded-full border border-ai-ink bg-ai-tint shadow-[0_0_3px_var(--c-ai-glow)] ring-2 ring-surface"
          />
        )}
      </Button>
    </ThreadPopover>
  )
}
