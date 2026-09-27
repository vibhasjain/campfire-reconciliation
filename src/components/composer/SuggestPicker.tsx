// Generic @ mention picker, anchored above the caret.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Sparkles } from "lucide-react"
import { Avatar } from "@/components/common"
import { cn } from "@/lib/utils"
import type { SuggestBridge } from "./editor"
import { DEFAULT_MENTIONS, type MentionSource } from "./mention-sources"

type Item = { id: string; label: string; icon: ReactNode; crumb?: string }
type Group = { label: string; items: Item[] }
const PER_GROUP = 10

const match = (q: string) => {
  const w = q.toLowerCase().trim()
  return (s: string) => !w || s.toLowerCase().split(/[^\p{L}\p{N}]+/u).some((x) => x.startsWith(w)) || s.toLowerCase().startsWith(w)
}

function mentionGroups(sources: MentionSource[], query: string): Group[] {
  const matches = match(query)
  const items = sources.filter((source) => matches(source.label)).slice(0, PER_GROUP)
  return [
    {
      label: "Agent",
      items: items.filter((source) => source.type === "agent").map((source) => ({
        id: `${source.type}:${source.id}`, label: source.label, icon: <Sparkles className="text-ai-ink!" />,
      })),
    },
    {
      label: "Teammates",
      items: items.filter((source) => source.type !== "agent").map((source) => ({
        id: `${source.type}:${source.id}`, label: source.label, icon: <Avatar name={source.label} size={14} />,
      })),
    },
  ].filter((group) => group.items.length)
}

export function SuggestPicker({ bridge, sources = DEFAULT_MENTIONS }: { bridge: SuggestBridge; sources?: MentionSource[] }) {
  const s = useSyncExternalStore(bridge.state.subscribe, bridge.state.get)
  const groups = useMemo(() => s ? mentionGroups(sources, s.query) : [], [s, sources])
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const [active, setActive] = useState(0)
  const [prevKey, setPrevKey] = useState("")
  const key = s ? `${s.char}${s.query}` : ""
  if (key !== prevKey) {
    setPrevKey(key)
    setActive(0)
  }
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!s) return
    bridge.setKeyHandler((e) => {
      if (!flat.length) return false
      if (e.key === "ArrowDown") setActive((i) => (i + 1) % flat.length)
      else if (e.key === "ArrowUp") setActive((i) => (i - 1 + flat.length) % flat.length)
      else if (e.key === "Enter" || e.key === "Tab") {
        const it = flat[Math.min(active, flat.length - 1)]
        if (it) s.command({ id: it.id, label: it.label })
      } else return false
      return true
    })
    return () => bridge.setKeyHandler(null)
  }, [s, flat, active, bridge])

  useEffect(() => {
    listRef.current?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" })
  }, [active])

  if (!s || !s.rect || !flat.length) return null
  const width = 260
  const left = Math.max(8, Math.min(s.rect.left - 12, window.innerWidth - width - 8))
  let i = -1
  return createPortal(
    <div
      ref={listRef}
      role="listbox"
      aria-label="Mention Ember or a teammate"
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 max-h-[306px] overflow-y-auto rounded-lg bg-surface p-1 text-sm shadow-menu duration-150 animate-in fade-in-0 zoom-in-98 slide-in-from-bottom-1"
      style={{ left, bottom: window.innerHeight - s.rect.top + 8, width }}
    >
      {groups.map((g) => (
        <div key={g.label} role="group">
          <div className="flex h-[26px] items-center px-2 text-xs text-fg-4">{g.label}</div>
          {g.items.map((it) => {
            i++
            const idx = i
            return (
              <div
                key={it.id}
                role="option"
                aria-selected={idx === active}
                data-active={idx === active}
                onMouseMove={() => setActive(idx)}
                onClick={() => s.command({ id: it.id, label: it.label })}
                className={cn(
                  "flex h-7 items-center gap-2 rounded-md px-2 text-fg-2 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fg-3",
                  idx === active && "bg-fill-hover text-fg"
                )}
              >
                {it.icon}
                <span className="min-w-0 truncate">
                  {it.crumb && <span className="text-fg-3">{it.crumb} › </span>}
                  {it.label}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>,
    document.body
  )
}
