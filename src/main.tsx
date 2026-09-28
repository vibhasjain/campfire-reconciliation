import { TooltipProvider } from "@/components/ui/tooltip"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { loadApp } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"


// Focus rings only while Tab-navigating (see index.css).
const root = document.documentElement
addEventListener("keydown", (event) => { if (event.key === "Tab") root.dataset.tabFocus = "" }, true)
addEventListener("pointerdown", () => { delete root.dataset.tabFocus }, true)

loadApp().then((App) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>
  )
})
