import type { AccentColor } from "@/data/types"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type Size = 12 | 14 | 16 | 20 | 24 | 32 | 48

/** Initials circle. Members pass their accent color; everyone else is white on fg-disabled. */
export function Avatar({ name, color, size = 16, className }: { name: string; color?: AccentColor; size?: Size; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(6, Math.round(size * 0.42)),
        lineHeight: 1,
        letterSpacing: 0,
        background: color ? `var(--c-accent-${color})` : "var(--c-fg-disabled)",
      }}
    >
      {size >= 14 ? initials(name) : null}
    </span>
  )
}
