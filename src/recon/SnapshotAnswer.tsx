import type { MessagePart } from "@/data/types"
import { send } from "@/agent/engine"
import { ChatMarkdown } from "@/features/agent/ChatMarkdown"
import { useRecon } from "./useRecon"
export function SnapshotAnswer({ part, chatId }: { part: Extract<MessagePart, { type: "text" }>; chatId: string }) {
  const clock = useRecon(state => state.clock)
  const snapshot = part.snapshot
  return <><ChatMarkdown markdown={part.markdown} streaming={part.streaming} className="gap-2 text-sm leading-5 font-normal" />
    {snapshot && snapshot.clock !== clock && !part.streaming && <button type="button" className="self-start text-xs text-fg-4 hover:text-fg-2" onClick={() => send({ chatId, text: snapshot.question, mentions: [], attachments: [], context: [] })}>Out of date · Ask again</button>}
  </>
}
