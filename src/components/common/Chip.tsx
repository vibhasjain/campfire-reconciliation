import type { ReactNode } from "react"
import type { AccentColor } from "@/data/types"
import { cn } from "@/lib/utils"

export type ChipTone = "neutral" | "brand" | AccentColor

/** Small status/value chip. `soft` = tinted bg, `outline` = hairline, `dot` = colored dot + text. */
export function Chip({
  tone = "neutral",
  variant = "soft",
  icon,
  children,
  className,
}: {
  tone?: ChipTone
  variant?: "soft" | "outline" | "dot"
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  const accent = tone !== "neutral" && tone !== "brand" ? tone : null
  const style =
    variant === "soft" && accent
      ? { background: `var(--c-accent-${accent}-tint)`, color: `var(--c-accent-${accent}-text)` }
      : undefined
  return (
    <span
      data-slot="chip"
      style={style}
      className={cn(
        "inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-md px-1.5 text-xs whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
        variant === "soft" && tone === "neutral" && "bg-fill-hover text-fg-2",
        variant === "soft" && tone === "brand" && "bg-brand-tint text-brand-strong",
        variant === "outline" && "border-hair border-line text-fg-2",
        variant === "dot" && "px-0 text-fg-2",
        className
      )}
    >
      {variant === "dot" && (
        <span
          className="size-1.5 rounded-full"
          style={{ background: accent ? `var(--c-accent-${accent})` : tone === "brand" ? "var(--c-brand)" : "var(--c-fg-4)" }}
        />
      )}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
