import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Connect, type Plugin } from "vite"

function versionRoutes(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const [pathname, query] = (req.url ?? "").split("?", 2)
    if (/^\/(v[123]|version-control|references|concepts)(\/[^.]*)?$/.test(pathname)) {
      req.url = `/index.html${query ? `?${query}` : ""}`
    }
    next()
  }
  return {
    name: "campfire-version-routes",
    configureServer(server) { server.middlewares.use(rewrite) },
    configurePreviewServer(server) { server.middlewares.use(rewrite) },
  }
}

export default defineConfig({
  // Local lanes can verify builds without writing into the parent site's output.
  build: { outDir: process.env.CAMPFIRE_OUT_DIR ?? "dist", emptyOutDir: true },
  plugins: [versionRoutes(), react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
