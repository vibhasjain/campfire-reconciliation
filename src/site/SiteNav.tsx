import type { KeyboardEvent } from "react"
import { prefetch } from "./loaders"
import { FILTERS, type SiteFilter } from "./versions"

const PAGES = [
  ["Story", "/story/"],
  ["References", "/references"],
] as const

const item = (active: boolean) =>
  `cursor-pointer rounded px-3 py-1 text-sm whitespace-nowrap outline-none max-sm:px-2 max-sm:text-xs ${active ? "bg-segment-active font-medium text-fg" : "text-fg-3"}`

/** Site sections: Code/Brilliant/Paper filter the version cards; Story and References go straight to their page. */
export function SiteNav({
  current,
  onFilter,
  onArrowDown,
}: {
  current: SiteFilter | "Story" | "References"
  /** On version control the filters switch in place; elsewhere they link back to it. */
  onFilter?: (filter: SiteFilter) => void
  onArrowDown?: () => void
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" && onArrowDown) {
      event.preventDefault()
      onArrowDown()
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>("button, a")
      )
      const index = items.indexOf(event.target as HTMLElement)
      items[
        (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
          items.length
      ]?.focus()
    }
  }
  return (
    <div
      role="group"
      aria-label="Sections"
      className="contents"
      onKeyDown={onKeyDown}
    >
      <div className="flex shrink-0 gap-0.5 rounded-md border-hair border-line bg-segment p-1 max-sm:order-2">
        {FILTERS.map((filter) =>
          onFilter ? (
            <button
              key={filter}
              type="button"
              aria-pressed={current === filter}
              onClick={() => onFilter(filter)}
              className={item(current === filter)}
            >
              {filter}
            </button>
          ) : (
            <a
              key={filter}
              href={`/version-control?view=${filter.toLowerCase()}`}
              onMouseEnter={() => prefetch("/version-control")}
              className={item(false)}
            >
              {filter}
            </a>
          )
        )}
      </div>
      <div className="ml-auto flex shrink-0 gap-0.5 rounded-md border-hair border-line bg-segment p-1 max-sm:order-3">
        {PAGES.map(([label, href]) => (
          <a
            key={label}
            href={href}
            aria-current={current === label ? "page" : undefined}
            onMouseEnter={() => prefetch(href)}
            onFocus={() => prefetch(href)}
            className={item(current === label)}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
