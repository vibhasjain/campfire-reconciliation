import { Chip } from "@/components/common/Chip"
import { useState } from "react"
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
  const step = (delta: number) =>
    setOpen((current) =>
      current === null
        ? null
        : (current + delta + ORDERED.length) % ORDERED.length
    )
  return (
    <SiteFrame
      title="What I looked at"
      toolbar={<SiteNav current="References" />}
    >
      {/* One grid; each reference carries its company as a tag, so no section dividers. */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[700px]:grid-cols-2">
        {ORDERED.map((item, index) => (
          <figure key={item.src} className="min-w-0">
            <button
              onClick={() => setOpen(index)}
              aria-label={`Enlarge ${item.title}`}
              className="flex aspect-[16/10] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border-hair border-line bg-surface p-2 outline-none hover:border-line-strong"
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
            className="w-max gap-3 p-4 [--dialog-w:calc(100vw-2rem)]"
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
            <img
              key={shown.src}
              src={shown.src}
              alt={shown.title}
              width={shown.width}
              height={shown.height}
              decoding="async"
              className="block h-auto rounded-md"
              // As large as the screen allows (width or height), keeping the image's proportions.
              style={{
                width: `min(calc(100vw - 4rem), calc((100vh - 9rem) * ${shown.width / shown.height}), 1400px)`,
              }}
            />
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
