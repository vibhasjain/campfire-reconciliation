import { AppShell } from "@/app/AppShell"
import ReconScreen from "@/versions/ReconScreen"

export default function PrototypePage({ version }: { version: 1 | 2 | 3 }) {
  return (
    <AppShell>
      <ReconScreen version={version} />
    </AppShell>
  )
}
