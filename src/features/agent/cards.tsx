// Presentational result cards shared by future reconciliation scripts.
import type { ReactNode } from "react"
import { CircleHelp } from "lucide-react"
import type { Card } from "@/data/types"
import { cn } from "@/lib/utils"
import { ApprovalCard } from "./ApprovalCard"
import { ChatMarkdown } from "./ChatMarkdown"

export function CardFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border-hair border-line bg-surface shadow-button", className)}>{children}</div>
}

export function ChatCard({ card }: { card: Card }) {
  if (card.kind === "approval") return <ApprovalCard approvalId={card.approvalId} />
  if (card.kind === "generic") return (
    <CardFrame className="flex flex-col gap-3 p-4">
      <div className="text-sm font-medium text-fg">{card.title}</div>
      {card.markdown && <ChatMarkdown markdown={card.markdown} />}
    </CardFrame>
  )
  return (
    <CardFrame className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-fg">
        <CircleHelp className="size-4 text-fg-3" /> Answers
      </div>
      {card.qa.map((answer, i) => (
        <div key={i} className="flex flex-col gap-1 text-sm">
          <span className="text-fg-4">{answer.q}</span>
          <span className="font-medium text-fg">{answer.a}</span>
        </div>
      ))}
    </CardFrame>
  )
}
