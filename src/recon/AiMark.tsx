import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// The one AI glyph: a small lime sparkle in a deep-green dot.
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand text-ai",
        className
      )}
    >
      <Sparkles className="size-2.5" strokeWidth={2} />
    </span>
  )
}
