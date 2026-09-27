import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-7 w-full min-w-0 rounded-md border-hair border-line-input bg-transparent pr-1.5 pl-2 text-sm text-fg outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-fg-hint hover:border-line-strong focus-visible:border-focus disabled:pointer-events-none disabled:text-fg-disabled aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
