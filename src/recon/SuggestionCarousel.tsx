import { useEffect, useRef, useState } from "react"
import { animate, motion, useReducedMotion } from "motion/react"
import { ActionTooltip } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AiMark } from "./AiMark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Suggestion as ReconSuggestion } from "./data"
import { Suggestion } from "./Suggestion"
import { reconUi, useItem, useReconUi } from "./useRecon"
import { cycleSuggestion } from "./actions"

export interface SuggestionCarouselProps {
  itemId: string
  size?: "compact" | "full"
  active?: boolean
  onAccept?: (suggestion: ReconSuggestion) => void
  onReject?: (suggestion: ReconSuggestion) => void
}

export function SuggestionCarousel({
  itemId,
  size = "full",
  active = true,
  onAccept,
  onReject,
}: SuggestionCarouselProps) {
  const item = useItem(itemId)
  const storedIndex = useReconUi((state) => state.suggestionIndex[itemId] ?? 0)
  const reducedMotion = useReducedMotion()
  // Stepping with a lone suggestion gives the "Suggestion 1 of 1" label a tiny sideways nudge.
  const nudge = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const onEdge = (event: Event) => {
      if (
        (event as CustomEvent<string>).detail !== itemId ||
        reducedMotion ||
        !nudge.current
      )
        return
      animate(
        nudge.current,
        { x: [0, -2, 2, -1, 0] },
        { duration: 0.22, ease: "easeOut" }
      )
    }
    addEventListener("recon:suggestion-edge", onEdge)
    return () => removeEventListener("recon:suggestion-edge", onEdge)
  }, [itemId, reducedMotion])
  const [observed, setObserved] = useState({
    itemId,
    suggestions: item?.suggestions,
    freshId: "",
  })
  if (
    observed.itemId !== itemId ||
    observed.suggestions !== item?.suggestions
  ) {
    const fresh =
      observed.itemId === itemId &&
      item?.suggestions.find(
        (candidate) =>
          candidate.id === `${itemId}-ember-follow-up` &&
          !observed.suggestions?.some(
            (previous) => previous.id === candidate.id
          )
      )
    setObserved({
      itemId,
      suggestions: item?.suggestions,
      freshId: fresh ? fresh.id : "",
    })
  }
  if (!item) return null
  const suggestions = item.suggestions
  const index = Math.max(0, Math.min(storedIndex, suggestions.length - 1))
  const suggestion = suggestions[index]
  const select = (next: number) =>
    reconUi.set((state) => ({
      ...state,
      suggestionIndex: {
        ...state.suggestionIndex,
        [itemId]: (next + suggestions.length) % suggestions.length,
      },
    }))
  if (!suggestion)
    return (
      <div className="flex items-center gap-2 rounded-lg border-hair border-line px-3 py-4 text-xs text-fg-3">
        <AiMark />
        No suggestions left. Ask Ember to look again.
      </div>
    )
  return (
    <div
      className="min-w-0"
      role="region"
      aria-label={`Suggestions for ${item.title}`}
    >
      <motion.div
        key={suggestion.id}
        className="rounded-lg"
        initial={
          observed.freshId === suggestion.id && !reducedMotion
            ? { opacity: 0, scale: 0.98 }
            : false
        }
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow:
            observed.freshId === suggestion.id && !reducedMotion
              ? [
                  "0 0 0 1px var(--c-ai-glow)",
                  "0 0 14px 2px var(--c-ai-glow)",
                  "0 0 0 0px transparent",
                ]
              : "0 0 0 0px transparent",
        }}
        transition={{
          duration: reducedMotion ? 0 : 0.2,
          boxShadow: { duration: reducedMotion ? 0 : 1 },
        }}
        onAnimationComplete={() => {
          if (observed.freshId)
            setObserved((current) => ({ ...current, freshId: "" }))
        }}
      >
        <Suggestion
          suggestion={suggestion}
          size={size}
          active={active}
          onAccept={onAccept ? () => onAccept(suggestion) : undefined}
          onReject={onReject ? () => onReject(suggestion) : undefined}
        />
      </motion.div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous suggestion"
              shortcut="←"
              onClick={(event) => {
                event.stopPropagation()
                cycleSuggestion(itemId, -1)
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              ref={nudge}
              className="min-w-12 shrink-0 text-center text-[11px] whitespace-nowrap text-fg-3 tabular-nums"
              aria-live="polite"
            >
              Suggestion {index + 1} of {suggestions.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next suggestion"
              shortcut="→"
              onClick={(event) => {
                event.stopPropagation()
                cycleSuggestion(itemId, 1)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex items-center" aria-label="Choose suggestion">
            {suggestions.map((candidate, candidateIndex) => (
              <ActionTooltip
                key={candidate.id}
                label={`Suggestion ${candidateIndex + 1}: ${candidate.title}`}
              >
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-md outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus"
                  aria-label={`Suggestion ${candidateIndex + 1}: ${candidate.title}`}
                  aria-pressed={candidateIndex === index}
                  onClick={(event) => {
                    event.stopPropagation()
                    select(candidateIndex)
                  }}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      candidateIndex === index ? "bg-brand" : "bg-line-strong"
                    )}
                  />
                </button>
              </ActionTooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
