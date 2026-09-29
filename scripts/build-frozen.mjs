// Rebuild committed Code snapshots without changing this checkout or its Git metadata.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, readdirSync, statSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const read = (file) => readFileSync(file, "utf8")
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: "inherit" })
const compiled = ts.transpileModule(read(join(root, "src/site/versions.ts")), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { VERSIONS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)
const versions = VERSIONS.filter((v) => v.medium === "Code" && v.commit)
if (!versions.length) throw new Error("No frozen Code commits found")
for (const { version, commit } of versions) {
  if (!/^\d+\.\d+$/.test(version) || !/^[a-f0-9]{7,40}$/.test(commit)) {
    throw new Error(`Unsafe version or commit: ${version}`)
  }
}

// Reuse just today's logo link and tag, preserving all other historical sidebar behavior.
const sidebar = read(join(root, "src/app/sidebar/AppSidebar.tsx"))
const logo = sidebar.match(/<a\s+href="\/version-control"[\s\S]*?<\/a>/)?.[0]
if (!logo || /Tooltip|title=/.test(logo)) throw new Error("Expected today's logo link without a tooltip")
for (const asset of ["campfire-logo.svg", "favicon.svg"]) {
  if (!existsSync(join(root, "public", asset))) throw new Error(`Missing shared asset: ${asset}`)
}

function patch(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Patch no longer matches exactly once: ${file}`)
  writeFileSync(file, source.replace(before, after))
}

function size(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const path = join(directory, entry.name)
    if (entry.name.endsWith(".map")) throw new Error(`Unexpected source map: ${path}`)
    return total + (entry.isDirectory() ? size(path) : statSync(path).size)
  }, 0)
}

const temporary = mkdtempSync(join(tmpdir(), "campfire-frozen-"))
const manager = join(temporary, "repository")
let total = 0
try {
  // Shared objects avoid copying history; worktree registration stays entirely in OS temp.
  run("git", ["clone", "--shared", "--no-checkout", root, manager])
  for (const { version, commit, links } of versions) {
    const worktree = join(temporary, `code-${version}`)
    const output = join(root, "public/code", version)
    const base = `/code/${version}/`
    run("git", ["worktree", "add", "--detach", worktree, commit], manager)
    try {
      const app = join(worktree, "src/App.tsx")
      const routes = [...read(app).matchAll(/href="\/(campfire[123])"/g)].map((m) => m[1])
      if (routes.join(",") !== "campfire1,campfire2,campfire3" ||
          links.some((link, index) => link.href !== `${base}${routes[index]}`)) {
        throw new Error(`Inspect and update the route patch for ${version}`)
      }
      patch(app, "const route = location.pathname.match", [
        "const base = import.meta.env.BASE_URL",
        "  const pathname = location.pathname.startsWith(base)",
        '    ? "/" + location.pathname.slice(base.length)',
        "    : location.pathname",
        "  const route = pathname.match",
      ].join("\n"))
      for (const route of routes) patch(app, `href="/${route}"`, `href={import.meta.env.BASE_URL + "${route}"}`)
      const oldSidebar = join(worktree, "src/app/sidebar/AppSidebar.tsx")
      const oldLogo = read(oldSidebar).match(/<img\s+src="\/campfire\/campfire-logo.png"[\s\S]*?\/>/)?.[0]
      if (!oldLogo) throw new Error(`Inspect the sidebar logo for ${version}`)
      patch(oldSidebar, oldLogo, logo)
      writeFileSync(oldSidebar, 'import { CampfireTag } from "@/components/common/CampfireTag"\n' + read(oldSidebar))
      writeFileSync(join(worktree, "src/components/common/CampfireTag.tsx"), read(join(root, "src/components/common/CampfireTag.tsx")))
      patch(join(worktree, "index.html"), 'href="/campfire/favicon.svg"', 'href="%BASE_URL%favicon.svg"')

      // Vite's default is no maps; explicitly override config too, for future snapshots.
      const config = join(worktree, "vite.config.ts")
      patch(config, "build: {", "build: { sourcemap: false,")
      const modules = join(worktree, "node_modules")
      symlinkSync(join(root, "node_modules"), modules, "dir")
      const build = () => run(process.execPath, [join(modules, "vite/bin/vite.js"), "build", "--base", base, "--outDir", output, "--emptyOutDir"], worktree)
      try {
        build()
      } catch {
        // Unlink first so npm cannot modify the owner's dependencies through the symlink.
        unlinkSync(modules)
        run("npm", ["ci"], worktree)
        build()
      }
      if (!existsSync(join(output, "index.html"))) throw new Error(`Missing output for ${version}`)
      const bytes = size(output)
      total += bytes
      console.log(`${version} | ${commit} | ${routes.join(", ")} | base routing + logo/tag + favicon | ${bytes} bytes`)
    } finally {
      run("git", ["worktree", "remove", "--force", worktree], manager)
    }
  }
  console.log(`Frozen Code total: ${total} bytes (${(total / 1024 / 1024).toFixed(2)} MiB)`)
} finally {
  // This is exclusively the mkdtemp directory above. Vite only empties public/code/<version>.
  rmSync(temporary, { recursive: true, force: true })
}
