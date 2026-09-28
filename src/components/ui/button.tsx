import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { ActionTooltip } from "./tooltip"

const ghostStyle =
  "text-fg-2 hover:bg-fill-hover hover:text-fg aria-expanded:bg-fill-selected aria-expanded:text-fg active:bg-fill-selected"

// spec §4.4 — dense 24px buttons, instant hovers (no transition), hairline borders.
// Icon + label: a leading icon sits 2px into the padding (glyphs carry their own whitespace) so both sides read equal.
const buttonVariants = cva(
  "group/button inline-flex min-w-0 max-w-full shrink items-center justify-center rounded-md border-hair border-transparent bg-clip-padding font-medium whitespace-nowrap outline-none select-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:text-fg-disabled aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        outline:
          "border-line bg-surface text-fg shadow-button hover:bg-[color-mix(in_oklch,var(--c-surface),var(--c-fg)_2%)] aria-expanded:bg-fill-hover dark:bg-fill-subtle dark:hover:bg-fill-hover",
        ghost: ghostStyle,
        // Content toggles align their text and background with the container edge.
        "ghost-inline": `${ghostStyle} border-0`,
        selected: "border-line bg-fill-hover text-fg",
        brand:
          "bg-brand-soft text-white hover:bg-brand disabled:bg-brand-soft/50 disabled:text-white/80",
        destructive: "bg-danger text-white hover:bg-danger-strong",
        "destructive-soft":
          "bg-danger-tint text-danger-strong hover:bg-[color-mix(in_oklch,var(--c-danger-tint),var(--c-danger)_12%)]",
        secondary: "bg-fill-hover text-fg hover:bg-fill-selected",
        link: "text-brand-strong underline-offset-4 hover:underline",
        // shadcn "default" kept for generated components; renders as brand
        default: "bg-brand-soft text-white hover:bg-brand",
      },
      edge: {
        end: "sheet-edge-end",
      },
      size: {
        xs: "h-6 gap-1 px-2 py-0.5 text-xs-medium [&>svg:first-child:not(:only-child)]:-ml-0.5 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 gap-1.5 px-2.5 text-xs-medium [&>svg:first-child:not(:only-child)]:-ml-0.5 [&_svg:not([class*='size-'])]:size-4",
        md: "h-8 gap-1.5 px-3 text-sm [&>svg:first-child:not(:only-child)]:-ml-0.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2 px-3 text-base [&_svg:not([class*='size-'])]:size-5",
        "icon-sheet": "shrink-0 sheet-icon-button border-0",
        icon: "shrink-0 size-6 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "shrink-0 size-5 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "shrink-0 size-7 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "shrink-0 size-8 [&_svg:not([class*='size-'])]:size-4",
        default:
          "h-6 gap-1 px-2 py-0.5 text-xs-medium [&>svg:first-child:not(:only-child)]:-ml-0.5 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    compoundVariants: [{ variant: "ghost-inline", className: "px-0" }],
    defaultVariants: {
      variant: "outline",
      size: "xs",
    },
  }
)

function Button({
  className,
  variant = "outline",
  size = "xs",
  asChild = false,
  edge,
  tooltip,
  shortcut,
  title,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Icon buttons use their accessible label by default; false opts out. */
    tooltip?: React.ReactNode | false
    shortcut?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"

  const label =
    tooltip === false
      ? undefined
      : (tooltip ??
        title ??
        (size?.startsWith("icon") ? props["aria-label"] : undefined))
  const truncateText = (content: React.ReactNode) => React.Children.map(content, (child) =>
    typeof child === "string" || typeof child === "number"
      ? <span className="min-w-0 truncate">{child}</span>
      : child
  )
  const content = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
    ? React.cloneElement(children, {}, truncateText(children.props.children))
    : truncateText(children)
  const button = (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, edge, className }))}
      {...props}
      children={content}
      aria-label={
        props["aria-label"] ?? (typeof label === "string" ? label : undefined)
      }
    />
  )
  return label ? (
    <ActionTooltip label={label} shortcut={shortcut}>
      {button}
    </ActionTooltip>
  ) : (
    button
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
