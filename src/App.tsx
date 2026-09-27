import { loadPrototype, loadReferences, loadVersions } from "@/site/loaders"

// Resolve the entry route before rendering so React never mounts a throttled fallback.
export async function loadApp() {
  const route = location.pathname.match(/^\/v([123])(\/|$)/)
  if (route) {
    const { default: Page } = await loadPrototype()
    const version = Number(route[1]) as 1 | 2 | 3
    return function App() {
      return <Page version={version} />
    }
  }
  const { default: Page } = await (location.pathname.replace(/\/$/, "") ===
  "/references"
    ? loadReferences()
    : loadVersions())
  return Page
}
