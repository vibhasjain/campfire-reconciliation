import { useSyncExternalStore } from "react"
import { createStore } from "@/data/store"
import { LAYOUT, STORAGE } from "../layout"
import { storage } from "../hooks"

// Sidebar width preference; all prototype content state stays in memory.
const { min, max } = LAYOUT.sidebar
const clampW = (w: number) => Math.min(max, Math.max(min, Math.round(w)))
export const widthStore = createStore({ width: clampW(Number(storage.get(STORAGE.sidebarWidth)) || LAYOUT.sidebar.default), dragging: false })
export const useSidebarWidth = () => useSyncExternalStore(widthStore.subscribe, widthStore.get)
export function setWidth(w: number) {
  const width = clampW(w)
  widthStore.set((s) => (s.width === width ? s : { ...s, width }))
  storage.set(STORAGE.sidebarWidth, String(width))
}

