#!/usr/bin/env node
// Drives every version through Maya's core flows with dev-browser (Playwright page API).
// Usage: node tests/flows.mjs [--base http://localhost:4173] [--versions 1,2,3] [--flows keyboard,mouse,...] [--out results.json]
// Each flow runs on a fresh load with ?fast (simulated delays ≤150ms) and prints one JSON line per run.
import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const BASE = arg("base", "http://localhost:4173")
const VERSIONS = arg("versions", "1,2,3").split(",")
const FLOWS = arg("flows", "keyboard,mouse,thread,many,unreconcile,revert").split(",")

// Shared helpers injected into every dev-browser script (runs inside QuickJS, not Node).
const PRELUDE = (v, flow, width) => `
const page = await browser.getPage("cf-flows");
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) });
page.on("pageerror", (e) => errors.push(String(e)));
await page.setViewportSize({ width: ${width}, height: ${width > 600 ? 900 : 844} });
await page.goto("${BASE}/v${v}?fast", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__recon);
let keys = 0, clicks = 0;
const t0 = Date.now();
const press = async (k) => { keys++; await page.keyboard.press(k); await page.waitForTimeout(60) };
const click = async (loc, opts) => { clicks++; await loc.click(opts); await page.waitForTimeout(80) };
const summary = () => page.evaluate(() => window.__recon.summary());
const itemStatus = (id) => page.evaluate((id) => window.__recon.store.getState().items[id].status, id);
const selected = () => page.evaluate(() => window.__recon.ui.get().selectedItemId);
const select = (id) => page.evaluate((id) => window.__recon.ui.set((s) => ({ ...s, selectedItemId: id })), id);
const settle = async () => {
  for (let i = 0; i < 40; i++) {
    const s = await summary();
    if (!s.awaitingApproval) return;
    await page.waitForTimeout(100);
  }
};
const visible = (sel) => page.locator(sel).filter({ visible: true }).first();
// Open an item the way Maya would: click its row if the version shows one, else select it.
const openItem = async (id) => {
  const row = visible('[data-item-id="' + id + '"]');
  if (await row.count()) await click(row); else await select(id);
  await page.waitForTimeout(250);
};
const shot = async (name) => saveScreenshot(await page.screenshot(), "cf-flow-v${v}-${flow}-${width}-" + name + ".png");
const finish = async (ok, extra = {}) => {
  await settle();
  const s = await summary();
  const doneVisible = await page.locator('[data-testid="done"]').filter({ visible: true }).count();
  await shot("end");
  console.log("RESULT " + JSON.stringify({ v: ${v}, flow: "${flow}", width: ${width}, ok, ms: Date.now() - t0, keys, clicks,
    difference: s.difference, open: s.open, done: s.done, doneVisible, errors, ...extra }));
};
`

