// Generic half-sheet state, independent of the URL and browser history.
import { closeHalfSheet, openHalfSheet, useUI } from "./ui-store"
export type { HalfSheetTarget } from "./ui-store"
export { closeHalfSheet, openHalfSheet } from "./ui-store"

export function useHalfSheet() {
  return {
    target: useUI((state) => state.halfSheet),
    open: openHalfSheet,
    close: closeHalfSheet,
  }
}
