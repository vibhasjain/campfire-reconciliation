import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { loadApp } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"


loadApp().then((App) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
})
