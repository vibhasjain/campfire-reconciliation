// Scripted agent runtime: streams text and tool steps into the in-memory chat store.
import { useSyncExternalStore } from 'react'
import { createStore, db, insert, nextId, patch, hardDelete } from '@/data/store'
import type { Approval, Card, Chat, ID, MessagePart, ToolStep, ToolStepKind } from '@/data/types'
import { toast } from '@/components/common/toast'
import { labelFor } from '@/data/selectors'
import type { HalfSheetTarget } from '@/app/halfsheet'
import { openHalfSheet } from '@/app/ui-store'
import type { Answers, ApprovalInput, ApprovalResult, RunCtx, Script, SendInput, StepHandle } from './types'
import { SCRIPTS } from './scripts'
import { pastTense, tokenize } from './text'

/** Live, not-persisted state of a running chat (what the store can't express). */
export type RunView = {
  messageId: ID
  /** dots = "Thinking." before anything; label = "Campfire" + "Thinking..."; active = parts streaming */
  phase: 'dots' | 'label' | 'active'
  /** "Thinking..." between tool rounds */
  thinking: boolean
  banner: boolean
}
const runStore = createStore<Record<ID, RunView>>({})
const setRun = (chatId: ID, p: Partial<RunView> | null) =>
  runStore.set((s) => {
    if (!p) {
      if (!s[chatId]) return s
      const n = { ...s }
      delete n[chatId]
      return n
    }
    const prev = s[chatId]
    return prev ? { ...s, [chatId]: { ...prev, ...p } } : s
  })
export function useRun(chatId: ID | undefined): RunView | undefined {
  return useSyncExternalStore(runStore.subscribe, () => (chatId ? runStore.get()[chatId] : undefined))
}
export function dismissBanner(chatId: ID) {
  setRun(chatId, { banner: false })
}

// ---- which thread is on screen (for unread + panel auto-open) ----
let viewing: ID | null = null
export function setViewing(chatId: ID | null) {
  viewing = chatId
  if (chatId && db.get().chats[chatId]?.unread) patch('chats', chatId, { unread: false })
}

const controllers = new Map<ID, AbortController>()
const questionWaiters = new Map<ID, (a: Answers) => void>()
const approvalWaiters = new Map<ID, () => void>()

/** False after a reload (or once settled): the card's buttons would have nobody to answer. */
export function isAwaitingApproval(approvalId: ID) {
  return approvalWaiters.has(approvalId)
}

const now = () => new Date().toISOString()
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)

function abortError() {
  return new DOMException('Aborted', 'AbortError')
}

function titleFrom(input: SendInput): string {
  const d = db.get()
  const text = input.text.replace(/\[\[([a-zA-Z]+):([^\]\s]+)\]\]/g, (_, type, id) => labelFor(d, input.mentions.find((ref) => ref.type === type && ref.id === id) ?? { type, id }))
  const t = text.replace(/\s+/g, ' ').trim()
  if (t) return t.length > 80 ? `${t.slice(0, 80)}…` : t
  return input.attachments[0]?.name ?? 'New chat'
}

function pick(input: SendInput): Script {
  const d = db.get()
  let best = SCRIPTS[SCRIPTS.length - 1]!
  let score = -Infinity
  for (const s of SCRIPTS) {
    const v = s.match(input, d)
    if (v > score) {
      score = v
      best = s
    }
  }
  return best
}

/** Sends a message: creates the chat optimistically (title = text), appends the user turn and starts a script. */
export function send(input: SendInput): ID {
  const d = db.get()
  let chatId = input.chatId
  if (chatId && controllers.has(chatId)) stop(chatId, { silent: true })
  if (!chatId || !d.chats[chatId]) {
    chatId = nextId('cht')
    const chat: Chat = {
      id: chatId, createdAt: now(), createdBy: 'user', title: titleFrom(input), updatedAt: now(), status: 'running', unread: false,
      context: input.context,
    }
    insert('chats', chat)
  } else {
    patch('chats', chatId, { status: 'running', updatedAt: now(), unread: false })
  }
  insert('messages', {
    id: nextId('msg'), chatId, role: 'user', createdAt: now(), text: input.text, mentions: input.mentions,
    attachments: input.attachments.length ? input.attachments : undefined, parts: [],
  })
  void run(chatId, { ...input, chatId })
  return chatId
}

