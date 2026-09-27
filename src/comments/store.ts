import { useSyncExternalStore } from "react"
import { createStore, db, insert, nextId, patch } from "@/data/store"
import type { EntityRef, Message } from "@/data/types"
import type { Actor } from "@/recon/data"
import { recon, reconUi } from "@/recon/useRecon"
import { waitFor } from "@/recon/speed"
import { toast } from "@/components/common/toast"
import type { CommentsState } from "./types"

export const comments = createStore<CommentsState>({
  threads: {},
  reactions: {},
  unread: {},
  emberUnread: {},
})
const viewing = new Set<string>()
const observed = new Set<string>()
export const threadChatId = (itemId: string) => `thread:${itemId}`
export function useComments<T>(selector: (state: CommentsState) => T): T {
  return useSyncExternalStore(
    comments.subscribe,
    () => selector(comments.get()),
    () => selector(comments.get())
  )
}
export function ensureThread(itemId: string) {
  const id = threadChatId(itemId)
  const at = new Date().toISOString()
  if (!comments.get().threads[id])
    comments.set((state) => ({
      ...state,
      threads: {
        ...state.threads,
        [id]: {
          id,
          anchor: { itemId },
          resolved: false,
          resolvedBy: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    }))
  if (!db.get().chats[id])
    insert("chats", {
      id,
      title: recon.getState().items[itemId]?.title ?? itemId,
      createdAt: at,
      updatedAt: at,
      createdBy: "maya",
      status: "idle",
      unread: false,
      context: [{ type: "reconItem", id: itemId }],
    })
  return id
}
export function appendThreadMessage(
  itemId: string,
  text: string,
  author: Actor = "maya",
  mentions: EntityRef[] = [],
  options?: { id?: string; at?: string }
) {
  const chatId = ensureThread(itemId)
  const id = options?.id ?? nextId("comment")
  if (db.get().messages[id]) return id
  insert("messages", {
    id,
    chatId,
    author,
    role: author === "ember" ? "assistant" : "user",
    createdAt: options?.at ?? new Date().toISOString(),
    text: author === "ember" ? undefined : text,
    mentions,
    parts: author === "ember" ? [{ type: "text", markdown: text }] : [],
  })
  patch("chats", chatId, { updatedAt: options?.at ?? new Date().toISOString() })
  return id
}
export function seedThreads() {
  for (const thread of Object.values(recon.getState().threads)) {
    const chatId = ensureThread(thread.itemId)
    for (const message of thread.messages) {
      observed.add(message.id)
      appendThreadMessage(thread.itemId, message.text, message.author, [], {
        id: message.id,
        at: message.at,
      })
    }
    comments.set((state) => ({
      ...state,
      threads: {
        ...state.threads,
        [chatId]: {
          ...state.threads[chatId],
          resolved: thread.resolved,
          createdAt: Date.parse(
            thread.messages[0]?.at ?? new Date().toISOString()
          ),
          updatedAt: Date.parse(
            thread.messages.at(-1)?.at ?? new Date().toISOString()
          ),
        },
      },
    }))
  }
}
seedThreads()
db.subscribe(() => {
  for (const message of Object.values(db.get().messages)) {
    if (!message.chatId.startsWith("thread:") || observed.has(message.id))
      continue
    if (message.role === "assistant" && message.parts.length === 0) continue
    observed.add(message.id)
    const id = message.chatId
    const unread = message.author !== "maya" && !viewing.has(id)
    comments.set((state) => ({
      ...state,
      threads: state.threads[id]
        ? {
            ...state.threads,
            [id]: {
              ...state.threads[id],
              updatedAt: Math.max(
                Date.parse(message.createdAt),
                Date.parse(`${recon.getState().workedOn}T12:00:00`)
              ),
            },
          }
        : state.threads,
      unread: unread
        ? { ...state.unread, [id]: (state.unread[id] ?? 0) + 1 }
        : state.unread,
      emberUnread:
        unread && message.role === "assistant"
          ? { ...state.emberUnread, [id]: true }
          : state.emberUnread,
    }))
  }
})
export function markThreadRead(itemId: string) {
  const id = threadChatId(itemId)
  comments.set((state) =>
    state.unread[id] || state.emberUnread[id]
      ? {
          ...state,
          unread: { ...state.unread, [id]: 0 },
          emberUnread: { ...state.emberUnread, [id]: false },
        }
      : state
  )
  if (db.get().chats[id]?.unread) patch("chats", id, { unread: false })
}
export function viewThread(itemId: string) {
  const id = ensureThread(itemId)
  viewing.add(id)
  markThreadRead(itemId)
  return () => {
    viewing.delete(id)
  }
}
export function focusThread(itemId: string, draft?: string) {
  ensureThread(itemId)
  reconUi.set((state) => ({
    ...state,
    selectedItemId: itemId,
    threadFor: itemId,
    threadDraft: draft
      ? { ...state.threadDraft, [itemId]: draft }
      : state.threadDraft,
  }))
  markThreadRead(itemId)
  if (typeof document !== "undefined")
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          `[data-thread-item="${itemId}"] [contenteditable="true"]`
        )
        ?.focus()
    )
}
export function toggleInbox() {
  reconUi.set((state) => ({ ...state, inboxOpen: !state.inboxOpen }))
}
export function useUnreadCount() {
  return useComments((state) =>
    Object.values(state.unread).reduce((sum, value) => sum + value, 0)
  )
}
export function setThreadResolved(itemId: string, resolved = true) {
  const id = ensureThread(itemId)
  const previous = comments.get().threads[id]
  comments.set((state) => ({
    ...state,
    threads: {
      ...state.threads,
      [id]: { ...previous, resolved, resolvedBy: resolved ? "maya" : null },
    },
  }))
  toast(resolved ? "Thread resolved" : "Thread reopened", {
    action: {
      label: "Undo",
      onClick: () =>
        comments.set((state) => ({
          ...state,
          threads: { ...state.threads, [id]: previous },
        })),
    },
  })
}
/** Komo permits one active reaction per person on each message. */
export function reactTo(
  messageId: string,
  emoji: string,
  actor: Actor = "maya"
) {
  comments.set((state) => {
    const previous = state.reactions[messageId] ?? {}
    const active = !previous[emoji]?.includes(actor)
    const reactions = Object.fromEntries(
      Object.entries(previous).map(([key, actors]) => [
        key,
        actors.filter((id) => id !== actor),
      ])
    )
    if (active) reactions[emoji] = [...(reactions[emoji] ?? []), actor]
    return {
      ...state,
      reactions: { ...state.reactions, [messageId]: reactions },
    }
  })
}
function hasMention(
  text: string,
  mentions: EntityRef[],
  actor: Actor | "campfire"
) {
  return (
    mentions.some((ref) => ref.id.toLowerCase() === actor) ||
    new RegExp(`@${actor}\\b|\\[\\[(?:agent|member):${actor}\\]\\]`, "i").test(
      text
    )
  )
}
async function teammateReply(itemId: string, actor: "priya" | "daniel") {
  await waitFor(1100)
  const state = recon.getState(),
    item = state.items[itemId]
  if (!item) return
  const line =
    state.bankLines[item.bankIds[0]] ?? state.bookLines[item.bookIds[0]]
  const suggestion = item.suggestions[0]
  const text =
    actor === "priya" && itemId === "r05"
      ? "Evergreen got it 9/30 and deposits on Fridays, so it should clear next week. Leave it outstanding."
      : actor === "daniel"
        ? suggestion?.approval
          ? `Route “${suggestion.title}” to me for approval.`
          : `Please verify ${line?.reference ?? line?.description ?? item.title} against the supporting document before accepting.`
        : `I’ll check ${line?.reference ?? line?.description ?? item.title} against the AP record.`
  appendThreadMessage(itemId, text, actor)
}
export async function postToThread(
  itemId: string,
  text: string,
  mentions: EntityRef[] = []
) {
  const chatId = ensureThread(itemId)
  if (!text.trim()) return chatId
  appendThreadMessage(itemId, text, "maya", mentions)
  reconUi.set((state) => ({
    ...state,
    threadDraft: { ...state.threadDraft, [itemId]: "" },
  }))
  const replies = (["priya", "daniel"] as const)
    .filter((actor) => hasMention(text, mentions, actor))
    .map((actor) => teammateReply(itemId, actor))
  const explicitEmber =
    hasMention(text, mentions, "ember") ||
    hasMention(text, mentions, "campfire")
  const input = {
    chatId,
    text,
    mentions,
    attachments: [],
    context: [{ type: "reconItem", id: itemId }],
    author: "maya" as const,
    skipUserMessage: true,
  }
  const { reconIntentScore } = await import("@/agent/scripts/recon")
  if (explicitEmber || reconIntentScore(input) > 1) {
    if (replies.length) await Promise.all(replies)
    const { send } = await import("@/agent/engine")
    send(input)
  }
  return chatId
}
export function messageSnippet(message: Message | undefined) {
  const text =
    message?.text ??
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.markdown)
      .join(" ") ??
    ""
  return text
    .replace(/\[\[(?:agent|member):([^\]]+)\]\]/g, "@$1")
    .replace(/[*#|]/g, "")
    .slice(0, 110)
}
