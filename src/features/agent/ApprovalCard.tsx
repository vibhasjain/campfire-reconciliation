// Generic approval card: individual and bulk decisions are returned to the script.
import { useState } from "react"
import { Check, ShieldCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDB } from "@/data/store"
import type { Approval } from "@/data/types"
import { isAwaitingApproval, resolveApproval } from "@/agent/engine"
import { Arc } from "@/components/composer/Arc"
import { cn } from "@/lib/utils"

type Row = Approval["rows"][number]

export function ApprovalCard({ approvalId }: { approvalId: string }) {
  const [expanded, setExpanded] = useState(false)
  const approval = useDB((state) => state.approvals[approvalId])
  if (!approval) return null
  const pending = approval.rows.filter((row) => row.state === "pending").length
  const approving = approval.rows.some((row) => row.state === "approving")
  const awaiting = isAwaitingApproval(approval.id)
  const open = (pending > 0 || approving) && awaiting
  return (
    <div className="flex flex-col rounded-lg border-hair border-line bg-surface shadow-button-lg">
      <div className="flex min-h-11 items-center gap-2 px-4 text-sm font-medium text-fg">
        <ShieldCheck className="size-4 text-ai-ink" />
        <span className="break-words">{approval.title}</span>
      </div>
      <div className={cn("flex flex-col px-2", !open && "pb-2")}>
        {(expanded ? approval.rows : approval.rows.slice(0, 6)).map((row) => (
          <div
            key={row.id}
            className="flex min-h-9 items-center gap-3 rounded-md px-2 py-1"
          >
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-medium break-words text-fg",
                  row.state === "dismissed" && "text-fg-hint line-through"
                )}
              >
                {row.label}
              </span>
              {row.detail && (
                <span className="block text-xs text-fg-3">{row.detail}</span>
              )}
            </span>
            <Actions approval={approval} row={row} />
          </div>
        ))}
      </div>
      {!expanded && approval.rows.length > 6 && (
        <button
          type="button"
          className="px-4 py-2 text-left text-xs text-fg-3"
          onClick={() => setExpanded(true)}
        >
          and {approval.rows.length - 6} more
        </button>
      )}
      {pending > 0 && !awaiting && (
        <div className="px-4 pb-3 text-xs text-fg-4">
          This request is no longer active.
        </div>
      )}
      {open && (
        <div className="flex h-12 items-center justify-end gap-1 px-3">
          <Button
            variant="ghost"
            className="text-fg-4"
            disabled={approving}
            onClick={() => resolveApproval(approval.id, "all", "dismiss")}
          >
            {pending > 1 ? "Dismiss all" : "Dismiss"}
          </Button>
          <Button
            className="bg-ai text-ai-ink hover:bg-ai"
            disabled={approving || !pending}
            onClick={() => resolveApproval(approval.id, "all", "approve")}
          >
            Approve {pending > 1 ? `all ${pending}` : ""}
          </Button>
        </div>
      )}
    </div>
  )
}

function Actions({ approval, row }: { approval: Approval; row: Row }) {
  if (row.state === "approved")
    return (
      <Check
        aria-label="Approved"
        className="size-3.5 animate-in text-ai-ink duration-150 fade-in-0"
      />
    )
  if (row.state === "dismissed" || !isAwaitingApproval(approval.id)) return null
  const busy = row.state === "approving"
  return (
    <span className="flex items-center gap-1">
      <Button
        size="icon-sm"
        aria-label={`Dismiss ${row.label}`}
        className={cn(
          "h-6 w-7 transition-opacity duration-150",
          busy && "opacity-0"
        )}
        disabled={busy}
        onClick={() => resolveApproval(approval.id, row.id, "dismiss")}
      >
        <X className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        aria-label={`Approve ${row.label}`}
        className="h-6 w-7 bg-ai text-ai-ink hover:bg-ai"
        disabled={busy}
        onClick={() => resolveApproval(approval.id, row.id, "approve")}
      >
        {busy ? <Arc size={12} /> : <Check className="size-3.5" />}
      </Button>
    </span>
  )
}
