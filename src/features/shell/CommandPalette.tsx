import { restorePageFocus } from "@/recon/focus"
import { resetDemo } from "@/data/persistence"
// Working command search with inert prototype destinations.
import { useState } from "react"
import { BookOpen, CircleHelp, Landmark, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { InertControl, PROTOTYPE_TOOLTIP } from "@/app/sidebar/parts"
import { ui, useUI } from "@/app/ui-store"

const COMMANDS = [
  { label: "Current reconciliation", detail: "Chase Operating ••4821 · Sep 2026", icon: Landmark },
  { label: "Reconciliation guide", detail: "Demo command", icon: BookOpen },
  { label: "Help Center", detail: "Demo command", icon: CircleHelp },
]

export default function CommandPalette() {
  const open = useUI((state) => state.paletteOpen)
  const [query, setQuery] = useState("")
  const commands = COMMANDS.filter((command) => `${command.label} ${command.detail}`.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <Dialog open={open} onOpenChange={(next) => ui.set({ paletteOpen: next })}>
      <DialogContent onCloseAutoFocus={restorePageFocus} showCloseButton={false} placement="top" className="top-[15vh] max-w-[min(640px,calc(100%-2rem))]! gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">{PROTOTYPE_TOOLTIP}</DialogDescription>
        <div className="flex items-center gap-2 border-b-hair border-line px-4 py-3">
          <Search className="size-4 shrink-0 text-fg-4" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands…" aria-label="Search commands" className="h-8 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-hint" />
          <kbd className="rounded border-hair border-line px-1.5 py-0.5 text-[10px] text-fg-4">esc</kbd>
        </div>
        <div className="p-2">
          <div className="px-2 py-2 text-xs text-fg-4">Commands</div>
          {(!query || "reset demo".includes(query.toLowerCase())) && <button type="button" className="flex w-full rounded-md px-3 py-3 text-left text-sm hover:bg-fill-subtle" onClick={resetDemo}>Reset demo</button>}
          {commands.length === 0 && <p className="px-2 py-7 text-center text-sm text-fg-3">No commands found.</p>}
          {commands.map(({ label, detail, icon: Icon }) => <InertControl key={label} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-fill-subtle">
            <Icon className="size-4 shrink-0 text-fg-3" />
            <span><span className="block text-sm text-fg">{label}</span><span className="block text-xs text-fg-4">{detail}</span></span>
          </InertControl>)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
