// Thread turns (agent §2): user bubble, assistant turn (label, steps, streamed text, cards), thinking indicators.
import { Fragment, useEffect, useState, type ReactNode } from "react"
import { Check, Copy, FileText, Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { EntityRef, EntityType, Message } from "@/data/types"
import { db } from "@/data/store"
import { labelFor } from "@/data/selectors"
import type { RunView } from "@/agent/engine"
import { cn } from "@/lib/utils"
import { ChatMarkdown } from "./ChatMarkdown"
import { ChatSteps } from "./ChatSteps"
import { ChatCard } from "./cards"
import { Mention } from "./Mention"

const MENTION = /\[\[([a-zA-Z]+):([^\]\s]+)\]\]/g

/** "[[type:id]]" tokens, plus legacy "@Label" text for the refs in `mentions`, become inline chips. */
function richText(text: string, mentions: EntityRef[] = []): ReactNode[] {
  const d = db.get()
  const labels = mentions.map((m) => ({ ref: m, at: `@${labelFor(d, m)}` })).filter((x) => text.includes(x.at))
  const out: ReactNode[] = []
  let i = 0
  const pushPlain = (s: string) => {
    let rest = s
    while (rest) {
      const hit = labels.map((l) => ({ l, at: rest.indexOf(l.at) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at)[0]
      if (!hit) {
        out.push(<Fragment key={i++}>{rest}</Fragment>)
        break
      }
      out.push(<Fragment key={i++}>{rest.slice(0, hit.at)}</Fragment>)
      out.push(<Mention key={i++} entity={hit.l.ref} />)
      rest = rest.slice(hit.at + hit.l.at.length)
    }
  }
  let last = 0
  for (const m of text.matchAll(MENTION)) {
    pushPlain(text.slice(last, m.index))
    const entity = mentions.find((ref) => ref.type === m[1] && ref.id === m[2]) ?? { type: m[1] as EntityType, id: m[2]! }
    out.push(<Mention key={i++} entity={entity} />)
    last = m.index! + m[0].length
  }
  pushPlain(text.slice(last))
  return out
}

/** Plain text for the clipboard (mention tokens → labels). */
function plainText(m: Message): string {
  const d = db.get()
  const resolve = (s: string) => s.replace(MENTION, (_, type: EntityType, id: string) => labelFor(d, m.mentions?.find((ref) => ref.type === type && ref.id === id) ?? { type, id }))
  if (m.role === "user") return resolve(m.text ?? "")
  return m.parts.map((p) => (p.type === "text" ? resolve(p.markdown) : "")).filter(Boolean).join("\n\n")
}

function CopyMessage({ m, className }: { m: Message; className?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Copy message"
          onClick={() => {
            void navigator.clipboard?.writeText(plainText(m)).catch(() => {})
            setCopied(true)
          }}
          className={cn(
            "flex size-6 items-center justify-center rounded-md text-fg-4 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 hover:bg-fill-hover hover:text-fg-2 focus-visible:opacity-100",
            className
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? "Copied" : "Copy message"}</TooltipContent>
    </Tooltip>
  )
}

export function UserMessage({ m }: { m: Message }) {
  return (
    <div className="group/msg flex flex-col items-end gap-1 py-9 first:pt-2" data-role="user" data-message-id={m.id}>
      {m.attachments && m.attachments.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1">
          {m.attachments.map((a) => (
            <span key={a.id} className="inline-flex h-6 max-w-[240px] items-center gap-1 rounded-md border-hair border-line bg-surface px-1.5 text-xs text-fg-2">
              <FileText className="size-3.5 shrink-0 text-fg-3" />
              <span className="truncate">{a.name}</span>
            </span>
          ))}
        </div>
      )}
      {m.text && (
        <div className="max-w-full rounded-[10px] bg-fill-hover px-3 py-2 text-base leading-[150%] font-[450] tracking-[0.038px] break-words whitespace-pre-wrap text-fg">
          {richText(m.text, m.mentions)}
        </div>
      )}
      <CopyMessage m={m} />
    </div>
  )
}

/** "Thinking." → ".." → "..." every 500ms (a text swap, not CSS). */
export function ThinkingDots({ label = "Thinking" }: { label?: string }) {
  const [n, setN] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex h-5 items-center gap-1 text-sm text-fg-3">
      <Sparkles size={14} className="text-ai-ink" />
      <span>
        {label}
        {".".repeat(n)}
      </span>
    </div>
  )
}

export function AssistantMessage({ m, run }: { m: Message; run?: RunView }) {
  if (run?.phase === "dots") return <div className="px-[18px]" data-role="assistant"><ThinkingDots /></div>
  const lastLiveSteps = m.parts.length > 0 && m.parts[m.parts.length - 1]!.type === "steps" && (m.parts[m.parts.length - 1] as { live: boolean }).live
  return (
    <div className="group/msg flex flex-col gap-3 px-[18px]" data-role="assistant" data-message-id={m.id}>
      <div className="flex h-5 items-center gap-1 text-sm leading-[145%] font-[450] text-fg-3">
        <Sparkles size={14} className="text-ai-ink" />
        Campfire
      </div>
      {run && m.parts.length === 0 && <div className="text-sm text-fg-4">Thinking...</div>}
      {m.parts.map((p, i) => {
        if (p.type === "steps") return <ChatSteps key={i} part={p} thinking={!!run?.thinking && i === m.parts.length - 1} />
        if (p.type === "text") return <ChatMarkdown key={i} markdown={p.markdown} streaming={p.streaming} />
        return <ChatCard key={p.id} card={p.card} />
      })}
      {run?.thinking && !lastLiveSteps && m.parts.length > 0 && (
        <div className="pt-4">
          <ThinkingDots />
        </div>
      )}
      {!run && m.parts.length > 0 && <CopyMessage m={m} className="-mt-2 -ml-1" />}
    </div>
  )
}
