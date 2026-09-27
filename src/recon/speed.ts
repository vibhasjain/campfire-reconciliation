/** One timing switch for scripts, approvals, animation and teammate replies. */
let override: boolean | undefined
export function setFastMode(fast: boolean | undefined) {
  override = fast
}
export function isFastMode(): boolean {
  return (
    override ??
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("fast"))
  )
}
export function delayMs(ms: number): number {
  return isFastMode() ? Math.min(120, Math.max(0, ms) / 20) : ms
}
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs(ms)))
}
