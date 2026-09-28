import { restorePageFocus } from "@/recon/focus"
import { useCallback, useState } from "react"
import {
  Building2,
  FileClock,
  FileText,
  Landmark,
  Radio,
  ReceiptText,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type { Attachment } from "./data"
import { Money } from "./Money"
import { fmtDate } from "./store"
import { useRecon } from "./useRecon"

const documentKinds = {
  invoice: { label: "Invoice", icon: FileText },
  receipt: { label: "Receipt", icon: ReceiptText },
  remittance: { label: "Payment remittance", icon: ReceiptText },
  check: { label: "Check copy", icon: FileText },
  audit: { label: "Audit record", icon: FileClock },
  feed: { label: "Bank feed record", icon: Radio },
  bank_detail: { label: "Bank advice", icon: Landmark },
}

/** An HTML document, shared by anchored evidence previews and phone dialogs. */
export function DocumentPreview({ attachment }: { attachment: Attachment }) {
  const { label, icon: Icon } = documentKinds[attachment.kind]
  const isBankDocument =
    attachment.kind === "bank_detail" || attachment.kind === "feed"
  return (
    <article
      data-attachment-id={attachment.id}
      className="overflow-hidden rounded-lg border-hair border-line bg-surface text-xs"
    >
      <header
        className={cn(
          "border-b-hair border-line p-4",
          isBankDocument ? "bg-brand-tint" : "bg-fill-subtle"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3 text-fg-3">
          <span className="flex items-center gap-1.5">
            <Icon className="size-4" />
            {label}
          </span>
          {attachment.number && (
            <span className="font-mono tabular-nums">
              {attachment.kind === "check" ? "#" : ""}
              {attachment.number}
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-fg">{attachment.from}</div>
        <div className="mt-1 text-fg-3">{attachment.title}</div>
        <div className="mt-3 text-fg-3">{fmtDate(attachment.date, "long")}</div>
      </header>
      <div className="p-4">
        {attachment.kind === "check" && (
          <div className="mb-3 flex items-center gap-1.5 text-fg-3">
            <Building2 className="size-4" />
            Chase Operating
          </div>
        )}
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{attachment.title} line items</caption>
          <thead>
            <tr className="border-b-hair border-line text-fg-3">
              <th scope="col" className="pb-2 text-left font-normal">
                {attachment.kind === "audit" ? "Activity" : "Description"}
              </th>
              <th scope="col" className="w-28 pb-2 text-right font-normal">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {attachment.lines.map((line, index) => (
              <tr
                key={index}
                className={cn(
                  "border-b-hair border-line-subtle last:border-0",
                  attachment.kind === "audit" && "align-top"
                )}
              >
                <td className="py-2.5 pr-3 leading-5 text-fg-2">
                  {line.label}
                </td>
                <td className="py-2.5 text-right align-top">
                  {line.amount === undefined ? (
                    <span className="text-fg-hint">—</span>
                  ) : (
                    <Money cents={line.amount} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {attachment.total !== undefined && (
            <tfoot>
              <tr className="border-t-hair border-line">
                <th scope="row" className="pt-3 text-left font-medium">
                  {attachment.kind === "bank_detail" ? "Net amount" : "Total"}
                </th>
                <td className="pt-3 text-right font-medium">
                  <Money cents={attachment.total} />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {attachment.note && (
          <div
            className={cn(
              "mt-4 border-t-hair border-line-subtle pt-3 leading-5 text-fg-3",
              attachment.kind === "audit" &&
                "border-l-2 border-l-line-strong pl-3"
            )}
          >
            {attachment.note}
          </div>
        )}
        {attachment.kind === "check" && (
          <div className="mt-4 border-t border-dashed border-line pt-3 font-mono tracking-widest text-fg-4">
            {attachment.number} · CHASE OPERATING
          </div>
        )}
      </div>
    </article>
  )
}

/** Evidence stays beside its row on desktop and gets a readable dialog on phones. */
export function EvidenceChip({ attachmentId }: { attachmentId: string }) {
  const attachment = useRecon((state) => state.attachments[attachmentId])
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const evidenceRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const close = () => setOpen(false)
    node.addEventListener("recon-close", close)
    return () => node.removeEventListener("recon-close", close)
  }, [])
  if (!attachment) return null
  const Icon = documentKinds[attachment.kind].icon
  const shortTitle = attachment.number ?? attachment.title
  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className="max-w-full gap-1.5 font-normal text-fg-3 shadow-none"
      aria-label={`View ${attachment.title}`}
      onClick={(event) => event.stopPropagation()}
    >
      <Icon className="size-4" />
      <span className="max-w-48 truncate">{shortTitle}</span>
    </Button>
  )
  if (isMobile)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent onCloseAutoFocus={restorePageFocus} data-recon-evidence ref={evidenceRef}
          className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden bg-page"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{documentKinds[attachment.kind].label}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-3 pt-0">
            <DocumentPreview attachment={attachment} />
          </div>
        </DialogContent>
      </Dialog>
    )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent onCloseAutoFocus={restorePageFocus} data-recon-evidence ref={evidenceRef}
        align="start"
        sideOffset={6}
        className="max-h-[min(600px,var(--radix-popover-content-available-height))] w-[420px] max-w-[calc(100vw-2rem)] overflow-y-auto bg-page p-2"
        aria-label={attachment.title}
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <span className="text-xs text-fg-3">Source document</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close document"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <DocumentPreview attachment={attachment} />
      </PopoverContent>
    </Popover>
  )
}
