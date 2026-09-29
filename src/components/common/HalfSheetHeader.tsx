import type { ReactNode } from "react"
import { ArrowUpRight, Link2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "./toast"

/** 44px sticky header; horizontal padding belongs to the shared scroll container. */
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
    <div className="sticky top-0 z-10 flex shrink-0 items-center gap-5 bg-surface pt-4 pb-1">
      <div className="flex min-w-0 flex-1 items-center gap-1 [&>*]:min-w-0 [&>*]:truncate">{left}</div>
      <div className="flex shrink-0 items-center gap-0.5">
        {right}
        {(copyHref ?? expandHref) && (
          <Button variant="ghost" size="icon-sheet" aria-label="Copy link" className="text-fg-3"
            onClick={() => {
              const href = new URL((copyHref ?? expandHref)!, window.location.href).href
              void navigator.clipboard.writeText(href).then(() => toast("Link copied"), () => toast("Couldn't copy link", { tone: "error" }))
            }}>
            <Link2 />
          </Button>
        )}
        {expandHref && (
          <Button asChild variant="ghost" size="icon-sheet" tooltip="Open full page" className="text-fg-3">
            <a href={expandHref}>
              <ArrowUpRight />
            </a>
          </Button>
        )}
        <Button variant="ghost" size="icon-sheet" edge="end" tooltip="Close" shortcut="Esc" onClick={onClose} className="text-fg-3">
          <X />
        </Button>
      </div>
    </div>
  )
}
