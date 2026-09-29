import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Code2, Images, PenTool, Presentation } from "lucide-react"
import { Chip, type ChipTone } from "@/components/common/Chip"
import SiteFrame from "./SiteFrame"
import { LIVE, REPO, VERSIONS, type Medium } from "./versions"
import { CARD_COPY } from "./cardCopy"
import { prefetch } from "./loaders"
import { SiteNav } from "./SiteNav"

const APPEARANCE: Record<Medium, { icon: typeof Code2; tone: ChipTone }> = {
  Code: { icon: Code2, tone: "green" },
  // Brilliant and Paper canvases are both vector work.
  Brilliant: { icon: PenTool, tone: "blue" },
  Paper: { icon: PenTool, tone: "blue" },
  Story: { icon: Presentation, tone: "purple" },
  References: { icon: Images, tone: "gray" },
}
const sorted = [...VERSIONS].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
})

function restoredState() {
  const saved = history.state?.versions
  return {
    active: SHOWN.some((v) => v.id === saved?.active)
      ? (saved.active as string)
      : SHOWN[0].id,
  }
}

// One page: the three live prototypes, then the three latest Brilliant and three latest Paper canvases.
const latest = (medium: Medium) =>
  sorted.filter((v) => v.medium === medium).slice(0, 3)
const SHOWN = [
  ...LIVE,
  ...sorted.filter((v) =>
    [...latest("Brilliant"), ...latest("Paper")].includes(v)
  ),
]

function openLink(href: string, event: { metaKey: boolean; ctrlKey: boolean }) {
  if (event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener")
  else location.assign(href)
}

export default function VersionControlPage() {
  const [initial] = useState(restoredState)
  const [active, setActive] = useState(initial.active)
  const grid = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<string, HTMLDivElement>())
  const visible = SHOWN
  const activeId = visible.some((v) => v.id === active)
    ? active
    : visible[0]?.id

  useEffect(() => {
    const first = cards.current.values().next().value
    const restored = cards.current.get(initial.active) ?? first
    restored?.focus({ preventScroll: true })
    // Back from a page: bring the remembered card into view (the async page misses scroll restoration).
    if (restored && restored !== first)
      restored.scrollIntoView({ block: "center" })
  }, [initial])

  useEffect(() => {
    history.replaceState({ ...history.state, versions: { active } }, "")
  }, [active])

  function navigate(event: KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.altKey) return
    const columns = grid.current
      ? getComputedStyle(grid.current).gridTemplateColumns.split(" ").length
      : 1
    let next = index
    if (event.key === "ArrowLeft" && index % columns > 0) next--
    if (
      event.key === "ArrowRight" &&
      index % columns < columns - 1 &&
      index + 1 < visible.length
    )
      next++
    if (event.key === "ArrowUp" && index >= columns) next -= columns
    if (
      event.key === "ArrowDown" &&
      Math.floor(index / columns) < Math.floor((visible.length - 1) / columns)
    )
      next = Math.min(index + columns, visible.length - 1)
    if (event.key.startsWith("Arrow")) {
      event.preventDefault()
      cards.current.get(visible[next].id)?.focus()
    }
    const link =
      event.key === "Enter" && event.target === event.currentTarget
        ? visible[index].links[0]
        : undefined
    if (link) {
      event.preventDefault()
      openLink(link.href, event)
    }
  }

  return (
    <SiteFrame
      title="Version control"
      toolbar={
        <SiteNav
          current="Versions"
          onArrowDown={() => {
            if (visible[0]) cards.current.get(visible[0].id)?.focus()
          }}
        />
      }
    >
      <div
        ref={grid}
        className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3"
      >
        {visible.map((version, index) => {
          const { icon: Icon, tone } = APPEARANCE[version.medium]
          const copy = CARD_COPY[version.id]
          return (
            <div
              key={version.id}
              ref={(node) => {
                if (node) cards.current.set(version.id, node)
                else cards.current.delete(version.id)
              }}
              role="group"
              aria-label={`${version.medium} ${version.version}: ${copy?.title ?? version.title}`}
              tabIndex={version.id === activeId ? 0 : -1}
              onFocus={(e) => {
                setActive(version.id)
                if (e.target === e.currentTarget)
                  prefetch(version.links[0].href)
              }}
              onMouseEnter={() => prefetch(version.links[0].href)}
              onKeyDown={(e) => navigate(e, index)}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("a, button"))
                  openLink(version.links[0].href, e)
              }}
              className="flex min-w-0 cursor-pointer flex-col rounded-xl border-hair border-line bg-surface p-5 outline-none hover:border-line-strong focus:border-brand focus:ring-2 focus:ring-focus"
            >
              <div className="flex items-center gap-2">
                <Chip tone={tone} icon={<Icon />}>
                  {version.medium === "Brilliant" || version.medium === "Paper"
                    ? "Vector"
                    : version.medium}
                </Chip>
                {version.at ? (
                  <time
                    dateTime={version.at}
                    className="ml-auto shrink-0 text-xs whitespace-nowrap text-fg-4 tabular-nums"
                  >
                    {time.format(new Date(version.at))}
                  </time>
                ) : (
                  <span className="ml-auto shrink-0 text-xs text-fg-4">
                    Live
                  </span>
                )}
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="max-w-24 min-w-0 truncate text-sm text-fg-3 tabular-nums">
                  {version.version}
                </span>
                <h2 className="min-w-0 truncate text-sm font-medium">
                  {copy?.title ?? version.title}
                </h2>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-fg-3">
                {(copy?.lines ?? version.changes).slice(0, 4).map((line) => (
                  <li key={line} className="truncate">
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-4 empty:hidden">
                {version.commit && (
                  <a
                    href={`${REPO}/commit/${version.commit}`}
                    className="ml-auto min-w-0 truncate rounded-md text-xs text-fg-4 tabular-nums hover:text-brand focus-visible:outline-2 focus-visible:outline-focus"
                    aria-label={`Commit ${version.commit}`}
                  >
                    {version.commit}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {visible.length === 0 && (
        <p role="status" className="py-16 text-center text-sm text-fg-3">
          No versions found
        </p>
      )}
    </SiteFrame>
  )
}
