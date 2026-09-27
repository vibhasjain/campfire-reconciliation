import { restoreSlice, persistSlice } from "./persistence"
import { useRef, useSyncExternalStore } from 'react'
import type { DB, ID, Row, TableName } from './types'

/** Small synchronous external store; prototype data lives only in memory. */
export function createStore<S>(init: S) {
  let state = init
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(fn: (s: S) => S) {
      const next = fn(state)
      if (next === state) return
      state = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

const restored = restoreSlice<DB>("db", { chats: {}, messages: {}, approvals: {} }, value =>
  Object.values(value.chats).every(c => typeof c.id === 'string' && Array.isArray(c.context)) &&
  Object.values(value.messages).every(m => typeof m.id === 'string' && typeof m.chatId === 'string' && Array.isArray(m.parts) && m.parts.every(p =>
    p.type === 'text' ? typeof p.markdown === 'string' : p.type === 'steps' ? Array.isArray(p.steps) && p.steps.every(s => typeof s.id === 'string') : p.type === 'card' && !!p.card?.kind)) &&
  Object.values(value.approvals).every(a => Array.isArray(a.rows) && a.rows.every(r => typeof r.id === 'string'))
)
// A reload ends interrupted runs; their partial output remains readable.
for (const chat of Object.values(restored.chats)) { chat.status = 'idle'; delete chat.pendingQuestion }
for (const message of Object.values(restored.messages)) message.parts = message.parts.map(part =>
  part.type === 'text' ? { ...part, streaming: false } : part.type === 'steps' ? {
    ...part, live: false, open: false, steps: part.steps.map(step => step.state === 'running' ? { ...step, state: 'done' as const } : step),
  } : part)
for (const approval of Object.values(restored.approvals)) approval.rows = approval.rows.map(row =>
  row.state === 'pending' || row.state === 'approving' ? { ...row, state: 'dismissed' as const } : row)
export const db = createStore<DB>(restored)
persistSlice("db", db.get, db.subscribe)

/** Subscribe to a narrow slice. Result is kept referentially stable while `isEqual` says it didn't change. */
export function useDB<T>(selector: (db: DB) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const cache = useRef<{ s: DB; sel: unknown; v: T } | null>(null)
  const getSnapshot = () => {
    const s = db.get()
    const c = cache.current
    if (c && c.s === s && c.sel === selector) return c.v
    const v = selector(s)
    const out = c && isEqual(c.v, v) ? c.v : v
    cache.current = { s, sel: selector, v: out }
    return out
  }
  return useSyncExternalStore(db.subscribe, getSnapshot, getSnapshot)
}

/** For `useDB(d => [...], shallowEqual)` — element-wise (arrays) or key-wise (objects) identity. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

export function insert<K extends TableName>(table: K, row: Row<K>): Row<K> {
  db.set((state) => ({ ...state, [table]: { ...state[table], [row.id]: row } }))
  return row
}

export function patch<K extends TableName>(table: K, id: ID, changes: Partial<Row<K>>): void {
  db.set((state) => {
    const row = state[table][id]
    return row ? { ...state, [table]: { ...state[table], [id]: { ...row, ...changes } } } : state
  })
}

export function hardDelete(table: TableName, ids: ID[]): void {
  db.set((state) => ({
    ...state,
    [table]: Object.fromEntries(Object.entries(state[table]).filter(([id]) => !ids.includes(id))),
  }))
}

let sequence = Math.max(0, ...[...Object.keys(restored.chats), ...Object.keys(restored.messages), ...Object.keys(restored.approvals)].map(id => Number(id.match(/_(\d+)$/)?.[1] ?? 0)))
export function nextId(prefix: string): ID {
  return `${prefix}_${++sequence}`
}
