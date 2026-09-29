import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The dark favicon tag used for site navigation (canvases, logo hover, version control). */
export function CampfireTag({
  label,
  icon,
  size = "sm",
  className,
  ...props
}: ComponentProps<"span"> & { label: string; icon?: ReactNode; size?: "sm" | "lg" }) {
  return (
    <span
      {...props}
      className={cn(
        "flex items-center rounded-[7px] border border-[#484848] bg-[#292929] whitespace-nowrap text-[#ddd] select-none",
        size === "lg" ? "gap-2 py-1.5 pr-3 pl-2 text-sm [&_svg]:size-[18px]" : "gap-1.5 py-[5px] pr-[9px] pl-1.5 text-xs [&_svg]:size-4",
        className
      )}
    >
      {icon ?? <img src="/favicon.svg" width={size === "lg" ? 18 : 16} height={size === "lg" ? 18 : 16} alt="" />}
      {label}
    </span>
  )
}
