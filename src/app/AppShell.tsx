import { lazy, Suspense, type ReactNode } from "react"
import {
  Bell,
  House,
  ChevronRight,
  Menu,
  MessageSquare,
  Search,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/common/Toaster"
import { AppSidebar } from "./sidebar/AppSidebar"
import { InertControl } from "./sidebar/parts"
import { useSidebarWidth } from "./sidebar/width"
import { HalfSheetHost } from "./HalfSheetHost"
import { DialogHost } from "./DialogHost"
import { useHotkeys } from "./hotkeys"
import { useIsDesktop } from "./hooks"
import { ui, useUI } from "./ui-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toggleInbox, useUnreadCount } from "@/comments"
import { EmberIcon } from "@/components/common/EmberIcon"
import { reconUi, useReconUi } from "@/recon/useRecon"

const CommandPalette = lazy(() => import("@/features/shell/CommandPalette"))

function PageHeader({ showMenu }: { showMenu: boolean }) {
  const desktop = useIsDesktop()
  const unread = useUnreadCount()
  const pageChatOpen = useReconUi((state) => state.pageChatOpen)
  const inboxOpen = useReconUi((state) => state.inboxOpen)
  return (
    <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 border-b-hair border-line px-4 lg:px-6">
      {showMenu && (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() =>
            ui.set(
              desktop
                ? { sidebarCollapsed: false }
                : { mobileSidebarOpen: true }
            )
          }
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-3 outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Menu className="size-4" />
        </button>
      )}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1 text-xs text-fg-3"
      >
        <InertControl className="hidden shrink-0 rounded px-1 py-1.5 lg:block">
          <House aria-label="Home" className="size-3.5" />
        </InertControl>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-3 shrink-0 text-fg-4 lg:block"
        />
        <InertControl className="hidden shrink-0 rounded px-1 py-1.5 lg:block">
          Close Management
        </InertControl>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-3 shrink-0 text-fg-4 lg:block"
        />
        <InertControl className="hidden shrink-0 rounded px-1 py-1.5 md:block">
          Bank Reconcile
        </InertControl>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-3 shrink-0 text-fg-4 md:block"
        />
        <InertControl className="min-w-0 truncate rounded px-1 py-1.5">
          <span className="hidden sm:inline">1010 · Chase Operating ••4821</span><span className="sm:hidden">••4821</span>
        </InertControl>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-3 shrink-0 text-fg-4 sm:block"
        />
        <span className="sm:hidden">·</span>
        <span aria-current="page" className="shrink-0 px-1 text-fg">
          Sep 2026
        </span>
      </nav>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={`Comments${unread ? `, ${unread} unread` : ""}`}
          aria-expanded={inboxOpen}
          onClick={toggleInbox}
          className="relative"
        >
          <MessageSquare />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-brand px-1 text-[9px] text-primary-foreground tabular-nums">
              {unread}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          title="Ask Ember (⌘E)"
          aria-label="Ask Ember"
          aria-expanded={pageChatOpen}
          onClick={() =>
            reconUi.set((state) => ({
              ...state,
              pageChatOpen: !state.pageChatOpen,
            }))
          }
        >
          <EmberIcon className="size-4" />
          <span className="hidden sm:inline">Ask Ember</span>
        </Button>
        <InertControl
          aria-label="Notifications"
          className="relative flex size-8 items-center justify-center rounded-md text-fg-3"
        >
          <Bell className="size-[17px]" />
          <span className="absolute top-1.5 right-2 size-1 rounded-full bg-flame" />
        </InertControl>
        <button
          type="button"
          aria-label="Search commands (⌘K)"
          onClick={() => ui.set({ paletteOpen: true })}
          className="flex size-8 items-center justify-center rounded-md text-fg-3 outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Search className="size-[17px]" />
        </button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop()
  const collapsed = useUI((state) => state.sidebarCollapsed)
  const mobileOpen = useUI((state) => state.mobileSidebarOpen)
  const paletteOpen = useUI((state) => state.paletteOpen)
  const { width, dragging } = useSidebarWidth()
  useHotkeys()
  const columnWidth = desktop && !collapsed ? width : 0

  return (
    <TooltipProvider>
      <div
        data-sidebar-width-scope
        data-dragging={dragging || undefined}
        className={cn(
          "grid h-svh w-full grid-rows-[100%] overflow-hidden bg-page transition-[grid-template-columns] duration-200 ease-out data-dragging:transition-none",
          dragging && "cursor-col-resize select-none"
        )}
        style={{
          gridTemplateColumns: `${columnWidth}px minmax(0, 1fr)`,
          ["--sidebar-w" as string]: `${width}px`,
        }}
      >
        <div
          className={cn(
            "h-full min-w-0",
            columnWidth === 0 && "overflow-hidden"
          )}
          inert={columnWidth === 0 || undefined}
        >
          {desktop && <AppSidebar />}
        </div>
        <div className="flex h-full min-w-0 flex-col">
          <PageHeader showMenu={!desktop || collapsed} />
          <main tabIndex={-1} data-recon-focus className="relative flex min-h-0 min-w-0 flex-1">
            <div
              data-slot="workspace-content"
              className="@container/workspace-content relative min-h-0 min-w-0 flex-1 overflow-y-auto"
            >
              {children}
            </div>
            <HalfSheetHost />
          </main>
        </div>
      </div>
      {!desktop && (
        <Sheet
          open={mobileOpen}
          onOpenChange={(open) => ui.set({ mobileSidebarOpen: open })}
        >
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[250px] p-0"
          >
            <SheetTitle className="sr-only">Campfire navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Prototype navigation
            </SheetDescription>
            <AppSidebar />
          </SheetContent>
        </Sheet>
      )}
      <DialogHost />
      <Toaster />
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      )}
    </TooltipProvider>
  )
}
