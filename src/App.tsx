import { AppShell } from "@/app/AppShell"
import ReconScreen from "@/versions/ReconScreen"

export default function App() {
  const route = location.pathname.match(/^\/campfire([123])/)
  if (route) {
    const version = Number(route[1]) as 1 | 2 | 3
    return <AppShell><ReconScreen version={version} /></AppShell>
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="text-center">
        <p className="mb-6 text-sm text-fg-3">Arbor Analytics · Chase Operating ••4821 · September 2026</p>
        <nav aria-label="Reconciliation versions" className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <a className="font-medium text-brand underline-offset-4 hover:underline" href="/campfire1">1 · Workbench</a>
          <a className="font-medium text-brand underline-offset-4 hover:underline" href="/campfire2">2 · Paired ledger</a>
          <a className="font-medium text-brand underline-offset-4 hover:underline" href="/campfire3">3 · Flow</a>
        </nav>
      </div>
    </main>
  )
}
