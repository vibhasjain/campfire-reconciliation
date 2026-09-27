import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { disableZoom } from "@/lib/no-zoom"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

disableZoom()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
