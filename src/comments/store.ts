import { useSyncExternalStore } from "react"
import { createStore, db, insert, nextId, patch } from "@/data/store"
import type { EntityRef, Message } from "@/data/types"
import type { Actor, Thread } from "@/recon/data"
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
const observed = new Set<string>(Object.keys(db.get().messages))
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
  const state = recon.getState()
  type SeedLine = [Actor, string]
  // New fixture copy stays here; retain the original participant history and IDs.
  const exchanges: Record<string, SeedLine[]> = {
    r01: [["maya", "Google’s $2,640 debit on 9/3 matches the September seats invoice and the 9/2 payment. Ready to match the alias."]],
    r02: [["maya", "The 9/30 Chase analysis fee is $285.40. I’ll use 6820, same as July and August."]],
    r03: [["maya", "Chase credited $3,912.07 on 9/30. Please record it to 7100 · Interest Income for September."]],
    r04: [
      ["maya", "[[member:priya]] can you pull the invoice for Notion’s $9,600 charge on 9/19? We used prepaid software last year."],
      ["priya", "NTN-88213 is in the AP inbox: 40 seats, September 2026 through August 2027. It hasn’t been processed."],
      ["maya", "Thanks. I’ll create the prepaid bill and spread it over 12 months."],
    ],
    r05: [
      ["maya", "[[member:priya]] check #4127 to Evergreen Movers is $3,850, issued 9/30. Any clearing entry yet?"],
      ["priya", "It’s absent from the September statement. Leave it outstanding; the check copy is attached."],
    ],
    r06: [["maya", "Meridian’s $86,400 for INV-1187 is booked 9/30 and appears in Chase’s 10/1 feed. Mark it in transit for September."]],
    r07: [["priya", "AWS invoice AWS-2026-08-7719 is $18,240; I entered $18,420 on 9/8. Please correct the $180 transposition before matching."]],
    r08: [["maya", "Thanks, [[member:daniel]]. Northstar’s 9/22 wire is $47,975 against the $48,000 receipt. I’ll route the $25 fee adjustment to you."]],
    r09: [["maya", "That explains the $62.98 difference on the 9/17 payment. I’ll use the realized FX loss adjustment for HC-2291."]],
    r10: [["daniel", "I released Kestrel’s $12,500 wire on 9/16. The books show 9/11 because it was waiting on dual approval; match the payment."]],
    r11: [["maya", "Thanks, [[member:priya]]. I’ll reverse the $6,840 manual JE-7712 and keep the synced bill payment against the 9/12 debit."]],
    r12: [["maya", "Cascade’s 9/24 remittance lists INV-2041, INV-2044 and INV-2047. The three add to $61,250; match them to the single ACH receipt."]],
    r13: [
      ["maya", "[[agent:ember]] both Gusto contractor payments are $4,000 on 9/15. Which pairing uses the right payees?"],
      ["ember", "Pair CHEN with Lin Chen and OKAFOR with Emeka Okafor. Row order swaps the payees."],
    ],
  }
  const originals = Object.fromEntries(
    Object.values(state.threads).map(thread => [thread.itemId, thread])
  )
  const dollars = (cents: number) => (Math.abs(cents) / 100).toLocaleString("en-US", {
    style: "currency", currency: "USD",
  })
  for (const item of Object.values(state.items)) {
    const original = originals[item.id]
    const messages = (original?.messages ?? []).map(message => ({
      ...message,
      text: message.id === "message-r14-2"
        ? "Check #4098 cleared 8/26, before its backdated void. Reverse the void in September to correct the $1,150 discrepancy."
        : message.text,
    }))
    let lines = exchanges[item.id] ?? []
    let start = Date.parse("2026-10-02T10:00:00-04:00")
    if (item.kind === "auto") {
      const bank = state.bankLines[item.bankIds[0]]
      const book = state.bookLines[item.bookIds[0]]
      const amount = dollars(bank.amount)
      const date = `9/${Number(bank.date.slice(-2))}`
      const bookDate = `9/${Number(book.date.slice(-2))}`
      const subject = `${bank.payee} ${bank.amount > 0 ? "credit" : "debit"}`
      const index = Number(item.id.slice(5))
      // Review notes follow settlement; all are part of the September close.
      start = Date.parse(`${bank.date}T14:00:00-04:00`) + (index % 60) * 60000
      const notes = [
        `${subject} for ${amount} on ${date} agrees with “${book.description}”. Keeping this match.`,
        `Checked “${book.description}”: ${amount} in the books on ${bookDate}, same amount at Chase on ${date}.`,
        `${amount} settled on ${date} for ${bank.payee}. The payee and payment reference agree with the book entry.`,
        `Reviewed the ${date} ${subject}: ${amount}, matched to “${book.description}”. No adjustment needed.`,
      ]
      lines = [["maya", notes[Math.floor(index / 2) % notes.length]]]
      if (index % 2 === 1) {
        const reviewer: Actor = bank.amount > 0 || book.type === "transfer" ? "daniel" : "priya"
        lines = [
          ["maya", `[[member:${reviewer}]] can you confirm the ${date} ${subject} for ${amount} against “${book.description}”?`],
          [reviewer, bank.date === book.date
            ? `Confirmed. The ${bookDate} book entry has the same amount and payee; keep the match.`
            : `Yes. It’s booked ${bookDate} and settled ${date}; the amount and payment reference agree.`],
        ]
      }
    }
    if (messages.length) start = Date.parse(messages.at(-1)!.at) + 5 * 60000
    lines.forEach(([author, text], index) => messages.push({
      id: `seed-${item.id}-${index + 1}`,
      author,
      at: new Date(start + index * 3 * 60000).toISOString(),
      text,
    }))
    const thread: Thread = {
      id: original?.id ?? `thread-${item.id}`,
      itemId: item.id,
      resolved: original?.resolved ?? false,
      messages,
    }
    const existing = comments.get().threads[threadChatId(thread.itemId)]
    const chatId = ensureThread(thread.itemId)
    for (const message of thread.messages) {
      observed.add(message.id)
      const mentions: EntityRef[] = [...message.text.matchAll(/\[\[(agent|member):([^\]]+)\]\]/g)]
        .map(([, type, id]) => ({ type, id }))
      appendThreadMessage(thread.itemId, message.text, message.author, mentions, {
        id: message.id,
        at: message.at,
      })
    }
    if (existing) continue
    patch("chats", chatId, {
      createdAt: thread.messages[0].at,
      updatedAt: thread.messages.at(-1)!.at,
    })
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
let requestedThreadFocus: string | null = null

export function focusRequestedThread(itemId: string) {
  if (requestedThreadFocus !== itemId || reconUi.get().threadFor !== itemId)
    return
  const editor = document.querySelector<HTMLElement>(
    `[data-thread-item="${itemId}"] [contenteditable="true"]`
  )
  if (editor) {
    requestedThreadFocus = null
    editor.focus()
  }
}

export function focusThread(itemId: string, draft?: string) {
  requestedThreadFocus = itemId
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
    requestAnimationFrame(() => focusRequestedThread(itemId))
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
