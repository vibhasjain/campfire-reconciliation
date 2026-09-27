import { X } from "lucide-react"
import { EmberIcon } from "@/components/common/EmberIcon"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/app/hooks"
import { ThreadView } from "@/comments"
import { reconUi, useReconUi } from "./useRecon"

export function PageChat() {
  const open = useReconUi((state) => state.pageChatOpen)
  const desktop = useMediaQuery("(min-width: 640px)")
  const close = () =>
    reconUi.set((state) => ({ ...state, pageChatOpen: false }))
  const header = (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b-hair border-line px-3">
      <EmberIcon className="size-5" />
      <h2 id="page-ember-title" className="flex-1 text-sm font-medium">
        Ember
      </h2>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Close Ember chat"
        onClick={close}
      >
        <X />
      </Button>
    </header>
  )
  if (!desktop)
    return (
      <Sheet
        open={open}
        onOpenChange={(pageChatOpen) =>
          reconUi.set((state) => ({ ...state, pageChatOpen }))
        }
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[min(620px,88dvh)]! rounded-t-[12px] bg-surface"
        >
          <SheetTitle className="sr-only">Ember</SheetTitle>
          <SheetDescription className="sr-only">
            Reconciliation assistant
          </SheetDescription>
          {header}
          <ThreadView chatId="page" variant="sheet" />
        </SheetContent>
      </Sheet>
    )
  if (!open) return null
  return createPortal(
    <aside
      role="region"
      aria-labelledby="page-ember-title"
      data-recon-layer="page"
      className="fixed right-5 bottom-5 z-40 flex h-[min(540px,calc(100dvh-88px))] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[12px] border-hair border-line bg-surface shadow-menu"
    >
      {header}
      <ThreadView chatId="page" variant="docked" />
    </aside>,
    document.body
  )
}