async function run(chatId: ID, input: SendInput) {
  const script = pick(input)
  const ctrl = new AbortController()
  controllers.set(chatId, ctrl)
  const messageId = nextId('msg')
  insert('messages', { id: messageId, chatId, role: 'assistant', createdAt: now(), parts: [] })
  runStore.set((s) => ({ ...s, [chatId]: { messageId, phase: 'dots', thinking: false, banner: false } }))
  // the long-run banner counts agent working time only (paused while waiting on a question/approval)
  let worked = 0
  let since = Date.now()
  let bannerTimer: ReturnType<typeof setTimeout> | undefined
  const arm = () => {
    if (script.long) bannerTimer = setTimeout(() => setRun(chatId, { banner: true }), Math.max(0, 15000 - worked))
  }
  const clock = {
    pause: () => {
      worked += Date.now() - since
      clearTimeout(bannerTimer)
    },
    resume: () => {
      since = Date.now()
      arm()
    },
  }
  arm()
  const ctx = makeCtx(chatId, messageId, input, ctrl.signal, clock)
  try {
    setRun(chatId, { phase: 'label' })
    await script.run(ctx)
    // every message gets an answer: a script that produced no text hands over to the fallback
    const said = db.get().messages[messageId]?.parts.some((p) => p.type === 'text' && p.markdown.trim())
    if (!said && script !== SCRIPTS[SCRIPTS.length - 1]) await SCRIPTS[SCRIPTS.length - 1]!.run(ctx)
    finishParts(messageId)
    finish(chatId)
  } catch (e) {
    if ((e as Error)?.name !== 'AbortError') {
      console.error(e)
      finishParts(messageId)
      finish(chatId)
    }
  } finally {
    clearTimeout(bannerTimer)
    if (controllers.get(chatId) === ctrl) controllers.delete(chatId)
  }
}

function finish(chatId: ID) {
  setRun(chatId, null)
  const chat = db.get().chats[chatId]
  if (!chat) return
  const away = viewing !== chatId || document.hidden
  patch('chats', chatId, { status: 'idle', updatedAt: now(), unread: away, pendingQuestion: undefined })
}

/** Close anything left open (live steps, streaming text) when a run ends. */
function finishParts(messageId: ID) {
  const m = db.get().messages[messageId]
  if (!m) return
  const parts = m.parts.map((p): MessagePart =>
    p.type === 'steps' && p.live ? collapsed(p, pastTense(p.status)) : p.type === 'text' && p.streaming ? { ...p, streaming: false } : p,
  )
  patch('messages', messageId, { parts })
}

function collapsed(p: Extract<MessagePart, { type: 'steps' }>, status: string): MessagePart {
  const steps = p.steps.map((s) => (s.state === 'running' ? { ...s, state: 'done' as const, label: pastTense(s.label) } : s))
  return { ...p, status, live: false, open: false, steps: [...steps, { id: nextId('stp'), kind: 'done', label: 'Done', state: 'done' }] }
}

/** Stop: removes the in-progress assistant turn (the user message stays) and toasts. */
export function stop(chatId: ID, opts?: { silent?: boolean }) {
  const ctrl = controllers.get(chatId)
  const r = runStore.get()[chatId]
  ctrl?.abort()
  controllers.delete(chatId)
  questionWaiters.delete(chatId)
  if (r) {
    const approvalIds = (db.get().messages[r.messageId]?.parts ?? []).flatMap((part) =>
      part.type === 'card' && part.card.kind === 'approval' ? [part.card.approvalId] : [],
    )
    hardDelete('approvals', approvalIds)
    hardDelete('messages', [r.messageId])
  }
  setRun(chatId, null)
  if (db.get().chats[chatId]) patch('chats', chatId, { status: 'idle', pendingQuestion: undefined })
  if (!opts?.silent) toast('Response stopped', { tone: 'info' })
}

export function isRunning(chatId: ID) {
  return controllers.has(chatId)
}

export function answerQuestion(chatId: ID, answers: Answers) {
  const w = questionWaiters.get(chatId)
  questionWaiters.delete(chatId)
  patch('chats', chatId, { pendingQuestion: undefined })
  w?.(answers)
}

