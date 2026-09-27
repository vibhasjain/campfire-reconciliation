import { cn } from "@/lib/utils"

/** Pulsing placeholder block (2s pulse, fill-hover, radius 4). */
export function SkeletonBar({ className, width, height = 12 }: { className?: string; width?: number | string; height?: number }) {
  return <div className={cn("animate-pulse rounded-sm bg-fill-hover", className)} style={{ width, height }} />
}

const widths = [62, 48, 71, 55, 40, 66, 58, 45]

/** Generic list/table rows: 44px tall by default. */
export function SkeletonRows({ rows = 8, rowHeight = 44, className }: { rows?: number; rowHeight?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col", className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-[30px]" style={{ height: rowHeight }}>
          <SkeletonBar width={16} height={16} />
          <SkeletonBar width={`${widths[i % widths.length]}%`} />
        </div>
      ))}
    </div>
  )
}

/** Property rail rows (label col 128 + value). */
export function SkeletonRail({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-7 items-center gap-3">
          <SkeletonBar width={112} />
          <SkeletonBar width={`${30 + ((i * 17) % 40)}%`} />
        </div>
      ))}
    </div>
  )
}

/** Sidebar cold-load skeleton: icon square + bar per row, section label bars. */
export function SkeletonSidebar() {
  const section = (n: number, key: string) => (
    <div key={key} className="mt-4 flex flex-col gap-px">
      <div className="flex h-5 items-center pl-2.5">
        <SkeletonBar width={48} height={10} />
      </div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex h-8 items-center gap-2 px-2">
          <SkeletonBar width={18} height={18} />
          <SkeletonBar width={`${widths[(i + n) % widths.length]}%`} />
        </div>
      ))}
    </div>
  )
  return (
    <div className="flex flex-col px-2" aria-busy>
      {section(4, "top")}
      {section(3, "a")}
      {section(3, "b")}
      {section(3, "c")}
    </div>
  )
}
