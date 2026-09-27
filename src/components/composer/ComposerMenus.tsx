import { useState } from "react"
import { History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { shallowEqual, useDB } from "@/data/store"
import { relTime } from "@/lib/format"

/** In-memory conversation history. The host decides how to display a selected chat. */
export function HistoryMenu({ onSelect }: { onSelect: (chatId: string) => void }) {
  const [open, setOpen] = useState(false)
  const chats = useDB((d) => Object.values(d.chats).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), shallowEqual)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-7 text-fg-3 hover:text-fg-2" aria-label="Chat history">
          <History />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[300px] overflow-hidden p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Command loop filter={(_, search, keywords) => (keywords?.join(" ").toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <div className="border-b-hair border-line-subtle p-1">
            <CommandPrimitive.Input autoFocus placeholder="Search chats" className="h-7 w-full rounded-md border-hair border-line-input bg-transparent px-2 text-sm text-fg outline-none placeholder:text-fg-hint" />
          </div>
          <CommandList className="max-h-[320px] p-1">
            <CommandEmpty className="px-2 py-1.5 text-sm text-fg-4">No conversations yet.</CommandEmpty>
            {chats.map((chat) => (
              <CommandItem key={chat.id} value={chat.id} keywords={[chat.title]} onSelect={() => { setOpen(false); onSelect(chat.id) }}>
                <span className="min-w-0 flex-1 truncate">{chat.title}</span>
                <span className="shrink-0 text-xxs text-fg-hint">{relTime(chat.updatedAt)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
