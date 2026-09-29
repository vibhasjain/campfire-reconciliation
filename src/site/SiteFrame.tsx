import { useEffect, type ReactNode } from "react"
import { GitBranch } from "lucide-react"
import { CampfireTag } from "@/components/common/CampfireTag"
import { REPO } from "./versions"
import { prefetch } from "./loaders"

export default function SiteFrame({
  title,
  toolbar,
  children,
}: {
  title: string
  /** The page's own controls, spaced evenly between Home and GitHub. */
  toolbar?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    document.title = `${title} · Campfire reconciliation`
  }, [title])
  return (
    <main className="min-h-screen bg-page text-fg">
      <div className="mx-auto max-w-[1440px] px-5 pt-4 pb-8 sm:px-8 sm:pt-5 sm:pb-12">
        {/* Phones: Home and GitHub on the first line, the section switches below. */}
        <header className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 max-sm:gap-x-3">
          <h1 className="sr-only">{title}</h1>
          <a
            href="/"
            onMouseEnter={() => prefetch("/")}
            onFocus={() => prefetch("/")}
            className="rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CampfireTag label="Home" size="lg" />
          </a>
          {toolbar}
          <a
            href={REPO}
            className={`rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus ${toolbar ? "max-sm:order-1 max-sm:ml-auto" : "ml-auto"}`}
          >
            <CampfireTag label="GitHub" size="lg" icon={<GitBranch />} />
          </a>
        </header>
        {children}
      </div>
    </main>
  )
}
