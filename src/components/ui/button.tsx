import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// spec §4.4 — dense 24px buttons, instant hovers (no transition), hairline borders.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border-hair border-transparent bg-clip-padding font-medium whitespace-nowrap outline-none select-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:text-fg-disabled aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        outline:
          "border-line bg-surface text-fg shadow-button hover:bg-[color-mix(in_oklch,var(--c-surface),var(--c-fg)_2%)] aria-expanded:bg-fill-hover dark:bg-fill-subtle dark:hover:bg-fill-hover",
        ghost: "text-fg-2 hover:bg-fill-hover hover:text-fg aria-expanded:bg-fill-selected aria-expanded:text-fg active:bg-fill-selected",
        selected: "border-line bg-fill-hover text-fg",
        brand: "bg-brand-soft text-white hover:bg-brand disabled:bg-brand-soft/50 disabled:text-white/80",
        destructive: "bg-danger text-white hover:bg-danger-strong",
        "destructive-soft": "bg-danger-tint text-danger-strong hover:bg-[color-mix(in_oklch,var(--c-danger-tint),var(--c-danger)_12%)]",
        secondary: "bg-fill-hover text-fg hover:bg-fill-selected",
        link: "text-brand-strong underline-offset-4 hover:underline",
        // shadcn "default" kept for generated components; renders as brand
        default: "bg-brand-soft text-white hover:bg-brand",
      },
      size: {
        xs: "h-6 gap-1 px-[7px] py-0.5 text-xs-medium [&>svg]:mx-0.5 [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 gap-1.5 px-2 text-xs-medium [&>svg]:mx-0.5 [&_svg:not([class*='size-'])]:size-4",
        md: "h-8 gap-1.5 px-2.5 text-sm [&>svg]:mx-0.5 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2 px-3 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-6 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4",
        default: "h-6 gap-1 px-[7px] py-0.5 text-xs-medium [&>svg]:mx-0.5 [&_svg:not([class*='size-'])]:size-4",
      },
    },
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
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
