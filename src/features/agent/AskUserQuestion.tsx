// Question widget above the composer (agent §2.6): radio options with number hints, "Other" input, Skip / Submit.
import { useEffect, useRef, useState } from "react"
import { CornerDownLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ID, Question } from "@/data/types"
import { answerQuestion } from "@/agent/engine"
import { cn } from "@/lib/utils"

export function AskUserQuestion({ chatId, q }: { chatId: ID; q: Question }) {
  const [sel, setSel] = useState<number | null>(null)
  const [other, setOther] = useState("")
  const otherRef = useRef<HTMLInputElement>(null)
  const otherIdx = q.allowOther ? q.options.length : -1
  const answer = sel === null ? "" : sel === otherIdx ? other.trim() : q.options[sel]!
  const submit = () => answer && answerQuestion(chatId, { [q.id]: answer })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      if (el?.closest("input, textarea, [contenteditable=true]")) return
      const n = Number(e.key)
      if (n >= 1 && n <= q.options.length + (q.allowOther ? 1 : 0)) {
        e.preventDefault()
        setSel(n - 1)
        if (n - 1 === otherIdx) otherRef.current?.focus()
      } else if (e.key === "Enter" && answer) {
        e.preventDefault()
        answerQuestion(chatId, { [q.id]: answer })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [q, otherIdx, answer, chatId])

  const kbd = (n: number) => (
    <kbd className="ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-sm border-hair border-line text-xxs text-fg-3 tabular-nums">{n}</kbd>
  )
  const row = "flex h-9 w-full items-center gap-2 rounded-md px-1.5 text-left text-sm text-fg hover:bg-fill-subtle"
  return (
    <section
      aria-label="Questions from the assistant"
      className="flex flex-col gap-1 rounded-xl border-hair border-line bg-surface p-3 pb-2 shadow-button-lg duration-150 animate-in fade-in-0 slide-in-from-bottom-1"
    >
      <div className="flex items-start gap-2 pb-1">
        <span className="flex-1 text-sm font-medium text-fg">{q.title}</span>
        <button type="button" aria-label="Dismiss questions" onClick={() => answerQuestion(chatId, "skip")} className="text-fg-3 hover:text-fg">
          <X className="size-4" />
        </button>
      </div>
      <div role="radiogroup" className="flex flex-col">
        {q.options.map((o, i) => (
          <button key={o} type="button" role="radio" aria-checked={sel === i} onClick={() => setSel(i)} className={cn(row, sel === i && "bg-fill-hover hover:bg-fill-hover")}>
            <span className="min-w-0 flex-1 truncate">{o}</span>
            {kbd(i + 1)}
          </button>
        ))}
        {q.allowOther && (
          <div role="radio" aria-checked={sel === otherIdx} onClick={() => setSel(otherIdx)} className={cn(row, sel === otherIdx && "bg-fill-hover hover:bg-fill-hover")}>
            <input
              ref={otherRef}
              value={other}
              placeholder="Other"
              onFocus={() => setSel(otherIdx)}
              onChange={(e) => setOther(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-fg-hint"
            />
            {kbd(otherIdx + 1)}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-1 pt-1">
        <Button onClick={() => answerQuestion(chatId, "skip")}>Skip</Button>
        <Button variant="brand" disabled={!answer} onClick={submit}>
          Submit <CornerDownLeft className="size-3!" />
        </Button>
      </div>
    </section>
  )
}
