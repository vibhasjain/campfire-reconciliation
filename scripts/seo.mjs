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
body{width:auto}
#canvas-viewport{position:relative;overflow:clip}
#canvas{position:absolute;left:0;top:0;transform-origin:0 0}
#export svg{display:block}
.frame div[style*="position:absolute"]:not([style*="width:"]){width:max-content}
/* Match the reference's wider name column while retaining room for effects. */
.frame[aria-label="C5 Sweep"] div[style*="width:352px"]{width:364px!important}
.frame[aria-label="C5 Sweep"] div[style*="height:34px"]>div[style*="flex-grow:1"]{white-space:nowrap}
#zoom-controls{position:fixed;right:16px;bottom:16px;z-index:10;display:flex;align-items:center;gap:4px;padding:4px;border:1px solid #484848;border-radius:7px;background:#292929;color:#ddd;font:12px system-ui,sans-serif}
#zoom-controls button{border:0;border-radius:3px;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:6px 9px}
#zoom-controls button:hover{background:#404040}
#zoom-controls button:focus-visible{outline:1px solid #ccc}
#zoom-level{min-width:52px;text-align:center}
</style>`
const CANVAS_CONTROLS = `<nav id="zoom-controls" aria-label="Canvas zoom"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="reset" id="zoom-level" aria-label="Reset to 100%">100%</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="fit">Fit</button></nav>
<script id="canvas-behavior">
(() => {
  const canvas = document.getElementById('canvas');
  const level = document.getElementById('zoom-level');
  const width = canvas.offsetWidth, height = canvas.offsetHeight;
  const viewport = document.createElement('div');
  viewport.id = 'canvas-viewport';
  canvas.before(viewport);
  viewport.append(canvas);
  let z = 1;
  function setZoom(next, fit = false) {
    const x = scrollX / z, y = scrollY / z;
    z = Math.max(.02, Math.min(4, next));
    canvas.style.transform = 'scale(' + z + ')';
    viewport.style.width = width * z + 'px';
    viewport.style.height = height * z + 'px';
    level.textContent = Math.round(z * 100) + '%';
    scrollTo(fit ? 0 : x * z, fit ? 0 : y * z);
  }
  function zoom(action) {
    setZoom(action === 'fit' ? Math.min(innerWidth / width, innerHeight / height)
      : action === 'reset' ? 1 : z * (action === 'out' ? .8 : 1.25), action === 'fit');
  }
  document.getElementById('zoom-controls').addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.zoom;
    if (action) zoom(action);
  });
  addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    const action = {'-':'out', '=':'in', '+':'in', '0':'reset'}[event.key];
    if (action) { event.preventDefault(); zoom(action); }
  });
  // Brilliant exposes labels; Paper exposes named frame sections. Ignore note cards.
  const roundTwo = [...canvas.querySelectorAll('.canvas-label,.frame[aria-label]')]
    .filter(node => /\\b(r2|round\\s*2)\\b/i.test(node.getAttribute('aria-label') || node.textContent)
      && /^[A-D][1-9][0-9]*\\b/i.test(node.getAttribute('aria-label') || node.textContent))
    .sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft)[0];
  if (roundTwo) roundTwo.id = 'r2';
  function landOnRoundTwo() {
    if (location.hash !== '#r2' || !roundTwo) return;
    scrollTo(Math.max(0, roundTwo.offsetLeft * z - 32), Math.max(0, roundTwo.offsetTop * z - 64));
  }
  setZoom(1);
  if (document.readyState === 'complete') landOnRoundTwo();
  else addEventListener('load', landOnRoundTwo, {once:true});
  addEventListener('hashchange', landOnRoundTwo);
})();
</script>`

function withCanvas(html) {
  // Strip only the exporter zoom nav and its associated inline behavior.
  html = html.replace(/<nav\b[^>]*id="(?:zoom-controls|zoom)"[^>]*>[\s\S]*?<\/nav>\s*<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  return html.replace('</head>', `${CANVAS_STYLE}</head>`)
    .replace('</body>', `${CANVAS_CONTROLS}</body>`)
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
