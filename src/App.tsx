import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { loadPrototype, loadReferences, loadVersions } from "@/site/loaders"

const PrototypePage = lazy(loadPrototype)
const VersionControlPage = lazy(loadVersions)
const ReferencesPage = lazy(loadReferences)

export default function App() {
  const route = location.pathname.match(/^\/v([123])(\/|$)/)
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl p-6" aria-label="Loading">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-8 h-64 w-full" />
        </main>
      }
    >
      {route ? (
        <PrototypePage version={Number(route[1]) as 1 | 2 | 3} />
      ) : location.pathname.replace(/\/$/, "") === "/references" ? (
        <ReferencesPage />
      ) : (
        <VersionControlPage />
      )}
    </Suspense>
  )
}
