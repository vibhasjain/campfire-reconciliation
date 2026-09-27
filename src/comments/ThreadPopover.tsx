import { useEffect, useRef, type ReactElement } from "react"
import { Check, RotateCcw, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/app/hooks"
import { reconUi, useItem, useReconUi } from "@/recon/useRecon"
import { cardMotion } from "./card-motion"
import {
  ensureThread,
  setThreadResolved,
  threadChatId,
  useComments,
} from "./store"
import { ThreadView } from "./ThreadView"

export type ThreadPopoverProps = { itemId: string; children: ReactElement }
export function ThreadPopover({ itemId, children }: ThreadPopoverProps) {
  const open = useReconUi((state) => state.threadFor === itemId)
  const phone = useMediaQuery("(max-width: 639px)")
  const item = useItem(itemId)
  const motionNode = useRef<HTMLDivElement>(null)
  const setOpen = (next: boolean) => {
    if (next) ensureThread(itemId)
    const commit = () =>
      reconUi.set((state) => ({
        ...state,
        threadFor: next
          ? itemId
          : state.threadFor === itemId
            ? null
            : state.threadFor,
        selectedItemId: next ? itemId : state.selectedItemId,
      }))
    if (!next && motionNode.current)
      cardMotion(motionNode.current, false, commit)
    else commit()
  }
  if (phone)
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="h-[min(80dvh,620px)]! rounded-t-[12px] border-hair border-line bg-surface p-0"
        >
          <SheetTitle className="sr-only">
            {item?.title ?? "Comments"}
          </SheetTitle>
          <ThreadCard
            itemId={itemId}
            title={item?.title ?? "Comments"}
            onClose={() => setOpen(false)}
            variant="sheet"
            motionRef={motionNode}
          />
        </SheetContent>
      </Sheet>
    )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[400px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[12px] border-hair border-line bg-surface p-0 shadow-menu data-open:animate-none data-closed:animate-none"
      >
        <ThreadCard
          itemId={itemId}
          title={item?.title ?? "Comments"}
          onClose={() => setOpen(false)}
          variant="popover"
          motionRef={motionNode}
        />
      </PopoverContent>
    </Popover>
  )
}

function ThreadCard({
  itemId,
  title,
  onClose,
  variant,
  motionRef,
}: {
  itemId: string
  title: string
  onClose: () => void
  variant: "popover" | "sheet"
  motionRef: React.RefObject<HTMLDivElement | null>
}) {
  const resolved = useComments(
    (state) => state.threads[threadChatId(itemId)]?.resolved ?? false
  )
  useEffect(
    () => (motionRef.current ? cardMotion(motionRef.current) : undefined),
    [motionRef]
  )
  return (
    <div
      ref={motionRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-layer="thread"
    >
      <div className="flex min-h-11 items-center gap-2 border-b-hair border-line px-3">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          title={resolved ? "Reopen thread" : "Resolve thread"}
          aria-label={resolved ? "Reopen thread" : "Resolve thread"}
          onClick={() => setThreadResolved(itemId, !resolved)}
        >
          {resolved ? (
            <RotateCcw className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Close thread"
          aria-label="Close thread"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      {resolved && (
        <div className="flex items-center gap-1.5 border-b-hair border-line bg-brand-tint px-4 py-2 text-xs text-brand">
          <Check className="size-4" /> Resolved
        </div>
      )}
      <ThreadView itemId={itemId} variant={variant} />
    </div>
  )
}
