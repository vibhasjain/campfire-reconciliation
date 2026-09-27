// Post-build: every page gets its own <title>, favicon links and Open Graph tags.
// App routes get their own index.html copy (same bundle) so link previews differ per page;
// static pages (story, concept canvases) are patched in dist, so re-exported canvases stay covered.
import { readFileSync, writeFileSync } from "node:fs"

const SITE = "https://campfire-reconciliation.netlify.app"
const APP = "Campfire reconciliation"

const PAGES = [
  {
    path: "/version-control",
    app: true,
    title: `Version control · ${APP}`,
    image: "/og/version-control.jpg",
    description:
      "Every version of the Campfire bank-reconciliation take-home: three coded prototypes, four design concepts, the storyboard and references.",
  },
  {
    path: "/references",
    app: true,
    title: `References · ${APP}`,
    image: "/og/references.jpg",
    description:
      "What I looked at: Campfire's reconciliation today, and how Rillet and Numeric approach matching.",
  },
  {
    path: "/v1",
    app: true,
    title: `v1 Workbench · ${APP}`,
    image: "/og/v1.jpg",
    description:
      "A prioritized queue with a side sheet: fast, familiar triage of 14 unmatched transactions with Ember's suggestions.",
  },
  {
    path: "/v2",
    app: true,
    title: `v2 Paired ledger · ${APP}`,
    image: "/og/v2.jpg",
    description:
      "Books and bank side by side, with Ember's pairs pre-aligned so matching is reading across a line.",
  },
  {
    path: "/v3",
    app: true,
    title: `v3 Flow · ${APP}`,
    image: "/og/v3.jpg",
    description:
      "One decision at a time: accept, the next arrives, and the difference closes to $0.00.",
  },
  {
    path: "/story",
    title: "Maya's close · Campfire",
    image: "/story/og-image.jpg",
    description:
      "Maya's September close: from fourteen unmatched transactions to a confident handoff.",
  },
  {
    path: "/concepts/a-workpaper",
    title: `Concept A: Workpaper · ${APP}`,
    image: "/og/a-workpaper.jpg",
    description:
      "Brilliant canvas: Ember drafts the reconciliation as a workpaper and Maya signs by exception.",
  },
  {
    path: "/concepts/b-balance-bridge",
    title: `Concept B: Balance bridge · ${APP}`,
    image: "/og/b-balance-bridge.jpg",
    description:
      "Brilliant canvas: the difference is the interface, a bank-to-book bridge that closes at $0.00.",
  },
  {
    path: "/concepts/c-thread-inbox",
    title: `Concept C: Thread inbox · ${APP}`,
    image: "/og/c-thread-inbox.jpg",
    description:
      "Paper canvas: the reconciliation as an inbox of 14 threads, each opening with Ember's proposal.",
  },
  {
    path: "/concepts/d-timeline",
    title: `Concept D: Timeline · ${APP}`,
    image: "/og/d-timeline.jpg",
    description:
      "Paper canvas: September as a time axis, bank above and books below, the cutoff as a hard line.",
  },
]

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
const icons =
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'
const tags = (p) =>
  [
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
    .replace(
      /<meta (?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g,
      ""
    )
    .replace(
      /<link rel="(?:icon|alternate icon|shortcut icon|apple-touch-icon)"[^>]*>\s*/g,
      ""
    )
  html = /<title>[^<]*<\/title>/.test(html)
    ? html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`)
    : html.replace(/<head[^>]*>/, (m) => `${m}<title>${esc(p.title)}</title>`)
  return html.replace("</head>", `${icons}${tags(p)}</head>`)
}

// Dark-canvas legibility: Brilliant's htmlDoc places bare text blocks (titles, round headers) with
// dark text and no background; invert just those top-level nodes so they read on the dark canvas.
const legible = (html) =>
  html.includes('<div id="export">')
    ? html.replace(
        /\n  <div style="(?![^"]*background)([^"]*)">/g,
        '\n  <div style="$1 filter: invert(1) hue-rotate(180deg);">'
      )
    : html

// Canvases: a small fixed "home" pill, top-left, styled like the zoom control.
const HOME =
  '<a id="home-link" href="/version-control" title="Version control" style="position:fixed;left:16px;top:16px;z-index:10;display:flex;align-items:center;gap:6px;padding:5px 9px 5px 6px;border:1px solid #484848;border-radius:7px;background:#292929;color:#ddd;font:12px system-ui,sans-serif;text-decoration:none"><img src="/favicon.svg" width="16" height="16" alt="">Version control</a>'
const withHome = (html) =>
  html.includes('id="home-link"')
    ? html
    : html.replace("</body>", `${HOME}</body>`)

// Both exporters own their raw HTML; normalize behavior only in the built pages.
const CANVAS_STYLE = `<style id="canvas-fixes">
html,body{touch-action:pan-x pan-y}
body{width:auto}
#export svg{display:block}
.frame div[style*="position:absolute"]:not([style*="width:"]){width:max-content}
/* Match the reference's wider name column while retaining room for effects. */
.frame[aria-label="C5 Sweep"] div[style*="width:352px"]{width:364px!important}
.frame[aria-label="C5 Sweep"] div[style*="height:34px"]>div[style*="flex-grow:1"]{white-space:nowrap}
</style>`
const CANVAS_CONTROLS = `<script src="/no-zoom.js"></script>
<script id="canvas-behavior">
(() => {
  // No zoom anywhere on the site: the canvas is shown at 1x; #r2 jumps to the round-2 frames.
  const canvas = document.getElementById('canvas');
  const roundTwo = [...canvas.querySelectorAll('.canvas-label,.frame[aria-label]')]
    .filter(node => /\\b(r2|round\\s*2)\\b/i.test(node.getAttribute('aria-label') || node.textContent))
    .sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft)[0];
  if (roundTwo) roundTwo.id = 'r2';
  function landOnRoundTwo() {
    if (location.hash !== '#r2' || !roundTwo) return;
    const r = roundTwo.getBoundingClientRect();
    scrollTo(Math.max(0, r.left + scrollX - 32), Math.max(0, r.top + scrollY - 72)); // clear the home pill
  }
  if (document.readyState === 'complete') landOnRoundTwo();
  else addEventListener('load', landOnRoundTwo, {once:true});
  addEventListener('hashchange', landOnRoundTwo);
})();
</script>`

const VIEWPORT =
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
function withCanvas(html) {
  html = html
    .replace(/<meta name="viewport"[^>]*>\s*/g, "")
    .replace("<head>", `<head>${VIEWPORT}`)
  // Strip only the exporter zoom nav and its associated inline behavior.
  html = html.replace(
    /<nav\b[^>]*id="(?:zoom-controls|zoom)"[^>]*>[\s\S]*?<\/nav>\s*<script\b[^>]*>[\s\S]*?<\/script>/g,
    ""
  )
  return html
    .replace("</head>", `${CANVAS_STYLE}</head>`)
    .replace("</body>", `${CANVAS_CONTROLS}</body>`)
}

const shell = readFileSync("dist/index.html", "utf8")
for (const p of PAGES) {
  // App routes are written as /v1.html etc. so Netlify serves /v1 directly (no 301 to /v1/).
  const file = p.app ? `dist${p.path}.html` : `dist${p.path}/index.html`
  writeFileSync(
    file,
    apply(
      p.app
        ? shell
        : p.path.startsWith("/concepts/")
          ? withHome(withCanvas(legible(readFileSync(file, "utf8"))))
          : readFileSync(file, "utf8"),
      p
    )
  )
}
writeFileSync("dist/index.html", apply(shell, PAGES[0]))
console.log(`seo: tagged ${PAGES.length + 1} pages`)
