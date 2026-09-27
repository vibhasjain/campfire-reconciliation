import { memo } from "react"
import { BadgeCheck, Banknote, BookOpen, ChartNoAxesCombined, ChevronDown, ChevronRight, ChevronsLeft, CircleHelp, House, ListChecks, Settings, WalletCards } from "lucide-react"
import { useIsDesktop } from "../hooks"
import { ui } from "../ui-store"
import { InertControl, SidebarFrame, SidebarRow } from "./parts"

function FlameMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 32" className="h-7 w-6 shrink-0 text-flame">
      <path fill="currentColor" d="M15.3 1.3c.8 6.2-5 7.8-4 13.2-2.6-.8-3.6-3-3.1-5.5C2.8 13.2.8 17.2 2.1 23c1.2 5.1 5.9 8.1 11.3 8.1 7.2 0 12.8-4.7 12.8-11.8 0-7.3-6.7-10.7-10.9-18Z" />
      <path style={{ fill: "color-mix(in srgb, var(--c-flame), var(--c-surface) 55%)" }} d="M14.5 13.8c1.2 4.1-3.8 6.3-3.4 9.7.2 1.6 1.4 2.9 3 2.9 2.4 0 4.5-1.9 4.5-4.8 0-3.1-2.2-5-4.1-7.8Z" />
    </svg>
  )
}

const chevron = <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-4" />

export const AppSidebar = memo(function AppSidebar() {
  const desktop = useIsDesktop()
  return (
    <SidebarFrame resizable={desktop}>
      <div className="flex h-[66px] shrink-0 items-center gap-2.5 px-5">
        <FlameMark />
        <span className="flex-1 text-xl font-semibold tracking-[-0.04em] text-fg">Campfire</span>
        <button type="button" aria-label={desktop ? "Collapse sidebar" : "Close sidebar"} onClick={() => ui.set(desktop ? { sidebarCollapsed: true } : { mobileSidebarOpen: false })} className="flex size-6 items-center justify-center rounded text-fg-4 outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus">
          <ChevronsLeft className="size-4" />
        </button>
      </div>
      <div className="shrink-0 px-3 pb-5">
        <InertControl className="flex h-9 w-full items-center gap-2 rounded-md border-hair border-line-input bg-surface px-2.5 text-left text-xs-medium text-fg-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-brand-tint text-[10px] font-semibold text-brand">A</span>
          <span className="min-w-0 flex-1 truncate">Arbor Analytics, Inc.</span>
          <ChevronDown className="size-3.5 shrink-0 text-fg-3" />
        </InertControl>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
        <div className="flex flex-col gap-1">
          <SidebarRow icon={<House />} label="Home" />
          <SidebarRow icon={<ChartNoAxesCombined />} label="Reporting" trailing={chevron} />
          <SidebarRow icon={<Banknote />} label="Revenue" trailing={chevron} />
          <SidebarRow icon={<BookOpen />} label="Accounting" trailing={chevron} />
          <SidebarRow icon={<WalletCards />} label="Cash Management" trailing={<ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-fg-4" />} className="font-medium" />
          <div className="ml-5 flex flex-col gap-1 border-l-hair border-line pl-2" aria-label="Cash Management">
            <SidebarRow label="Bank Accounts" />
            <SidebarRow label="Transactions" />
            <SidebarRow label="Reconciliations" active />
            <SidebarRow label="Bank Rules" />
          </div>
          <SidebarRow icon={<ListChecks />} label="Close Management" trailing={chevron} />
          <SidebarRow icon={<BadgeCheck />} label="Approvals" trailing={<span className="num rounded bg-fill-selected px-1.5 py-0.5 text-[10px] font-medium text-fg-3">104</span>} />
        </div>
        <div className="mt-auto flex flex-col gap-1 pt-10 pb-3">
          <SidebarRow icon={<Settings />} label="Settings" />
          <SidebarRow icon={<CircleHelp />} label="Help Center" />
        </div>
      </div>
      <div className="shrink-0 border-t-hair border-line px-3 py-3">
        <InertControl className="flex w-full items-center gap-2.5 rounded-md p-1 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs-medium text-brand">MP</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs-medium text-fg">Maya Patel</span>
            <span className="block truncate text-[10px] leading-4 text-fg-3">maya@arboranalytics.com</span>
          </span>
        </InertControl>
      </div>
    </SidebarFrame>
  )
})
