// Komo's damped spring, adapted to animate React/Radix card entry and exit.
// Copyright (c) 2026 Lué Studio and tjcages. MIT: see LICENSE.
import { isFastMode } from "@/recon/speed"

export function springStep(
  value: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness = 600,
  damping = 34
) {
  const nextVelocity =
    velocity + ((target - value) * stiffness - velocity * damping) * dt
  return { value: value + nextVelocity * dt, velocity: nextVelocity }
}

/** Radix owns positioning; this spring only moves and fades the inner card. */
export function cardMotion(
  element: HTMLElement,
  entering = true,
  onComplete?: () => void
) {
  if (isFastMode() || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    onComplete?.()
    return () => {}
  }
  let frame = 0
  let last = performance.now()
  let value = entering ? 0 : 1
  let velocity = 0
  const target = entering ? 1 : 0
  element.style.willChange = "translate, scale, opacity"
  const paint = () => {
    element.style.translate = `0 ${(1 - value) * 8}px`
    element.style.scale = `${0.975 + value * 0.025}`
    element.style.opacity = String(Math.max(0, Math.min(1, value)))
  }
  const stop = () => {
    cancelAnimationFrame(frame)
    element.style.willChange = ""
  }
  const tick = (time: number) => {
    const elapsed = Math.min((time - last) / 1000, 0.032)
    last = time
    const steps = Math.max(1, Math.ceil(elapsed / 0.008))
    for (let i = 0; i < steps; i++) {
      const next = springStep(value, velocity, target, elapsed / steps)
      value = next.value
      velocity = next.velocity
    }
    paint()
    if (Math.abs(value - target) < 0.002 && Math.abs(velocity) < 0.02) {
      value = target
      paint()
      stop()
      onComplete?.()
      return
    }
    frame = requestAnimationFrame(tick)
  }
  paint()
  frame = requestAnimationFrame(tick)
  return stop
}
