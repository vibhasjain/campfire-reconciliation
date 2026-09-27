import type { DB, EntityRef } from './types'

/** Generic labels for agent and teammate mentions; no record lookup or navigation. */
export function labelFor(db: DB, ref: EntityRef): string {
  return ref.label ?? (ref.type === 'chat' ? db.chats[ref.id]?.title : undefined) ?? (ref.id === 'ember' ? 'Ember' : ref.id)
}
