import { ActionTooltip } from "@/components/ui/tooltip"
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
        {/* The one live control in the inert shell: home to version control.
            Hover pops the logo slightly and surfaces the same "Version control" tag the canvases use. */}
        <a
          href="/version-control"
          className="group/home relative rounded outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <img
            src="/campfire-logo.svg"
            alt="Campfire · back to version control"
            width={128}
            height={26}
            className="h-[26px] w-auto transition-transform duration-150 ease-out group-hover/home:scale-[1.03] group-focus-visible/home:scale-[1.03] motion-reduce:transition-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-full left-0 z-20 mt-1.5 flex translate-y-[-2px] items-center gap-1.5 rounded-[7px] border border-[#484848] bg-[#292929] py-[5px] pr-[9px] pl-1.5 text-xs whitespace-nowrap text-[#ddd] opacity-0 transition duration-150 ease-out group-hover/home:translate-y-0 group-hover/home:opacity-100 group-focus-visible/home:translate-y-0 group-focus-visible/home:opacity-100 motion-reduce:transition-none"
          >
            <img src="/favicon.svg" width={16} height={16} alt="" />
            Version control
          </span>
        </a>
        <span className="flex-1" />
        <ActionTooltip label={desktop ? "Collapse sidebar" : "Close sidebar"}>
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
        </ActionTooltip>
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
