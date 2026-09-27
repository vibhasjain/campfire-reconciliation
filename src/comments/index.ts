/** Public boundary: consumers can remove this directory without internal imports. */
export { ThreadView, type ThreadViewProps } from "./ThreadView"
export { ThreadPin } from "./ThreadPin"
export { ThreadPopover, type ThreadPopoverProps } from "./ThreadPopover"
export { CommentsInbox } from "./CommentsInbox"
export { ParticipantAvatar } from "./ParticipantAvatar"
export {
  comments,
  useComments,
  useUnreadCount,
  toggleInbox,
  ensureThread,
  threadChatId,
  postToThread,
  appendThreadMessage,
  focusThread,
  markThreadRead,
  setThreadResolved,
  reactTo,
  seedThreads,
} from "./store"
export type { Thread, Anchor, Identity, CommentsState } from "./types"
