import { AppShell } from "@/app/AppShell"
import ReconScreen from "@/versions/ReconScreen"

// Routes: /v1 Workbench, /v2 Paired ledger, /v3 Flow. "/" is intentionally empty for now;
// /story, /concepts, /references and /version-control are static pages in public/.
export default function App() {
  const route = location.pathname.match(/^\/v([123])(\/|$)/)
  if (!route) return null
  const version = Number(route[1]) as 1 | 2 | 3
  return (
    <AppShell>
      <ReconScreen version={version} />
    </AppShell>
  )
}
