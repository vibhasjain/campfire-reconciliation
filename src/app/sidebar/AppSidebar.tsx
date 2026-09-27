import { memo } from "react"
import {
  Banknote,
  Briefcase,
  ChartColumn,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  CircleHelp,
  Flame,
  House,
  ListChecks,
  Presentation,
  Settings,
  Stamp,
} from "lucide-react"
import { useIsDesktop } from "../hooks"
import { ui } from "../ui-store"
import { InertControl, SidebarFrame, SidebarRow } from "./parts"

const chevron = (
  <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-4" />
)

// Mirrors Campfire's live nav (captured 2026-09-27); only Bank Reconcile is live.
export const AppSidebar = memo(function AppSidebar() {
  const desktop = useIsDesktop()
  return (
    <SidebarFrame resizable={desktop}>
      <div className="flex h-[66px] shrink-0 items-center gap-2.5 px-5">
        <img
          src="/campfire-logo.png"
          alt="Campfire"
          width={128}
          height={26}
          className="h-[26px] w-auto"
        />
        <span className="flex-1" />
        <button
          type="button"
          aria-label={desktop ? "Collapse sidebar" : "Close sidebar"}
          onClick={() =>
            ui.set(
              desktop
                ? { sidebarCollapsed: true }
                : { mobileSidebarOpen: false }
            )
          }
          className="flex size-6 items-center justify-center rounded text-fg-4 outline-none hover:bg-fill-hover focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronsLeft className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-2">
        <div className="flex flex-col gap-1">
          <SidebarRow icon={<House />} label="Home" />
          <SidebarRow
            icon={<Briefcase />}
            label="Reporting"
            trailing={chevron}
          />
          <SidebarRow
            icon={<Presentation />}
            label="Revenue"
            trailing={chevron}
          />
          <SidebarRow
            icon={<ChartColumn />}
            label="Accounting"
            trailing={chevron}
          />
          <SidebarRow
            icon={<Banknote />}
            label="Cash Management"
            trailing={chevron}
          />
          <SidebarRow
            icon={<ListChecks />}
            label="Close Management"
            trailing={
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 shrink-0 text-fg-4"
              />
            }
            className="font-medium"
          />
          <div
            className="ml-5 flex flex-col gap-1 border-l-hair border-line pl-2"
            aria-label="Close Management"
          >
            <SidebarRow label="Checklist" />
            <SidebarRow label="Bank Reconcile" active />
            <SidebarRow label="Account Reconcile" />
            <SidebarRow label="Flux Analysis" />
            <SidebarRow label="Accruals" />
          </div>
          <SidebarRow icon={<Stamp />} label="Approvals" />
          <SidebarRow icon={<Flame />} label="Ember AI" trailing={chevron} />
        </div>
        <div className="mt-auto flex flex-col gap-1 pt-10 pb-3">
          <SidebarRow icon={<Settings />} label="Settings" />
          <SidebarRow icon={<CircleHelp />} label="Help Center" />
        </div>
      </div>
      <div className="shrink-0 border-t-hair border-line px-3 py-3">
        <InertControl className="flex w-full flex-col rounded-md px-2 py-1 text-left text-[12px] leading-4 text-fg-3">
          <span className="truncate font-semibold text-fg-2">
            Arbor Analytics, Inc.
          </span>
          <span className="truncate">Maya Patel</span>
          <span className="truncate">maya@arboranalytics.com</span>
        </InertControl>
      </div>
    </SidebarFrame>
  )
})
