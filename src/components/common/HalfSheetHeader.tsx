import type { ReactNode } from "react"
import { ArrowUpRight, Link2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "./toast"

/** 44px header; shares the body gutter token owned by the sheet containers. */
export function HalfSheetHeader({
  left,
  right,
  onClose,
  expandHref,
  copyHref,
}: {
  left: ReactNode
  right?: ReactNode
  onClose: () => void
  expandHref?: string
  copyHref?: string
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-5 px-sheet-gutter py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1">{left}</div>
      <div className="flex shrink-0 items-center gap-0.5">
        {right}
        {(copyHref ?? expandHref) && (
          <Button variant="ghost" size="icon" aria-label="Copy link" className="text-fg-3"
            onClick={() => {
              const href = new URL((copyHref ?? expandHref)!, window.location.href).href
              void navigator.clipboard.writeText(href).then(() => toast("Link copied"), () => toast("Couldn't copy link", { tone: "error" }))
            }}>
            <Link2 />
          </Button>
        )}
        {expandHref && (
          <Button asChild variant="ghost" size="icon" title="Expand half sheet" className="text-fg-3">
            <a href={expandHref}>
              <ArrowUpRight />
            </a>
          </Button>
        )}
        <Button variant="ghost" size="icon" title="Close half sheet" onClick={onClose} className="text-fg-3">
          <X />
        </Button>
      </div>
    </div>
  )
}
