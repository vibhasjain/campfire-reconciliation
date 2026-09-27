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

export const db = createStore<DB>({ chats: {}, messages: {}, approvals: {} })

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

let sequence = 0
export function nextId(prefix: string): ID {
  return `${prefix}_${++sequence}`
}
