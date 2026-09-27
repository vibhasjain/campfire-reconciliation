import { useEffect, useState } from "react"
import { fmtDateTime, relTime } from "@/lib/format"

/** "2m ago", refreshed every 30s; hover title shows the full date. */
export function RelativeTime({ at, title, className }: { at: string | number | Date; title?: string; className?: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className={className} title={title ?? fmtDateTime(at)}>
      {relTime(at)}
    </span>
  )
}
