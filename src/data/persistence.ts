/** One atomic snapshot per demo path; fast fixtures never touch storage. */
function storageKey(): string | undefined {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).has("fast")) return
  return `campfire:${window.location.pathname.replace(/\/+$/, "") || "/"}`
}
let saved: Record<string, unknown> = {}
try {
  const key = storageKey()
  const value = key ? JSON.parse(window.localStorage.getItem(key) ?? "null") : null
  if (value?.schema === 1 && value.slices && typeof value.slices === "object") saved = value.slices
} catch { /* Use fixtures when storage is unavailable or corrupt. */ }
const readers = new Map<string, () => unknown>()
let timer: ReturnType<typeof setTimeout> | undefined
let resetting = false
export function restoreSlice<T>(name: string, fixture: T, validate?: (value: T) => boolean): T {
  try {
    if (!storageKey()) return fixture
    const value = saved[name]
    // Check the complete fixture shape, including nested records and arrays.
    const matches = (sample: unknown, candidate: unknown): boolean => {
      if (sample === null) return candidate === null
      if (Array.isArray(sample)) return Array.isArray(candidate)
      if (typeof sample === "object") return !!candidate && typeof candidate === "object" && Object.entries(sample).every(([k, v]) => matches(v, (candidate as Record<string, unknown>)[k]))
      return typeof sample === typeof candidate
    }
    return matches(fixture, value) && (!validate || validate(value as T)) ? value as T : fixture
  } catch { return fixture }
}
export function persistSlice(name: string, read: () => unknown, subscribe: (fn: () => void) => () => void) {
  readers.set(name, read)
  subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(flushDemo, 300)
  })
}
export function flushDemo() {
  try {
    const key = storageKey()
    if (!key || resetting) return
    window.localStorage.setItem(key, JSON.stringify({ schema: 1, slices: Object.fromEntries([...readers].map(([name, read]) => [name, read()])) }))
  } catch { /* Storage quota/privacy settings must not interrupt the demo. */ }
}
export function resetDemo() {
  resetting = true
  clearTimeout(timer)
  try { const key = storageKey(); if (key) window.localStorage.removeItem(key) } catch { /* Still reload the fixture. */ }
  if (typeof window !== "undefined") window.location.reload()
}
if (typeof window !== "undefined") window.addEventListener("pagehide", flushDemo)
