import { EMBER_PATHS } from "./ember-paths"
import { cn } from "@/lib/utils"

// Ember's flame + spark, rendered as restrained line work at every entry point.
export function EmberIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="18 18 124 142"
      fill="none"
      stroke="currentColor"
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-ai drop-shadow-[0_0_2px_var(--c-ai-glow)]", className)}
    >
      {EMBER_PATHS.map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
