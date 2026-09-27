// The owner wants zoom disabled everywhere. The viewport meta covers most mobile browsers, but iOS Safari
// ignores user-scalable=no, and desktop zoom comes from ctrl/⌘ + wheel (trackpad pinch), Safari gesture
// events and ⌘ +/−/0 — so block each at the document level.
export function disableZoom() {
  const block = (e: Event) => e.preventDefault()
  const opts = { passive: false } as const
  // Safari (iOS + macOS trackpad) pinch
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, block, opts)
  // multi-touch pinch on browsers without gesture events
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault() }, opts)
  // (double-tap zoom is handled by `touch-action: pan-x pan-y` in index.css)
  // ctrl/⌘ + wheel (Chrome/Firefox trackpad pinch, mouse zoom)
  window.addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }, opts)
  // ⌘/ctrl + = - + 0
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["=", "+", "-", "_", "0"].includes(e.key)) e.preventDefault()
  })
}
