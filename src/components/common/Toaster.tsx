import { useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CircleAlert, CircleCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dismissToast, items, listeners } from "./toast"

const ICON = { info: Info, success: CircleCheck, error: CircleAlert }
const ICON_COLOR = { info: "text-fg-3", success: "text-success", error: "text-danger" }

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => (listeners.add(l), () => void listeners.delete(l)),
    () => items
  )
  return (
    <div className="pointer-events-none fixed right-8 bottom-[calc(2rem+var(--toast-offset,0px))] z-[9999] flex w-[380px] max-w-[calc(100vw-32px)] flex-col items-stretch gap-3 max-sm:right-4 max-sm:bottom-[calc(1rem+var(--toast-offset,0px))]">
      <AnimatePresence initial={false}>
        {list.map((t) => {
          const tone = t.tone ?? "info"
          const Icon = ICON[tone]
          return (
            <motion.div
              key={t.id}
              layout
              role="alert"
              data-testid="toast"
              style={{ originX: 0.5, originY: 1 }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 520, damping: 26, mass: 1, opacity: { duration: 0.12, delay: 0.1 } } }}
              exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.12 } }}
              className="pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-lg bg-surface p-3 text-sm text-fg shadow-menu"
            >
              <Icon className={`size-4 shrink-0 ${ICON_COLOR[tone]}`} />
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <Button
                  className="-my-1"
                  onClick={() => {
                    t.action!.onClick()
                    dismissToast(t.id)
                  }}
                >
                  {t.action.label}
                </Button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
