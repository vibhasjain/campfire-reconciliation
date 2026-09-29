import { restorePageFocus } from "@/recon/focus"
import { useState } from "react"
import { MessageSquare, Search } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { shallowEqual, useDB } from "@/data/store"
import { reconUi, useRecon, useReconUi } from "@/recon/useRecon"
import { waitFor } from "@/recon/speed"
import { ParticipantStack } from "./ParticipantAvatar"
import { focusThread, messageSnippet, useComments } from "./store"

export function CommentsInbox() {
  const open = useReconUi((state) => state.inboxOpen)
  const state = useComments((value) => value)
  const items = useRecon((value) => value.items)
  const messages = useDB((value) => Object.values(value.messages), shallowEqual)
  const [tab, setTab] = useState("open")
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const threads = Object.values(state.threads)
    .filter((thread) => {
      if (thread.resolved !== (tab === "resolved")) return false
      const title = items[thread.anchor.itemId]?.title ?? ""
      return `${title} ${messages
        .filter((message) => message.chatId === thread.id)
        .map(messageSnippet)
        .join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const openThread = async (itemId: string) => {
    reconUi.set((current) => ({
      ...current,
      inboxOpen: false,
      selectedItemId: itemId,
    }))
    document
      .querySelector(`[data-item-id="${itemId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    await waitFor(200)
    // A version that shows items in a review sheet opens it (with the thread) instead of the quick popover.
    const handled = !window.dispatchEvent(
      new CustomEvent("recon:open-item", { detail: itemId, cancelable: true })
    )
    if (!handled) focusThread(itemId)
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) =>
        reconUi.set((current) => ({ ...current, inboxOpen: next }))
      }
    >
      <SheetContent
        onCloseAutoFocus={restorePageFocus}
        side="right"
        aria-describedby={undefined}
        className="w-[min(100vw,380px)]! max-w-none! border-l-hair border-line bg-surface p-0"
      >
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="min-h-0 flex-1 gap-0"
        >
          {/* One row: icon, Open/Resolved (or the search field), search toggle; the sheet's ✕ sits at the right. */}
          <SheetHeader className="h-11 flex-row items-center gap-2 border-b-hair border-line py-0 pr-12 pl-4">
            <SheetTitle className="sr-only">Comments</SheetTitle>
            <MessageSquare className="size-4 shrink-0 text-fg-3" />
            {searching ? (
              <Input
                autoFocus
                aria-label="Search comments"
                placeholder="Search comments…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && !query) {
                    event.stopPropagation()
                    setSearching(false)
                  }
                }}
                className="h-8 min-w-0 flex-1 text-sm"
              />
            ) : (
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={searching ? "Close search" : "Search comments"}
              aria-pressed={searching}
              onClick={() => {
                if (searching) setQuery("")
                setSearching(!searching)
              }}
              className="ml-auto text-fg-3"
            >
              <Search />
            </Button>
          </SheetHeader>
          <TabsContent value={tab} className="min-h-0 overflow-y-auto">
            {threads.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-fg-4">
                {query
                  ? "No matching comments"
                  : tab === "resolved"
                    ? "No resolved threads"
                    : "No open threads"}
              </div>
            )}
            {threads.map((thread) => {
              const conversation = messages.filter(
                (message) => message.chatId === thread.id
              )
              const last = conversation.at(-1)
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => void openThread(thread.anchor.itemId)}
                  className="flex w-full flex-col gap-1.5 border-b-hair border-line px-4 py-3 text-left hover:bg-fill-hover focus-visible:bg-fill-hover"
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                      {items[thread.anchor.itemId]?.title ??
                        thread.anchor.itemId}
                    </span>
                    {(state.unread[thread.id] ?? 0) > 0 && (
                      <span
                        aria-label="Unread"
                        className="size-1.5 rounded-full border border-ai-ink bg-ai-tint shadow-[0_0_3px_var(--c-ai-glow)]"
                      />
                    )}
                  </span>
                  <span className="max-w-full min-w-0 truncate text-xs leading-4 text-fg-3">
                    {messageSnippet(last) || "No comments yet"}
                  </span>
                  <span className="mt-0.5 flex w-full items-center justify-between">
                    <ParticipantStack
                      actors={conversation.map(
                        (message) =>
                          message.author ??
                          (message.role === "assistant" ? "ember" : "maya")
                      )}
                    />
                    <time
                      dateTime={last?.createdAt}
                      className="shrink-0 text-xxs whitespace-nowrap text-fg-4 tabular-nums"
                    >
                      {last
                        ? new Date(last.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </time>
                  </span>
                </button>
              )
            })}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
