import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DialogClose } from "@/components/ui/dialog"
import { FormDialog } from "./FormDialog"

export type ConfirmDialogProps = {
  title: ReactNode
  icon?: ReactNode
  body: ReactNode
  checkboxes?: { id: string; label: string; default: boolean }[]
  confirmLabel: string
  tone: "danger" | "brand"
  onConfirm: (checks: Record<string, boolean>) => void
}

/** Opened via `openDialog({ kind: 'confirm', props })`; DialogHost supplies `close`. */
export function ConfirmDialog({ close, ...p }: ConfirmDialogProps & { close: () => void }) {
  const [checks, setChecks] = useState(() => Object.fromEntries((p.checkboxes ?? []).map((c) => [c.id, c.default])))
  return (
    <FormDialog
      title={p.title}
      icon={p.icon}
      onSubmit={() => {
        p.onConfirm(checks)
        close()
      }}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" autoFocus variant={p.tone === "danger" ? "destructive" : "brand"}>
            {p.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-fg-3">{p.body}</div>
      {p.checkboxes?.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm text-fg-2">
          <Checkbox checked={checks[c.id]} onCheckedChange={(v) => setChecks((s) => ({ ...s, [c.id]: v === true }))} />
          {c.label}
        </label>
      ))}
    </FormDialog>
  )
}

export default ConfirmDialog
