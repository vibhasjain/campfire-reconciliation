import { Chip } from "@/components/common/Chip"
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import SiteFrame from "./SiteFrame"
import { SiteNav } from "./SiteNav"
import { REFERENCES } from "./references"

const SOFTWARE = ["Campfire", "Rillet", "Numeric"] as const
// Each company's signature color: Campfire green, Rillet purple, Numeric blue.
const TONE = { Campfire: "brand", Rillet: "purple", Numeric: "blue" } as const
// One preview for every reference, in page order, so ← → can walk (and loop) through all of them.
const ORDERED = SOFTWARE.flatMap((software) =>
  REFERENCES.filter((item) => item.software === software)
)

export default function ReferencesPage() {
  const [open, setOpen] = useState<number | null>(null)
  const shown = open === null ? null : ORDERED[open]
  // Grid keys (no lightbox): arrows move the selection instead of scrolling, Enter opens it, Esc goes back to version control.
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    if (open !== null) return
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return
      if (event.key === "Escape") {
        location.href = "/version-control"
        return
      }
      if (event.key === "Enter") {
        event.preventDefault()
        setOpen(selected)
        return
      }
      const columns = matchMedia("(min-width: 700px)").matches ? 2 : 1
      const delta = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columns,
        ArrowUp: -columns,
      }[event.key]
      if (delta === undefined) return
      event.preventDefault()
      const next = Math.max(0, Math.min(ORDERED.length - 1, selected + delta))
      setSelected(next)
      const card = document.querySelectorAll("[data-reference]")[next]
      card?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [open, selected])
  const step = (delta: number) =>
    setOpen((current) =>
      current === null
        ? null
        : (current + delta + ORDERED.length) % ORDERED.length
    )
  return (
    <SiteFrame
      title="What I looked at"
      back="versions"
      toolbar={<SiteNav current="References" />}
    >
      {/* One grid; each reference carries its company as a tag, so no section dividers. */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[700px]:grid-cols-2">
        {ORDERED.map((item, index) => (
          <figure key={item.src} className="min-w-0">
            <button
              data-reference
              data-selected={selected === index || undefined}
              onClick={() => {
                setSelected(index)
                setOpen(index)
              }}
              aria-label={`Enlarge ${item.title}`}
              className="flex aspect-[16/10] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border-hair border-line bg-surface p-2 outline-none hover:border-line-strong data-[selected]:border-brand"
            >
              <img
                src={item.src}
                alt={item.title}
                width={item.width}
                height={item.height}
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : "auto"}
                decoding="async"
                className="max-h-full w-full object-contain"
              />
            </button>
            <figcaption className="mt-3 flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium">{item.title}</h3>
                <p className="mt-1 text-xs text-fg-3">{item.note}</p>
              </div>
              <Chip tone={TONE[item.software]} className="shrink-0">
                {item.software}
              </Chip>
            </figcaption>
          </figure>
        ))}
      </div>
      <Dialog
        open={shown !== null}
        onOpenChange={(next) => !next && setOpen(null)}
      >
        {shown && (
          <DialogContent
            showCloseButton={false}
            // The box is exactly as wide as the image; header and caption line up with its edges.
            style={{
              ["--lightbox-ratio" as string]: shown.width / shown.height,
            }}
            className="w-max gap-3 p-4 [--dialog-w:calc(100vw-2rem)] [--lightbox-w:min(calc(100vw-4rem),calc((100vh-9rem)*var(--lightbox-ratio)),1400px)] max-sm:[--lightbox-w:calc((100dvh-9rem)*var(--lightbox-ratio))]"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault()
                step(event.key === "ArrowRight" ? 1 : -1)
              }
            }}
          >
            <div className="flex w-0 min-w-full items-center gap-3">
              <DialogTitle className="min-w-0 flex-1 truncate">
                {shown.title}
              </DialogTitle>
              <span className="shrink-0 text-xs text-fg-4 tabular-nums">
                {open! + 1} of {ORDERED.length}
              </span>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  tooltip={false}
                  aria-label="Close"
                  className="-mr-1 text-fg-3"
                >
                  <X />
                </Button>
              </DialogClose>
            </div>
            {/* Phones: the image takes the full height and pans sideways; larger screens fit it whole. */}
            <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-md">
              <img
                key={shown.src}
                src={shown.src}
                alt={shown.title}
                width={shown.width}
                height={shown.height}
                decoding="async"
                className="block h-auto max-w-none"
                style={{ width: "var(--lightbox-w)" }}
              />
            </div>
            <div className="flex w-0 min-w-full items-end gap-3">
              <DialogDescription className="min-w-0 flex-1 text-xs">
                {shown.note}
              </DialogDescription>
              <Chip tone={TONE[shown.software]} className="shrink-0">
                {shown.software}
              </Chip>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </SiteFrame>
  )
}