const SCRIPTS = {
  // Keyboard only: move to an open item, press A, repeat until done.
  keyboard: `
await shot("start");
for (let guard = 0; guard < 60; guard++) {
  const s = await summary();
  if (s.done || (s.open === 0 && !s.awaitingApproval)) break;
  let id = await selected();
  let hops = 0;
  while ((!id || (await itemStatus(id)) !== "open") && hops < 30) { await press(hops < 15 ? "j" : "k"); id = await selected(); hops++ }
  if (!id || (await itemStatus(id)) !== "open") break;
  await press("a");
  await page.waitForTimeout(150);
}
await finish(true);
`,
  // Mouse first: click an open item, click its visible Accept.
  mouse: `
await shot("start");
for (let guard = 0; guard < 60; guard++) {
  const s = await summary();
  if (s.done || (s.open === 0 && !s.awaitingApproval)) break;
  const accept = visible('[data-action="accept"]:not([disabled])');
  if (await accept.count()) { await click(accept); await page.waitForTimeout(150); continue }
  const openIds = await page.evaluate(() => Object.values(window.__recon.store.getState().items).filter((i) => i.kind === "exception" && i.status === "open").map((i) => i.id));
  let clicked = false;
  for (const id of openIds) {
    const row = visible('[data-item-id="' + id + '"]');
    if (await row.count()) { await click(row); clicked = true; break }
  }
  if (!clicked) break;
}
await finish(true);
`,
  // Thread: "none of these match" on Notion → Ember surfaces NTN-88213 → accept it in the thread.
  thread: `
await openItem("r04");
await press("c");
const box = visible('[contenteditable="true"]');
await box.waitFor({ timeout: 3000 });
await box.type("none of these match");
await press("Enter");
await visible('text=Found by Ember').waitFor({ timeout: 8000 });
await shot("candidate");
await press("Escape");
await press("a");
await page.waitForTimeout(300);
const source = await page.evaluate(() => window.__recon.store.getState().items.r04.resolution?.source);
await finish((await itemStatus("r04")) !== "open" && source === "ember", { r04: await itemStatus("r04"), source });
`,
  // Many-to-one: ⌘-click Cascade's deposit and 3 invoices, press M.
  many: `
await openItem("r12");
const ids = await page.evaluate(() => { const i = window.__recon.store.getState().items.r12; return [...i.bankIds, ...i.bookIds] });
let found = 0;
for (const id of ids) {
  const line = visible('[data-line-id="' + id + '"]');
  if (await line.count()) { await click(line, { modifiers: ["Meta"] }); found++ }
}
await shot("selected");
await press("m");
await page.waitForTimeout(300);
await finish((await itemStatus("r12")) === "resolved", { linesClicked: found, r12: await itemStatus("r12") });
`,
  // Unreconcile then re-accept Google Workspace.
  unreconcile: `
await select("r01");
await page.waitForTimeout(150);
await press("a");
await page.waitForTimeout(200);
const afterAccept = await itemStatus("r01");
await select("r01");
await press("u");
await page.waitForTimeout(200);
const afterUndo = await itemStatus("r01");
await select("r01");
await press("a");
await page.waitForTimeout(200);
const final = await itemStatus("r01");
await finish(afterAccept === "resolved" && afterUndo === "open" && final === "resolved", { afterAccept, afterUndo, final });
`,
  // Agent edit then Revert: "book this as a bank fee" on r02, then Revert the change card.
  revert: `
await openItem("r02");
await press("c");
const box = visible('[contenteditable="true"]');
await box.waitFor({ timeout: 3000 });
await box.type("book this as a bank fee");
await press("Enter");
const revert = visible('button:has-text("Revert")');
await revert.waitFor({ timeout: 8000 });
const booked = await itemStatus("r02");
await shot("changed");
await click(revert);
await page.waitForTimeout(300);
const reverted = await itemStatus("r02");
await finish(booked === "resolved" && reverted === "open", { booked, reverted });
`,
}

const results = []
for (const v of VERSIONS) {
  for (const flow of FLOWS) {
    for (const width of flow === "keyboard" || flow === "mouse" ? [1440, 390] : [1440]) {
      const run = spawnSync("dev-browser", ["--timeout", "120"], { input: PRELUDE(v, flow, width) + SCRIPTS[flow], encoding: "utf8", timeout: 180000 })
      const line = (run.stdout || "").split("\n").find((l) => l.startsWith("RESULT "))
      const r = line ? JSON.parse(line.slice(7)) : { v: Number(v), flow, width, ok: false, error: (run.stderr || run.stdout || "no output").slice(0, 400) }
      if (r.ok && (flow === "keyboard" || flow === "mouse")) r.ok = r.done && r.difference === 0 && r.doneVisible > 0
      if (r.errors?.length) r.ok = false
      results.push(r)
      console.log(JSON.stringify(r))
    }
  }
}
spawnSync("dev-browser", [], { input: 'await browser.closePage("cf-flows")', encoding: "utf8" })
const out = arg("out")
if (out) writeFileSync(out, JSON.stringify(results, null, 2))
const failed = results.filter((r) => !r.ok)
console.log(failed.length ? `FAILED ${failed.length}/${results.length}` : `ALL ${results.length} FLOW RUNS PASSED`)
process.exit(failed.length ? 1 : 0)
