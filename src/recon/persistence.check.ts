/// <reference types="node" />
import { spawnSync } from "node:child_process"
import { strict as assert } from "node:assert"
const mode = process.argv[2]
if (!mode) {
  const run = (mode: string, snapshot = "") => {
    const child = spawnSync(process.execPath, [...process.execArgv, import.meta.filename, mode], { encoding: "utf8", env: { ...process.env, DEMO_SNAPSHOT: snapshot } })
    assert.equal(child.status, 0, child.stderr)
    return child.stdout.trim()
  }
  const snapshot = run("save")
  run("restore", snapshot)
  run("fast", snapshot)
  run("other", snapshot)
  run("broken", "{invalid")
  run("denied", snapshot)
  console.log("ALL PERSISTENCE CHECKS PASSED")
} else {
  let raw = process.env.DEMO_SNAPSHOT || null
  let accesses = 0
  Object.assign(globalThis, { window: {
    location: { pathname: mode === "other" ? "/campfire2" : "/campfire1", search: mode === "fast" ? "?fast" : "", reload() {} },
    addEventListener() {},
    localStorage: {
      getItem(key: string) { accesses++; if (mode === "denied") throw Error("denied"); return key === "campfire:/campfire1" ? raw : null },
      setItem(_key: string, value: string) { accesses++; if (mode === "denied") throw Error("denied"); raw = value },
      removeItem() { accesses++; raw = null },
    },
  } })
  const { recon, reconUi } = await import("./useRecon")
  const { db, nextId } = await import("@/data/store")
  const { comments, appendThreadMessage, setThreadResolved } = await import("@/comments/store")
  const { flushDemo } = await import("@/data/persistence")
  if (mode === "save") {
    recon.accept("r06", recon.getState().items.r06.suggestions[0].id)
    recon.reject("r08", recon.getState().items.r08.suggestions[0].id)
    appendThreadMessage("r04", "Persist this comment")
    setThreadResolved("r04")
    db.set(s => ({ ...s, chats: { ...s.chats, page: { id: "page", title: "Page", status: "running", createdAt: "", updatedAt: "", createdBy: "maya", unread: false, context: [] } }, messages: { ...s.messages, msg_900: { id: "msg_900", chatId: "page", role: "assistant", createdAt: "", parts: [{ type: "text", markdown: "Partial", streaming: true }] } }, approvals: { apr_901: { id: "apr_901", chatId: "page", title: "Review", createdAt: "", createdBy: "ember", rows: [{ id: "r01", label: "Google", state: "pending" }] } } }))
    reconUi.set(s => ({ ...s, completed: true }))
    flushDemo()
    console.log(raw)
  } else if (mode === "restore") {
    assert.equal(recon.getState().items.r06.status, "resolved")
    assert.equal(recon.getState().items.r08.suggestions.length, 1)
    assert.equal(reconUi.get().completed, true)
    assert(Object.values(db.get().messages).some(m => m.text === "Persist this comment"))
    assert.equal(comments.get().threads["thread:r04"].resolved, true)
    assert.equal(db.get().chats.page.status, "idle")
    const restoredPart = db.get().messages.msg_900.parts[0]
    assert.equal(restoredPart.type === "text" && restoredPart.streaming, false)
    assert.equal(db.get().approvals.apr_901.rows[0].state, "dismissed")
    assert.equal(nextId("msg"), "msg_902")
  } else {
    assert.equal(recon.getState().items.r06.status, "open")
    assert.equal(reconUi.get().completed, false)
    flushDemo()
    if (mode === "fast") assert.equal(accesses, 0)
  }
}
