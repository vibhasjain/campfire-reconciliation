import * as React from "react"
import { cn } from "@/lib/utils"
import { Tooltip as TooltipPrimitive } from "radix-ui"

function TooltipProvider({
  delayDuration = 0,
  skipDelayDuration = 100,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

const hoverQuery = "(hover: hover)"
const subscribeHover = (notify: () => void) => {
  const media = window.matchMedia(hoverQuery)
  media.addEventListener("change", notify)
  return () => media.removeEventListener("change", notify)
}
const canHover = () => window.matchMedia(hoverQuery).matches

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const hover = React.useSyncExternalStore(
    subscribeHover,
    canHover,
    () => false
  )
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      {...props}
      open={hover ? props.open : false}
    />
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs items-center gap-2 rounded-md border-hair border-line bg-surface px-2 py-1 text-xs text-fg-2 shadow-menu",
          className
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }

/** Shared action hint. asChild keeps the original button/link and its ref intact. */
function ActionTooltip({
  children,
  label,
  shortcut,
}: {
  children: React.ReactElement
  label: React.ReactNode
  shortcut?: string
}) {
  return (
    <Tooltip>
      {/* Hover only: focus (a dialog focusing its close button, a shortcut) never pops a tooltip. */}
      <TooltipTrigger asChild onFocus={(event) => event.preventDefault()}>
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && (
          <kbd className="rounded-sm bg-fill-subtle px-1 font-sans text-[10px] text-fg-4">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export { ActionTooltip }
