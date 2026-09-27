import { Dialog } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { closeDialog, useUI, type DialogRequest } from "./ui-store"

export type DialogBodyProps<R extends DialogRequest = DialogRequest> = { request: R; close: () => void }

/** One generic dialog at a time; callers own custom dialog content. */
export function DialogHost() {
  const dialog = useUI((state) => state.dialog)
  if (!dialog) return null
  return (
    <Dialog open onOpenChange={(open) => !open && closeDialog()}>
      {dialog.kind === "confirm" ? <ConfirmDialog {...dialog.props} close={closeDialog} /> : dialog.render()}
    </Dialog>
  )
}
