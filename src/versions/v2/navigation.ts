import { queueItems, recon } from "@/recon/useRecon"

/** Next open row in the given order: v2 passes the pre-accept order so the resolved row still anchors the position. */
export function nextOpenAfter(
  itemId: string,
  order = queueItems(recon.getState()).map((item) => item.id)
): string | null {
  const state = recon.getState()
  const index = order.indexOf(itemId)
  for (let step = 1; step <= order.length; step++) {
    const id = order[(index + step) % order.length]
    if (id !== itemId && state.items[id]?.status === "open") return id
  }
  return null
}

export function focusRow(id: string) {
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `.paired-group[data-item-id="${id}"]`
    )
    row?.focus({ preventScroll: true })
    const actions = window.matchMedia("(max-width: 767px)").matches
      ? row?.querySelector('[data-action="accept"]')?.parentElement
      : null
    ;(actions ?? row)?.scrollIntoView({ block: "nearest" })
  })
}
