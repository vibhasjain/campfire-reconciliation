import { restorePageFocus } from "@/recon/focus"
import type { CSSProperties, FormEvent, ReactNode } from "react"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * Dialog content shell: header (16px icon + 13/500 title + ✕), body, footer.
 * Render inside a Radix <Dialog> (DialogHost provides one for DialogRequest kinds).
 */
export function FormDialog({
  title,
  icon,
  width = 540,
  footer,
  children,
  onSubmit,
  placement = "center",
  footerDivider = false,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  width?: 540 | 664 | number
  footer?: ReactNode
  children?: ReactNode
  onSubmit?: () => void
  /** "top" pins at 180px (task + settings dialogs); default centered */
  placement?: "center" | "top"
  footerDivider?: boolean
  className?: string
}) {
  const body = (
    <>
      <DialogHeader>
        {icon}
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
      </DialogHeader>
      <div className={cn("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3", className)}>{children}</div>
      {footer && <DialogFooter divider={footerDivider}>{footer}</DialogFooter>}
    </>
  )
  return (
    <DialogContent onCloseAutoFocus={restorePageFocus} placement={placement} style={{ "--dialog-w": `${width}px` } as CSSProperties}>
      {onSubmit ? (
        <form
          className="flex min-h-0 flex-col"
          noValidate
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {body}
        </form>
      ) : (
        body
      )}
    </DialogContent>
  )
}

/** 11px label, 4px above its field; red asterisk when required. */
export function FieldLabel({ children, required, htmlFor, className }: { children: ReactNode; required?: boolean; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1 block text-xxs text-fg-4", className)}>
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  )
}

/** Inline form error (13px, danger). Renders nothing when empty. */
export function ErrorBanner({ children, className }: { children?: ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div role="alert" className={cn("text-sm text-danger", className)}>
      {children}
    </div>
  )
}
