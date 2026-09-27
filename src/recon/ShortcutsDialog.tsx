import { Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { reconUi, useReconUi } from "./useRecon"

const shortcuts = [
  ["↑ / K", "Previous item"],
  ["↓ / J", "Next item"],
  ["← / →", "Cycle suggestions"],
  ["Enter", "Open selected item"],
  ["A", "Accept suggestion"],
  ["X", "Reject suggestion"],
  ["U", "Unreconcile item"],
  ["M", "Match selected lines"],
  ["C", "Comment on item"],
  ["⌘E / Ctrl+E", "Ask Ember"],
  ["?", "Show shortcuts"],
  ["Esc", "Close topmost layer"],
  ["⌘ / Ctrl / ⇧ + click", "Select multiple lines"],
]

export function ShortcutsDialog() {
  const open = useReconUi((state) => state.shortcutsOpen)
  return (
    <Dialog
      open={open}
      onOpenChange={(shortcutsOpen) =>
        reconUi.set((state) => ({ ...state, shortcutsOpen }))
      }
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <Keyboard />
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Reconciliation shortcuts. Shortcuts are paused while typing.
        </DialogDescription>
        <dl className="flex flex-col gap-2 px-4 pt-1 pb-4">
          {shortcuts.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <dt className="text-fg-3">{label}</dt>
              <dd>
                <Kbd>{key}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
