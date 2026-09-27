// Post-build: every page gets its own <title>, favicon links and Open Graph tags.
// App routes get their own index.html copy (same bundle) so link previews differ per page;
// static pages (story, concept canvases) are patched in dist, so re-exported canvases stay covered.
import { readFileSync, writeFileSync } from "node:fs"

const SITE = "https://campfire-reconciliation.netlify.app"
const APP = "Campfire reconciliation"

const PAGES = [
  { path: "/version-control", app: true, title: `Version control · ${APP}`, image: "/og/version-control.jpg",
    description: "Every version of the Campfire bank-reconciliation take-home: three coded prototypes, four design concepts, the storyboard and references." },
  { path: "/references", app: true, title: `References · ${APP}`, image: "/og/references.jpg",
    description: "What I looked at: Campfire's reconciliation today, and how Rillet and Numeric approach matching." },
  { path: "/v1", app: true, title: `v1 Workbench · ${APP}`, image: "/og/v1.jpg",
    description: "A prioritized queue with a side sheet: fast, familiar triage of 14 unmatched transactions with Ember's suggestions." },
  { path: "/v2", app: true, title: `v2 Paired ledger · ${APP}`, image: "/og/v2.jpg",
    description: "Books and bank side by side, with Ember's pairs pre-aligned so matching is reading across a line." },
  { path: "/v3", app: true, title: `v3 Flow · ${APP}`, image: "/og/v3.jpg",
    description: "One decision at a time: accept, the next arrives, and the difference closes to $0.00." },
  { path: "/story", title: "Maya's close · Campfire", image: "/story/og-image.jpg",
    description: "Maya's September close: from fourteen unmatched transactions to a confident handoff." },
  { path: "/concepts/a-workpaper", title: `Concept A: Workpaper · ${APP}`, image: "/og/a-workpaper.jpg",
    description: "Brilliant canvas: Ember drafts the reconciliation as a workpaper and Maya signs by exception." },
  { path: "/concepts/b-balance-bridge", title: `Concept B: Balance bridge · ${APP}`, image: "/og/b-balance-bridge.jpg",
    description: "Brilliant canvas: the difference is the interface, a bank-to-book bridge that closes at $0.00." },
  { path: "/concepts/c-thread-inbox", title: `Concept C: Thread inbox · ${APP}`, image: "/og/c-thread-inbox.jpg",
    description: "Paper canvas: the reconciliation as an inbox of 14 threads, each opening with Ember's proposal." },
  { path: "/concepts/d-timeline", title: `Concept D: Timeline · ${APP}`, image: "/og/d-timeline.jpg",
    description: "Paper canvas: September as a time axis, bank above and books below, the cutoff as a hard line." },
]

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
const icons = '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'
const tags = (p) => [
  `<meta name="description" content="${esc(p.description)}">`,
  '<meta property="og:type" content="website">',
  `<meta property="og:site_name" content="${APP}">`,
  `<meta property="og:title" content="${esc(p.title)}">`,
  `<meta property="og:description" content="${esc(p.description)}">`,
  `<meta property="og:url" content="${SITE}${p.path}">`,
  `<meta property="og:image" content="${SITE}${p.image}">`,
  '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta name="twitter:image" content="${SITE}${p.image}">`,
].join("")

function apply(html, p) {
  html = html
    .replace(/<meta (?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g, "")
    .replace(/<link rel="(?:icon|alternate icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/g, "")
  html = /<title>[^<]*<\/title>/.test(html)
    ? html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`)
    : html.replace(/<head[^>]*>/, (m) => `${m}<title>${esc(p.title)}</title>`)
  return html.replace("</head>", `${icons}${tags(p)}</head>`)
}

// Dark-canvas legibility: Brilliant's htmlDoc places bare text blocks (titles, round headers) with
// dark text and no background; invert just those top-level nodes so they read on the dark canvas.
const legible = (html) =>
  html.includes('<div id="export">')
    ? html.replace(/\n  <div style="(?![^"]*background)([^"]*)">/g, '\n  <div style="$1 filter: invert(1) hue-rotate(180deg);">')
    : html

const shell = readFileSync("dist/index.html", "utf8")
for (const p of PAGES) {
  // App routes are written as /v1.html etc. so Netlify serves /v1 directly (no 301 to /v1/).
  const file = p.app ? `dist${p.path}.html` : `dist${p.path}/index.html`
  writeFileSync(file, apply(p.app ? shell : legible(readFileSync(file, "utf8")), p))
}
writeFileSync("dist/index.html", apply(shell, PAGES[0]))
console.log(`seo: tagged ${PAGES.length + 1} pages`)
