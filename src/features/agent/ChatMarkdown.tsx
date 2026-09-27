// Assistant markdown rendered to React (not innerHTML) so streamed words keep their DOM nodes:
// each word is a keyed <span>; new ones mount with the 150ms `word-in` fade (agent §2.1 step 5).
import { Fragment, useMemo, type ReactNode } from "react"
import { marked, type Token, type Tokens } from "marked"
import type { EntityType } from "@/data/types"
import { closeDangling } from "@/agent/text"
import { cn } from "@/lib/utils"
import { Mention } from "./Mention"

const MENTION = /\[\[([a-zA-Z]+):([^\]\s]+)\]\]/g

type Ctx = { animate: boolean; n: number }

function words(text: string, c: Ctx): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  const push = (s: string) => {
    for (const w of s.split(/(?<=\s)/)) {
      if (!w) continue
      const k = c.n++
      out.push(
        <span key={k} className={c.animate ? "animate-word-in" : undefined}>
          {w}
        </span>
      )
    }
  }
  for (const m of text.matchAll(MENTION)) {
    push(text.slice(last, m.index))
    const k = c.n++
    out.push(
      <span key={k} className={cn("inline", c.animate && "animate-word-in")}>
        <Mention entity={{ type: m[1] as EntityType, id: m[2]! }} />
      </span>
    )
    last = m.index! + m[0].length
  }
  push(text.slice(last))
  return out
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")

function inline(tokens: Token[] | undefined, c: Ctx): ReactNode[] {
  return (tokens ?? []).map((t, i) => {
    switch (t.type) {
      case "text":
      case "escape":
        return (t as Tokens.Text).tokens ? <Fragment key={i}>{inline((t as Tokens.Text).tokens, c)}</Fragment> : <Fragment key={i}>{words(decode((t as Tokens.Text).text), c)}</Fragment>
      case "strong":
        return <strong key={i} className="font-semibold">{inline((t as Tokens.Strong).tokens, c)}</strong>
      case "em":
        return <em key={i}>{inline((t as Tokens.Em).tokens, c)}</em>
      case "del":
        return <del key={i}>{inline((t as Tokens.Del).tokens, c)}</del>
      case "codespan":
        return (
          <code key={i} className={cn("rounded-sm bg-fill-hover px-1 py-px font-mono text-[0.87em]", c.animate && "animate-word-in")}>
            {decode((t as Tokens.Codespan).text)}
          </code>
        )
      case "link":
        return (
          <a key={i} href={(t as Tokens.Link).href} target="_blank" rel="noreferrer" className="text-brand-strong underline underline-offset-2">
            {inline((t as Tokens.Link).tokens, c)}
          </a>
        )
      case "br":
        return <br key={i} />
      default:
        return <Fragment key={i}>{words(decode("text" in t ? String(t.text) : t.raw), c)}</Fragment>
    }
  })
}

function blocks(tokens: Token[], c: Ctx): ReactNode[] {
  return tokens.map((t, i) => {
    switch (t.type) {
      case "space":
        return null
      case "paragraph":
        return <p key={i}>{inline((t as Tokens.Paragraph).tokens, c)}</p>
      case "text":
        return <p key={i}>{(t as Tokens.Text).tokens ? inline((t as Tokens.Text).tokens, c) : words((t as Tokens.Text).text, c)}</p>
      case "heading": {
        const h = t as Tokens.Heading
        const cls = h.depth === 1 ? "text-2xl font-medium" : h.depth === 2 ? "text-lg font-medium" : "font-medium"
        return <div key={i} role="heading" aria-level={h.depth} className={cls}>{inline(h.tokens, c)}</div>
      }
      case "list": {
        const l = t as Tokens.List
        const L = l.ordered ? "ol" : "ul"
        return (
          <L key={i} className={cn("flex flex-col gap-1.5 pl-8", l.ordered ? "list-decimal" : "list-disc")}>
            {l.items.map((it, j) => (
              <li key={j} className="pl-1 [&>p]:inline [&>ul]:mt-1.5 [&>ol]:mt-1.5">
                {blocks(it.tokens, c)}
              </li>
            ))}
          </L>
        )
      }
      case "table":
        return <ProseTable key={i} t={t as Tokens.Table} c={c} />
      case "code":
        return (
          <pre key={i} className="overflow-x-auto rounded-md border-hair border-line bg-surface p-4 font-mono text-[13px] leading-5">
            <code>{(t as Tokens.Code).text}</code>
          </pre>
        )
      case "blockquote":
        return <blockquote key={i} className="border-l-2 border-line pl-3 text-fg-3">{blocks((t as Tokens.Blockquote).tokens, c)}</blockquote>
      case "hr":
        return <hr key={i} className="border-line-subtle" />
      default:
        return <p key={i}>{words(t.raw, c)}</p>
    }
  })
}

/** Full-bleed to the right edge of the chat column's container; scrolls horizontally when wide (agent §2.4). */
function ProseTable({ t, c }: { t: Tokens.Table; c: Ctx }) {
  return (
    <div className="mr-[calc(50%-50cqw)] overflow-x-auto pr-4 [scrollbar-width:thin]">
      <table className="w-max min-w-[min(100%,680px)] border-separate border-spacing-0 overflow-hidden rounded-md border-hair border-line bg-page text-sm">
        <thead>
          <tr className={cn(c.animate && "animate-word-in")}>
            {t.header.map((h, j) => (
              <th key={j} className="border-b-hair border-line px-4 py-2.5 text-left font-normal whitespace-nowrap text-fg-4">
                {inline(h.tokens, { ...c, animate: false })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, j) => (
            <tr key={j} className={cn(c.animate && "animate-word-in")}>
              {r.map((cell, k) => (
                <td key={k} className={cn("h-[39px] px-4 py-2 whitespace-nowrap text-fg", j < t.rows.length - 1 && "border-b-hair border-line")}>
                  {inline(cell.tokens, { ...c, animate: false })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChatMarkdown({ markdown, streaming, className }: { markdown: string; streaming?: boolean; className?: string }) {
  const tokens = useMemo(() => marked.lexer(streaming ? closeDangling(markdown) : markdown, { gfm: true }), [markdown, streaming])
  const c: Ctx = { animate: !!streaming, n: 0 }
  return <div className={cn("flex min-w-0 flex-col gap-4 text-base leading-6 font-[450] tracking-[0.038px] break-words text-fg", className)}>{blocks(tokens, c)}</div>
}
