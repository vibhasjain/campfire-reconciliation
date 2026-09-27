import { useEffect, type ReactNode } from "react"
import { GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { REPO } from "./versions"
import { prefetch } from "./loaders"

export default function SiteFrame({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} · Campfire reconciliation`
  }, [title])
  return (
    <main className="min-h-screen bg-page text-fg">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <a
              href="/version-control"
              onMouseEnter={() => prefetch("/version-control")}
              onFocus={() => prefetch("/version-control")}
              className="rounded-md text-xs text-fg-3 focus-visible:outline-2 focus-visible:outline-focus"
            >
              Campfire reconciliation
            </a>
            <h1 className="mt-2 text-2xl font-medium tracking-tight">
              {title}
            </h1>
          </div>
          <Button asChild variant="ghost" size="sm">
            <a href={REPO}>
              <GitBranch />
              GitHub
            </a>
          </Button>
        </header>
        {children}
      </div>
    </main>
  )
}
