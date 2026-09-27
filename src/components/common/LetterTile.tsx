import { cn } from "@/lib/utils"

/** Generic initial tile: rounded square with the first letter. */
export function LetterTile({ name, size = 16, className }: { name: string; size?: 14 | 16 | 20 | 48; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center border-hair border-line bg-fill-hover font-medium text-fg-3 uppercase select-none",
        className
      )}
      style={{ width: size, height: size, borderRadius: size >= 48 ? 10 : 4, fontSize: Math.round(size * 0.45), lineHeight: 1 }}
    >
      {name.trim().charAt(0)}
    </span>
  )
}
