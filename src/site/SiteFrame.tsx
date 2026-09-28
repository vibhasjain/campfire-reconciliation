import { useEffect, type ReactNode } from "react"
import { GitBranch } from "lucide-react"
import { CampfireTag } from "@/components/common/CampfireTag"
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
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="sr-only">{title}</h1>
          <a
            href="/"
            onMouseEnter={() => prefetch("/")}
            onFocus={() => prefetch("/")}
            className="rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CampfireTag label="Home" size="lg" />
          </a>
          <a
            href={REPO}
            className="rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CampfireTag label="GitHub" size="lg" icon={<GitBranch />} />
          </a>
        </header>
        {children}
      </div>
    </main>
  )
}
