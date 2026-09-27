// Scripted agent contract. Scripts import these types only.
import type { Approval, Attachment, Card, DB, EntityRef, ID, Question, ToolStep, ToolStepKind } from '@/data/types'
import type { HalfSheetTarget } from '@/app/halfsheet'

export type SendInput = {
  chatId?: ID
  text: string
  mentions: EntityRef[]
  attachments: Attachment[]
  context: EntityRef[]
  model?: string
}

export type StepHandle = {
  id: ID
  update(p: Partial<ToolStep>): void
  /** Streams `text` into the step's code card (~120 chars/s); sub shows "Generating..." meanwhile. */
  code(text: string, opts?: { cps?: number }): Promise<void>
  output(text: string): void
  error(text: string): void
  rows(rows: string[][]): void
  /** Streams markdown into a subagent card (header = ref chip, "Loading..." until the first word). */
  subagent(ref: EntityRef, markdown: string, opts?: { wps?: number }): Promise<void>
  /** Marks done; label defaults to the past tense of the live label ("Retrieving x" → "Retrieved x"). */
  done(label?: string): void
  fail(error: string): void
}

export type ApprovalInput = Pick<Approval, 'title' | 'rows'>
export type ApprovalResult = { approved: ID[]; dismissed: ID[] }
export type Answers = Record<string, string> | 'skip'

export interface RunCtx {
  input: SendInput
  chatId: ID
  db: () => DB
  signal: AbortSignal
  wait(ms: number): Promise<void>
  /** Before the first part: "Thinking." dots. Between tool rounds: a "Thinking..." row at the end of the step list. */
  thinking(ms?: number): Promise<void>
  /** Shimmering status phrase over the live step list. */
  status(text: string): void
  step(kind: ToolStepKind, label: string, sub?: string): StepHandle
  /** Auto-collapse the live step list with a past-tense summary ("Ran code and retrieved data"). */
  collapse(pastTense: string): void
  /** Streams words (25–40ms each, fade-in .15s); table rows stream whole. */
  say(markdown: string, opts?: { wps?: number }): Promise<void>
  card(card: Card): ID
  updateCard(id: ID, card: Partial<Card>): void
  openPanel(target: HalfSheetTarget): void
  ask(q: Omit<Question, 'id'>): Promise<Answers>
  approve(a: ApprovalInput): Promise<ApprovalResult>

}

export type Script = {
  id: string
  /** Long scripts show the "We'll notify you…" banner after 15s. */
  long?: boolean
  /** Score; highest wins (fallback returns 1). */
  match(input: SendInput, db: DB): number
  run(ctx: RunCtx): Promise<void>
}

