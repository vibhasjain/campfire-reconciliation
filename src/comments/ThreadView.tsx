import { lazy, Suspense } from "react"
import type { ThreadViewProps } from "./ThreadContent"

const ThreadContent = lazy(() =>
  import("./ThreadContent").then((module) => ({ default: module.ThreadView }))
)

export type { ThreadViewProps } from "./ThreadContent"

export function ThreadView(props: ThreadViewProps) {
  return (
    <Suspense fallback={<div className="min-h-40 flex-1" aria-busy="true" />}>
      <ThreadContent {...props} />
    </Suspense>
  )
}
