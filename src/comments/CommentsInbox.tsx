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
    focusThread(itemId)
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(next) =>
        reconUi.set((current) => ({ ...current, inboxOpen: next }))
      }
    >
      <SheetContent onCloseAutoFocus={restorePageFocus}
        side="right"
        aria-describedby={undefined}
        className="w-[min(100vw,380px)]! max-w-none! border-l-hair border-line bg-surface p-0"
      >
        <SheetHeader className="h-12 justify-center border-b-hair border-line px-4 py-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-fg-3" />
            Comments
          </SheetTitle>
        </SheetHeader>
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="min-h-0 flex-1 gap-0"
        >
          <div className="flex flex-col gap-3 border-b-hair border-line p-3">
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2 size-4 text-fg-4" />
              <Input
                aria-label="Search comments"
                placeholder="Search comments…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
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
                    <span className="min-w-0 flex-1 text-sm font-medium break-words text-fg">
                      {items[thread.anchor.itemId]?.title ??
                        thread.anchor.itemId}
                    </span>
                    {(state.unread[thread.id] ?? 0) > 0 && (
                      <span
                        aria-label="Unread"
                        className="size-1.5 rounded-full bg-ai"
                      />
                    )}
                  </span>
                  <span className="text-xs leading-4 break-words text-fg-3">
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
                      className="text-xxs text-fg-4"
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
