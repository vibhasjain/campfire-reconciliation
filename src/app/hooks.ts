import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { LAYOUT } from "./layout"

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => window.matchMedia(query).matches
  )
}

/** ≥1024px: docked sidebar. Below: sidebar lives in a Sheet. */
export const useIsDesktop = () => useMediaQuery(`(min-width: ${LAYOUT.desktopMin}px)`)

/** localStorage get/set that never throws. */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* private mode / quota */
    }
  },
}

/** `first` in the mount (navigation) frame, `then` in a transition right after it paints. */
export function useAfterPaint<T>(first: T, then: T): T {
  const [v, setV] = useState(first)
  useEffect(() => {
    const raf = requestAnimationFrame(() => startTransition(() => setV(then)))
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount only
  return v
}

/** A stable function that always calls the latest `fn`: event handlers for memoized rows that must not re-render
 *  every row when the list data (or selection) changes. */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}
