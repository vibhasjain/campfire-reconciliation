import type { EntityRef } from "@/data/types"

/** Callers can replace this list with the people in their current workspace. */
export type MentionSource = EntityRef & { label: string }
export const DEFAULT_MENTIONS: MentionSource[] = [
  { type: "agent", id: "ember", label: "Ember" },
  { type: "member", id: "maya", label: "Maya Patel" },
]
