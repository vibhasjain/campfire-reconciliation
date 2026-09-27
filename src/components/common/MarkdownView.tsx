import { useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { marked } from "marked"
import DOMPurify from "dompurify"
import type { EntityRef, EntityType } from "@/data/types"
import { cn } from "@/lib/utils"
import { EntityChip } from "./EntityChip"

const MENTION = /\[\[([a-zA-Z]+):([^\]\s]+)\]\]/g

/** Markdown → sanitized HTML; `[[type:id]]` tokens become placeholder spans filled with EntityChip portals. */
function renderMarkdown(md: string): string {
  const withSlots = md.replace(MENTION, (_, type: string, id: string) => `<span data-mention="${type}:${id}"></span>`)
  return DOMPurify.sanitize(marked.parse(withSlots, { async: false, gfm: true }))
}

const SIZE = {
  chat: "text-base leading-6 font-[450]",
  doc: "text-base leading-[22.5px]",
  sm: "text-sm",
}

const PROSE = [
  "min-w-0 break-words text-fg",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_li>p]:my-0",
  "[&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-medium [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-medium [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:font-medium",
  "[&_strong]:font-medium [&_a]:text-brand-strong [&_a]:underline [&_a]:underline-offset-2",
  "[&_code]:rounded-sm [&_code]:bg-fill-hover [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.87em]",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-fill-subtle [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-fg-3",
  "[&_hr]:my-4 [&_hr]:border-line-subtle",
  "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_th]:border-b-hair [&_th]:border-line [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_th]:text-fg-3 [&_td]:border-b-hair [&_td]:border-line-subtle [&_td]:px-2 [&_td]:py-1.5",
].join(" ")

export function MarkdownView({ markdown, size = "doc", className }: { markdown: string; size?: "chat" | "doc" | "sm"; className?: string }) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown])
  const [slots, setSlots] = useState<{ el: Element; ref: EntityRef }[]>([])
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return
      setSlots(
        [...el.querySelectorAll("[data-mention]")].map((s) => {
          const [type, id] = s.getAttribute("data-mention")!.split(":")
          return { el: s, ref: { type: type as EntityType, id } }
        })
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-scan whenever the HTML changes
    [html]
  )
  return (
    <>
      <div ref={attach} className={cn(PROSE, SIZE[size], className)} dangerouslySetInnerHTML={{ __html: html }} />
      {slots.map((s, i) => createPortal(<EntityChip entity={s.ref} variant="mention" />, s.el, i))}
    </>
  )
}
