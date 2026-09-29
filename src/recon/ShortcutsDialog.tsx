import { restorePageFocus } from "@/recon/focus"
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

export function ShortcutsDialog({ workbench = false }: { workbench?: boolean }) {
  const groups = [
    ["Navigate", [
      ["↑ / K · ↓ / J", "Previous / next item"],
      ...(workbench ? [["1 / 2", "Pending / Reconciled"]] : []),
      ["Enter", "Open item"],
      ["Esc", "Close topmost layer"],
      ...(workbench ? [["[", "Toggle sidebar"]] : []),
    ]],
    ["Review", [
      ["← / →", "Cycle suggestions"],
      ["O", "Open attachments"],
      ["A", "Accept"],
      ["X", "Reject"],
      ["U", "Undo"],
      ["M", "Match lines"],
      ["⌘ / Ctrl / ⇧ + click", "Select lines"],
    ]],
    ["Talk", [
      ["C", "Comment"],
      ...(workbench ? [["E", "Mention Ember on item"]] : []),
      ["⌘E / Ctrl+E", "Ask Ember"],
    ]],
    ["View", [
      ...(workbench ? [["D", "Difference breakdown"], ["Space / ⇧Space", "Scroll sheet"], ["PageDown / PageUp", "Scroll sheet"]] : []),
      ["?", "Show shortcuts"],
    ]],
  ] as const
  const open = useReconUi((state) => state.shortcutsOpen)
  return (
    <Dialog
      open={open}
      onOpenChange={(shortcutsOpen) =>
        reconUi.set((state) => ({ ...state, shortcutsOpen }))
      }
    >
      <DialogContent onCloseAutoFocus={restorePageFocus} className="sm:max-w-[420px]">
        <DialogHeader>
          <Keyboard />
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Reconciliation shortcuts. Shortcuts are paused while typing.
        </DialogDescription>
        <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
          {groups.map(([group, shortcuts]) => (
            <section key={group}>
              <h3 className="mb-2 text-xs font-medium">{group}</h3>
              <dl className="flex flex-col gap-2">
                {shortcuts.map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-4 text-xs">
                    <dt className="text-fg-3">{label}</dt>
                    <dd><Kbd>{key}</Kbd></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
