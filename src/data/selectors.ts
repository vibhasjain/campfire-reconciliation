import type { DB, EntityRef } from './types'
import { recon } from '@/recon/useRecon'

/** Resolve shared agent references without coupling the composer to a version. */
export function labelFor(db: DB, ref: EntityRef): string {
  if (ref.label) return ref.label
  if (ref.type === 'chat') return db.chats[ref.id]?.title ?? ref.id
  if (ref.type === 'reconItem') return recon.getState().items[ref.id]?.title ?? ref.id
  if (ref.id === 'campfire') return 'Ember'
  return recon.getState().teammates[ref.id as keyof ReturnType<typeof recon.getState>['teammates']]?.name ?? ref.id
}
