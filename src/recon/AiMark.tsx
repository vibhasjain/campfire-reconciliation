import { EmberIcon } from "@/components/common/EmberIcon"
import { cn } from "@/lib/utils"

// The one AI glyph: Ember line work, with a faint orange glow.
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center",
        className
      )}
    >
      <EmberIcon className="size-full" />
    </span>
  )
}
