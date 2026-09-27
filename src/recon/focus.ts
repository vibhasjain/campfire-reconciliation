export function focusPage() {
  if (typeof document === "undefined") return
  const target = document.querySelector<HTMLElement>("[data-recon-focus], main")
  if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }) }
}
export function restorePageFocus(event: Event) {
  event.preventDefault()
  focusPage()
}
