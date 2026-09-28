import { TooltipProvider } from "@/components/ui/tooltip"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { loadApp } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"


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
