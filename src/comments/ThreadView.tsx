import { useEffect, useState } from "react"
import type { ThreadViewProps } from "./ThreadContent"

export type { ThreadViewProps } from "./ThreadContent"

// The thread (and its Tiptap editor) stays out of the first-load bundle, but it is warmed as soon as
// the page is idle and then rendered synchronously. Suspense would add React's ~300ms reveal throttle
// even from cache, and keys typed right after pressing C would leak to page shortcuts.
type ThreadModule = typeof import("./ThreadContent")
let loaded: ThreadModule | undefined
let loading: Promise<ThreadModule> | undefined
const load = () =>
  (loading ??= import("./ThreadContent").then((module) => (loaded = module)))

if (typeof window !== "undefined") {
  const idle =
    window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200))
  idle(() => void load())
}

export function ThreadView(props: ThreadViewProps) {
  const [module, setModule] = useState(loaded)
  useEffect(() => {
    if (!module) void load().then(setModule)
  }, [module])
  if (module) return <module.ThreadView {...props} />
  // Editable placeholder: in the rare pre-load window, keystrokes land here instead of firing shortcuts.
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      aria-busy="true"
      className="min-h-40 flex-1 outline-none"
    />
  )
}
