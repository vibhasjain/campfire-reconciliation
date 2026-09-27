// Adapted from Komo's MIT-licensed types; see LICENSE and NOTICE.md.
import type { Actor } from "@/recon/data"

export interface Identity {
  id: Actor
  name: string
  initials: string
}
export interface Anchor {
  itemId: string
  unstacked?: boolean
}
export interface Thread {
  id: string
  anchor: Anchor
  resolved: boolean
  resolvedBy: Actor | null
  createdAt: number
  updatedAt: number
}
export interface CommentsState {
  threads: Record<string, Thread>
  reactions: Record<string, Record<string, Actor[]>>
  unread: Record<string, number>
  emberUnread: Record<string, boolean>
}
