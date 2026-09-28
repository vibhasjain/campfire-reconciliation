export const loadPrototype = () => import("./PrototypePage")
export const loadVersions = () => import("./VersionControlPage")
export const loadReferences = () => import("./ReferencesPage")

export function prefetch(href: string) {
  if (href === "/" || /^\/v[123](\/|$)/.test(href)) void loadPrototype()
  else if (href === "/references") void loadReferences()
  else if (href === "/version-control") void loadVersions()
  else if (/^\/(concepts|story)\//.test(href)) prefetchDocument(href)
}

// Static pages (concept canvases, the story deck): warm the HTTP cache on intent.
const prefetched = new Set<string>()
function prefetchDocument(href: string) {
  if (prefetched.has(href)) return
  prefetched.add(href)
  const link = document.createElement("link")
  link.rel = "prefetch"
  link.href = href
  document.head.append(link)
}