/** Approve or dismiss rows in memory; scripts decide what an approval means. */
export function resolveApproval(approvalId: ID, rowId: ID | 'all', decision: 'approve' | 'dismiss') {
  const approval = db.get().approvals[approvalId]
  if (!approval || !isAwaitingApproval(approvalId)) return
  const rows = approval.rows.map((row) =>
    row.state === 'pending' && (rowId === 'all' || row.id === rowId)
      ? { ...row, state: decision === 'approve' ? 'approved' as const : 'dismissed' as const }
      : row,
  )
  patch('approvals', approvalId, { rows })
  if (rows.every((row) => row.state === 'approved' || row.state === 'dismissed')) {
    approvalWaiters.get(approvalId)?.()
    approvalWaiters.delete(approvalId)
  }
}

// ---- the run context handed to scripts ----
function makeCtx(chatId: ID, messageId: ID, input: SendInput, signal: AbortSignal, clock: { pause(): void; resume(): void }): RunCtx {
  const check = () => {
    if (signal.aborted) throw abortError()
  }
  const wait = (ms: number) =>
    new Promise<void>((res, rej) => {
      if (signal.aborted) return rej(abortError())
      const abort = () => { clearTimeout(timer); rej(abortError()) }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort)
        res()
      }, ms)
      signal.addEventListener('abort', abort, { once: true })
    })
  const parts = () => db.get().messages[messageId]?.parts ?? []
  const setParts = (fn: (p: MessagePart[]) => MessagePart[]) => {
    check()
    const cur = db.get().messages[messageId]
    if (!cur) throw abortError()
    patch('messages', messageId, { parts: fn(cur.parts) })
    if (runStore.get()[chatId]?.phase !== 'active') setRun(chatId, { phase: 'active' })
  }
  /** Index of the live steps part, creating one at the end when needed. */
  const liveSteps = (): number => {
    const ps = parts()
    const last = ps.length - 1
    if (last >= 0 && ps[last]!.type === 'steps' && (ps[last] as { live: boolean }).live) return last
    setParts((p) => [...p, { type: 'steps', status: 'Thinking...', live: true, open: true, steps: [] }])
    return parts().length - 1
  }
  const editStep = (id: ID, fn: (s: ToolStep) => ToolStep) =>
    setParts((ps) => ps.map((p) => (p.type === 'steps' && p.steps.some((s) => s.id === id) ? { ...p, steps: p.steps.map((s) => (s.id === id ? fn(s) : s)) } : p)))
  const autoCollapse = () => {
    const ps = parts()
    const i = ps.findIndex((p) => p.type === 'steps' && p.live)
    if (i >= 0) setParts((p) => p.map((x, j) => (j === i && x.type === 'steps' ? collapsed(x, pastTense(x.status)) : x)))
  }
  const streamWords = async (text: string, write: (acc: string) => void, wps?: number) => {
    let acc = ''
    for (const tok of tokenize(text)) {
      acc += tok
      write(acc)
      await wait(tok.startsWith('|') ? rand(90, 140) : wps ? 1000 / wps : rand(25, 40))
    }
  }

  const ctx: RunCtx = {
    input,
    chatId,
    db: db.get,
    signal,
    wait,
    async thinking(ms = rand(700, 1300)) {
      check()
      setRun(chatId, { thinking: true })
      try {
        await wait(ms)
      } finally {
        setRun(chatId, { thinking: false })
      }
    },
    status(text) {
      const i = liveSteps()
      setParts((ps) => ps.map((p, j) => (j === i && p.type === 'steps' ? { ...p, status: text } : p)))
    },
    step(kind: ToolStepKind, label: string, sub?: string): StepHandle {
      const i = liveSteps()
      const id = nextId('stp')
      setParts((ps) => ps.map((p, j) => (j === i && p.type === 'steps' ? { ...p, steps: [...p.steps, { id, kind, label, sub, state: 'running' }] } : p)))
      const h: StepHandle = {
        id,
        update: (p) => editStep(id, (s) => ({ ...s, ...p })),
        async code(text, opts) {
          const step = Math.max(1, Math.round((opts?.cps ?? 120) / 20))
          editStep(id, (s) => ({ ...s, code: '' }))
          await wait(rand(300, 600))
          for (let n = 0; n < text.length; ) {
            n = Math.min(text.length, n + step)
            const chunk = text.slice(0, n)
            editStep(id, (s) => ({ ...s, code: chunk }))
            await wait(50)
          }
        },
        output: (text) => editStep(id, (s) => ({ ...s, output: text })),
        error: (text) => editStep(id, (s) => ({ ...s, error: text })),
        rows: (rows) => editStep(id, (s) => ({ ...s, rows })),
        async subagent(ref, markdown, opts) {
          editStep(id, (s) => ({ ...s, subagent: { ref, markdown: '' } }))
          await wait(rand(600, 1200))
          await streamWords(markdown, (acc) => editStep(id, (s) => ({ ...s, subagent: { ref, markdown: acc } })), opts?.wps)
        },
        done: (l) => editStep(id, (s) => ({ ...s, state: 'done', label: l ?? pastTense(s.label) })),
        fail: (error) => editStep(id, (s) => ({ ...s, state: 'error', error })),
      }
      return h
    },
    collapse(past) {
      const ps = parts()
      const i = ps.findIndex((p) => p.type === 'steps' && p.live)
      if (i < 0) return
      setParts((p) => p.map((x, j) => (j === i && x.type === 'steps' ? collapsed(x, past) : x)))
    },
    async say(markdown, opts) {
      autoCollapse()
      setParts((p) => [...p, { type: 'text', markdown: '', streaming: true }])
      const i = parts().length - 1
      const write = (acc: string) => setParts((ps) => ps.map((p, j) => (j === i && p.type === 'text' ? { ...p, markdown: acc } : p)))
      await streamWords(markdown, write, opts?.wps)
      setParts((ps) => ps.map((p, j) => (j === i && p.type === 'text' ? { ...p, streaming: false } : p)))
    },
    card(card: Card) {
      autoCollapse()
      const id = nextId('stp')
      setParts((p) => [...p, { type: 'card', id, card }])
      return id
    },
    updateCard(id, c) {
      setParts((ps) => ps.map((p) => (p.type === 'card' && p.id === id ? { ...p, card: { ...p.card, ...c } as Card } : p)))
    },
    openPanel(target: HalfSheetTarget) {
      check()
      if (viewing === chatId) openHalfSheet(target)
    },
    ask(q) {
      check()
      const question = { ...q, id: nextId('q') }
      patch('chats', chatId, { pendingQuestion: question })
      return new Promise<Answers>((res, rej) => {
        clock.pause()
        questionWaiters.set(chatId, (a) => {
          clock.resume()
          const qa = [{ q: question.title, a: a === 'skip' ? 'Skipped' : Object.values(a).join(', ') }]
          try {
            ctx.card({ kind: 'answers', qa })
          } catch (e) {
            return rej(e)
          }
          res(a)
        })
        signal.addEventListener('abort', () => {
          questionWaiters.delete(chatId)
          rej(abortError())
        }, { once: true })
      })
    },
    approve(a: ApprovalInput) {
      check()
      const approval: Approval = { ...a, id: nextId('apr'), createdAt: now(), createdBy: 'agent', chatId }
      const result = (): ApprovalResult => {
        const cur = db.get().approvals[approval.id]!
        return { approved: cur.rows.filter((r) => r.state === 'approved').map((r) => r.id), dismissed: cur.rows.filter((r) => r.state === 'dismissed').map((r) => r.id) }
      }
      if (approval.rows.every((row) => row.state === 'approved' || row.state === 'dismissed')) {
        insert('approvals', approval)
        ctx.card({ kind: 'approval', approvalId: approval.id })
        return Promise.resolve(result())
      }
      return new Promise<ApprovalResult>((res, rej) => {
        clock.pause()
        approvalWaiters.set(approval.id, () => {
          clock.resume()
          res(result())
        })
        insert('approvals', approval)
        ctx.card({ kind: 'approval', approvalId: approval.id })
        signal.addEventListener('abort', () => {
          approvalWaiters.delete(approval.id)
          rej(abortError())
        }, { once: true })
      })
    },
  }
  return ctx
}

