import { useEffect, type ReactNode } from "react"
import { GitBranch } from "lucide-react"
import { CampfireTag } from "@/components/common/CampfireTag"
import { REPO } from "./versions"
import { prefetch } from "./loaders"

export default function SiteFrame({
  title,
  toolbar,
  back = "home",
  children,
}: {
  title: string
  /** The top-left tag: Home (the live prototype) or back to version control. */
  back?: "home" | "versions"
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
        <header className="mb-6 flex items-center gap-6 max-sm:gap-3">
          <h1 className="sr-only">{title}</h1>
          <a
            href={back === "home" ? "/" : "/version-control"}
            onMouseEnter={() =>
              prefetch(back === "home" ? "/" : "/version-control")
            }
            onFocus={() => prefetch(back === "home" ? "/" : "/version-control")}
            className="rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CampfireTag
              label={back === "home" ? "Home" : "Version control"}
              size="lg"
            />
          </a>
          {toolbar}
          <a
            href={REPO}
            className={`rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-focus ${toolbar ? "" : "ml-auto"}`}
          >
            <CampfireTag label="GitHub" size="lg" icon={<GitBranch />} />
          </a>
        </header>
        {children}
      </div>
    </main>
  )
}
