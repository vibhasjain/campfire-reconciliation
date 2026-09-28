import { useEffect, type ReactNode } from "react"
import { GitBranch, House } from "lucide-react"
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
          <div className="min-w-0 flex-1">
            <a
              href="/version-control"
              onMouseEnter={() => prefetch("/version-control")}
              onFocus={() => prefetch("/version-control")}
              className="block truncate rounded-md text-xs text-fg-3 focus-visible:outline-2 focus-visible:outline-focus"
            >
              Campfire reconciliation
            </a>
            <h1 className="mt-2 truncate text-2xl font-medium tracking-tight">
              {title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <a
                href="/"
                onMouseEnter={() => prefetch("/")}
                onFocus={() => prefetch("/")}
              >
                <House />
                Live
              </a>
            </Button>
            <Button className="max-w-28" asChild variant="ghost" size="sm">
              <a href={REPO}>
                <GitBranch />
                <span className="min-w-0 truncate">GitHub</span>
              </a>
            </Button>
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}
