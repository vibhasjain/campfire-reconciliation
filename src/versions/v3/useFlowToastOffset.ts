import { useEffect } from "react"

/** Keep phone toasts above both the pinned action and any visible thread surface. */
export function useFlowToastOffset(phone: boolean) {
  useEffect(() => {
    if (!phone) return
    const style = document.body.style
    const previous = style.getPropertyValue("--toast-offset")
    const priority = style.getPropertyPriority("--toast-offset")
    let frame = 0
    let observed: Element | null = null
    const resize = new ResizeObserver(schedule)
    function update() {
      frame = 0
      const thread = document.querySelector('[data-layer="thread"]')
      const surface =
        thread?.closest('[data-slot="sheet-content"]') ??
        document.querySelector('.flow-composer[data-action="comment"]')
      if (surface !== observed) {
        resize.disconnect()
        if (surface) resize.observe(surface)
        observed = surface
      }
      const rect = surface?.getBoundingClientRect()
      // Core adds 16px below a phone toast; retain an 8px gap above the surface.
      const offset =
        rect && rect.bottom > 0 && rect.top < window.innerHeight
          ? Math.max(64, window.innerHeight - rect.top - 8)
          : 64
      style.setProperty("--toast-offset", `${Math.ceil(offset)}px`)
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const changes = new MutationObserver(schedule)
    changes.observe(document.body, { childList: true, subtree: true })
    window.addEventListener("scroll", schedule, true)
    window.addEventListener("resize", schedule)
    document.addEventListener("animationend", schedule, true)
    update()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      changes.disconnect()
      window.removeEventListener("scroll", schedule, true)
      window.removeEventListener("resize", schedule)
      document.removeEventListener("animationend", schedule, true)
      if (previous) style.setProperty("--toast-offset", previous, priority)
      else style.removeProperty("--toast-offset")
    }
  }, [phone])
}
