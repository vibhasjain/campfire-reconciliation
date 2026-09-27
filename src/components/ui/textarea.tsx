import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border-hair border-line-input bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-hint hover:border-line-strong focus-visible:border-focus disabled:cursor-not-allowed disabled:text-fg-disabled aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
