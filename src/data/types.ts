// In-memory contracts shared by the composer, scripted agent and its renderers.
export type ID = string
export type ISO = string
export type AccentColor = 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'blue' | 'indigo' | 'purple' | 'copper' | 'gray'
export type EntityType = string
export type EntityRef = { type: EntityType; id: ID; label?: string }

type Base = { id: ID; createdAt: ISO; createdBy: ID }

export type ToolStepKind = 'thought' | 'data' | 'code' | 'search' | 'web' | 'calendar' | 'subagent' | 'file' | 'done'
export type ToolStep = {
  id: ID
  kind: ToolStepKind
  label: string
  sub?: string
  state: 'running' | 'done' | 'error'
  code?: string
  output?: string
  error?: string
  rows?: string[][]
  file?: string
  subagent?: { ref: EntityRef; markdown: string }
}
export type Card =
  | { kind: 'generic'; title: string; markdown?: string }
  | { kind: 'approval'; approvalId: ID }
  | { kind: 'answers'; qa: { q: string; a: string }[] }
  | { kind: 'recon-candidate'; itemId: ID; suggestionId: ID }
  | { kind: 'recon-change'; actionId: ID; label: string; detail?: string }
  | { kind: 'recon-item'; itemId: ID }
export type MessagePart =
  | { type: 'text'; markdown: string; streaming?: boolean }
  | { type: 'steps'; status: string; live: boolean; open: boolean; steps: ToolStep[] }
  | { type: 'card'; id: ID; card: Card }
export type Attachment = { id: ID; name: string; size: number; mime: string; text?: string; state: 'uploading' | 'ready' }
export type Message = {
  id: ID
  chatId: ID
  role: 'user' | 'assistant'
  author?: 'maya' | 'daniel' | 'priya' | 'ember'
  createdAt: ISO
  text?: string
  mentions?: EntityRef[]
  attachments?: Attachment[]
  parts: MessagePart[]
}
export type Chat = Base & {
  title: string
  updatedAt: ISO
  status: 'idle' | 'running'
  unread: boolean
  context: EntityRef[]
  pendingQuestion?: Question
}
export type Question = { id: ID; title: string; options: string[]; allowOther: boolean }
export type Approval = Base & {
  chatId: ID
  title: string
  rows: { id: ID; label: string; detail?: string; state: 'pending' | 'approving' | 'approved' | 'dismissed' }[]
}
export type DB = {
  chats: Record<ID, Chat>
  messages: Record<ID, Message>
  approvals: Record<ID, Approval>
}
export type TableName = keyof DB
export type Row<K extends TableName> = DB[K][ID]
