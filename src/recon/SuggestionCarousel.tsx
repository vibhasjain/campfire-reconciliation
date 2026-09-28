import { ActionTooltip } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AiMark } from "./AiMark"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Suggestion as ReconSuggestion } from "./data"
import { Suggestion } from "./Suggestion"
import { reconUi, useItem, useReconUi } from "./useRecon"

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
      <Suggestion
        suggestion={suggestion}
        size={size}
        active={active}
        onAccept={onAccept ? () => onAccept(suggestion) : undefined}
        onReject={onReject ? () => onReject(suggestion) : undefined}
      />
      {suggestions.length > 1 && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous suggestion"
              onClick={(event) => {
                event.stopPropagation()
                select(index - 1)
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span
              className="min-w-12 text-center text-[11px] text-fg-3 tabular-nums"
              aria-live="polite"
            >
              {index + 1} of {suggestions.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next suggestion"
              onClick={(event) => {
                event.stopPropagation()
                select(index + 1)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex items-center" aria-label="Choose suggestion">
            {suggestions.map((candidate, candidateIndex) => (
              <ActionTooltip label={`Suggestion ${candidateIndex + 1}: ${candidate.title}`}>
                <button
                  key={candidate.id}
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
