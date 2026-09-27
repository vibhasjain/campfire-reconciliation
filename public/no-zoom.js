// Zoom is intentional here: only the design canvases zoom (with their own control). Everywhere else,
// block every browser zoom path. The viewport meta covers most mobile browsers, but iOS Safari ignores
// user-scalable=no, and desktop zoom comes from ⌘/ctrl + wheel (trackpad pinch), Safari gesture events
// and ⌘ +/−/0. Double-tap zoom is handled by `touch-action: pan-x pan-y` in CSS.
(() => {
  const block = (e) => e.preventDefault()
  const opts = { passive: false }
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, block, opts)
  document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault() }, opts)
  addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }, opts)
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["=", "+", "-", "_", "0"].includes(e.key)) e.preventDefault()
  })
})()
