import { cn } from "@/lib/utils"

/** Open-arc spinner, 1.5s/rev (running chat, uploading chip, creating card). */
export function Arc({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg aria-label="In progress" width={size} height={size} viewBox="0 0 12 12" className={cn("shrink-0 animate-spin-arc text-fg-4", className)}>
      <path d="M6 1.25a4.75 4.75 0 1 1-4.75 4.75" fill="none" stroke="currentColor" strokeWidth={size > 14 ? 1.1 : 1.4} strokeLinecap="round" />
    </svg>
  )
}
