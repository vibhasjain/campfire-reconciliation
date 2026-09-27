import { useEffect, type ReactNode } from "react"

/** Campfire prototypes always use the light palette, regardless of OS settings. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
    document.documentElement.style.colorScheme = "light"
  }, [])
  return children
}
