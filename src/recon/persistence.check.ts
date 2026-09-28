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
  assert.equal(JSON.parse(snapshot).schema, 2)
  run("restore", snapshot)
  const stale = JSON.parse(snapshot)
  stale.schema = 1
  stale.slices.comments.threads = {}
  stale.slices.db.messages = {}
  run("stale", JSON.stringify(stale))
  run("fast", snapshot)
  run("other", snapshot)
  run("broken", "{invalid")
  run("denied", snapshot)
  console.log("ALL PERSISTENCE CHECKS PASSED")
} else {
  let raw = process.env.DEMO_SNAPSHOT || null
  let accesses = 0
  Object.assign(globalThis, { window: {
    location: { pathname: mode === "other" ? "/v2" : "/v1", search: mode === "fast" ? "?fast" : "", reload() {} },
    addEventListener() {},
    localStorage: {
      getItem(key: string) { accesses++; if (mode === "denied") throw Error("denied"); return key === "campfire:/v1" ? raw : null },
      setItem(_key: string, value: string) { accesses++; if (mode === "denied") throw Error("denied"); raw = value },
      removeItem() { accesses++; raw = null },
    },
  } })
  const { recon, reconUi } = await import("./useRecon")
  const { db, nextId } = await import("@/data/store")
  const { comments, appendThreadMessage, setThreadResolved, seedThreads, messageSnippet } = await import("@/comments/store")
  const { flushDemo } = await import("@/data/persistence")
  // Coverage and idempotence apply to fresh, restored and invalidated snapshots.
  const before = JSON.stringify({ db: db.get(), comments: comments.get() })
  seedThreads()
  assert.equal(JSON.stringify({ db: db.get(), comments: comments.get() }), before)
  let exchanges = 0
  let seedCount = 0
  for (const item of Object.values(recon.getState().items)) {
    const chatId = `thread:${item.id}`
    const messages = Object.values(db.get().messages).filter(m =>
      m.chatId === chatId && (m.id.startsWith("seed-") || m.id.startsWith("message-r")))
    assert(messages.length >= 1 && messages.length <= 4, `${item.id}: missing or overlong seed`)
    assert(comments.get().threads[chatId])
    seedCount += messages.length
    if (messages.length > 1) {
      exchanges++
      assert(new Set(messages.map(m => m.author)).size > 1)
    }
    let previous = 0
    for (const message of messages) {
      const at = Date.parse(message.createdAt)
      assert(at > previous && at >= Date.parse("2026-09-01") && at < Date.parse("2026-10-06"))
      previous = at
      assert(message.author && recon.getState().teammates[message.author])
      assert(messageSnippet(message).length > 0)
      if (message.author === "ember") {
        const text = message.parts.filter(p => p.type === "text").map(p => p.markdown).join(" ")
        assert(text.length < 200 && !text.includes("\n"))
      }
      for (const [, type, id] of (message.text ?? "").matchAll(/\[\[(agent|member):([^\]]+)\]\]/g))
        assert(message.mentions?.some(ref => ref.type === type && ref.id === id))
    }
  }
  assert.equal(Object.keys(comments.get().threads).length, 221)
  assert.equal(seedCount, 333)
  assert.equal(exchanges, 111)
  if (mode === "stale") {
    assert.equal(comments.get().threads["thread:r04"].resolved, false)
    assert(!Object.values(db.get().messages).some(m => m.text === "Persist this comment"))
    assert.equal(db.get().chats.page, undefined)
  }
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
