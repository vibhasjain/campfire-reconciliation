import { queueItems, recon } from "@/recon/useRecon"

// Local fallback until the shared core exports nextOpenAfter.
export function nextOpenAfter(itemId: string): string | undefined {
  const queue = queueItems(recon.getState())
  const index = queue.findIndex((item) => item.id === itemId)
  for (let step = 1; step <= queue.length; step++) {
    const item = queue[(index + step) % queue.length]
    if (item.status === "open") return item.id
  }
}
