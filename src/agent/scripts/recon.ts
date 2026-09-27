import type { SendInput, RunCtx, Script } from "../types"
import type { ActionRecord, Suggestion } from "@/recon/data"
import type { Result } from "@/recon/store"
import { fmtDate, fmtMoney, summarize } from "@/recon/store"
import { recon, reconUi, itemAmount } from "@/recon/useRecon"
import {
  acceptSuggestion,
  activeSuggestion,
  flushApprovals,
} from "@/recon/actions"

const textFor = (input: SendInput) =>
  input.text.replace(/\[\[[^:]+:([^\]]+)\]\]/g, "@$1").trim()
export function contextItemId(input: SendInput): string | undefined {
  return (
    input.context.find((ref) => ref.type === "reconItem")?.id ??
    (input.chatId?.startsWith("thread:") ? input.chatId.slice(7) : undefined)
  )
}
type Intent =
  | "search"
  | "stripe"
  | "fee"
  | "split"
  | "explain"
  | "edit"
  | "remove"
  | "left"
  | "bulk"
  | "outstanding"
  | "entry"
  | "fallback"
function intentFor(input: SendInput): Intent {
  const text = textFor(input).toLowerCase()
  if (/stripe/.test(text) && /28|payout|pull|find/.test(text)) return "stripe"
  if (!contextItemId(input)) {
    if (/accept\s+(everything|all).*(above|over|at least|90)/.test(text))
      return "bulk"
    if (/what.?s left|what is left|remaining|open items/.test(text))
      return "left"
    return "fallback"
  }
  if (
    /none of these|not this one|find another|search (again|for)|other candidate/.test(
      text
    )
  )
    return "search"
  if (/bank (fee|charge)|book this as.*fee/.test(text)) return "fee"
  if (/split across|three invoices|these invoices/.test(text)) return "split"
  if (/\bwhy\b|\bexplain\b|confidence/.test(text)) return "explain"
  if (/change (the )?(description|date)|date should be/.test(text))
    return "edit"
  if (/\bdrop\b|remove.*(one|candidate|suggestion)/.test(text)) return "remove"
  if (
    /mark (it|this|the check).*outstanding|leave (it|this|the check).*outstanding/.test(
      text
    )
  )
    return "outstanding"
  if (
    /book (it|this).*new entry|create (a |an )?(new )?(journal )?entry/.test(
      text
    )
  )
    return "entry"
  return "fallback"
}
/** Plain teammate comments stay comments; only a recognized instruction beats fallback. */
export function reconIntentScore(input: SendInput): number {
  return intentFor(input) === "fallback" ? 1 : 100
}

/** Headless discovery helper: both disclosure and the added candidate enter the audit log. */
export function discoverCandidates(itemId: string): {
  candidates: Suggestion[]
  actions: ActionRecord[]
} {
  const before = recon.getState().actions.length
  const surfaced = recon.getState().items[itemId]?.surfacedIds ?? []
  const candidates = recon.ember
    .search(itemId)
    .filter((candidate) => !surfaced.includes(candidate.id))
  for (const candidate of candidates) {
    if (
      !recon
        .getState()
        .items[itemId]?.suggestions.some(
          (visible) => visible.id === candidate.id
        )
    )
      recon.addSuggestion(itemId, candidate, "ember")
  }
  if (candidates[0]) {
    const index =
      recon
        .getState()
        .items[itemId]?.suggestions.findIndex(
          (candidate) => candidate.id === candidates[0].id
        ) ?? 0
    reconUi.set((state) => ({
      ...state,
      suggestionIndex: {
        ...state.suggestionIndex,
        [itemId]: Math.max(0, index),
      },
    }))
  }
  return { candidates, actions: recon.getState().actions.slice(before) }
}
export function bookFee(itemId: string): Result {
  const item = recon.getState().items[itemId]
  if (!item) return { ok: false, reason: "Item not found" }
  if (itemId === "r08")
    return acceptSuggestion(
      itemId,
      item.suggestions.find(
        (s) =>
          s.action === "match_adjust" &&
          s.entries?.some((entry) => entry.account.startsWith("6820"))
      )?.id,
      "ember"
    )
  if (!item.bankIds.length || item.bookIds.length)
    return {
      ok: false,
      reason: "Select a bank-only item to create a bank-fee entry.",
    }
  return recon.createEntry(
    itemId,
    { account: "6820 · Bank Service Charges", amount: itemAmount(item) },
    "ember"
  )
}
export function editFromInstruction(itemId: string, text: string): Result {
  const item = recon.getState().items[itemId]
  if (!item) return { ok: false, reason: "Item not found" }
  const preferBooks = /\b(book|books|journal|invoice)\b/i.test(text)
  const side =
    preferBooks && item.bookIds.length
      ? "book"
      : item.bankIds.length
        ? "bank"
        : "book"
  const id = (side === "bank" ? item.bankIds : item.bookIds)[0]
  if (!id)
    return { ok: false, reason: "This item has no transaction line to edit." }
  const description = text
    .match(/change (?:the )?description to\s+([\s\S]+)/i)?.[1]
    ?.trim()
    .replace(/^["“]|["”]$/g, "")
  if (description)
    return recon.editField({ side, id }, "description", description, "ember")
  const date = text.match(
    /(?:date should be|change (?:the )?date to)\s+(?:(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?)/i
  )
  if (date) {
    const year = date[1] ?? (date[6] ? date[6].padStart(4, "20") : "2026")
    const month = date[2] ?? date[4].padStart(2, "0")
    const day = date[3] ?? date[5].padStart(2, "0")
    return recon.editField(
      { side, id },
      "date",
      `${year}-${month}-${day}`,
      "ember"
    )
  }
  return { ok: false, reason: "Tell me the description or date to use." }
}
export function removeFromInstruction(itemId: string, text: string): Result {
  const item = recon.getState().items[itemId]
  if (!item) return { ok: false, reason: "Item not found" }
  const ordinal = /second|2nd/.test(text)
    ? 1
    : /third|3rd/.test(text)
      ? 2
      : /first|1st/.test(text)
        ? 0
        : undefined
  const named = text
    .replace(/^.*?\b(drop|remove)\s+/i, "")
    .toLowerCase()
    .trim()
  const suggestion =
    ordinal !== undefined
      ? item.suggestions[ordinal]
      : (item.suggestions.find(
          (s) =>
            s.title.toLowerCase().includes(named) ||
            s.id.toLowerCase().includes(named)
        ) ?? activeSuggestion(itemId))
  return suggestion
    ? recon.removeSuggestion(itemId, suggestion.id, "ember")
    : { ok: false, reason: "That candidate is no longer visible." }
}
function changeCard(ctx: RunCtx, action: ActionRecord) {
  ctx.card({
    kind: "recon-change",
    actionId: action.id,
    label: action.label,
    detail: action.itemId
      ? recon.getState().items[action.itemId]?.title
      : undefined,
  })
}
async function showResult(ctx: RunCtx, result: Result, success: string) {
  if (!result.ok) {
    await ctx.say(result.reason)
    return
  }
  const action = recon
    .getState()
    .actions.find((candidate) => candidate.id === result.actionId)
  if (action) changeCard(ctx, action)
  await ctx.say(success)
}
async function tool(ctx: RunCtx, label: string, rows?: string[][]) {
  ctx.status(label)
  const step = ctx.step("search", label)
  if (rows) step.rows(rows)
  await ctx.wait(420)
  step.done()
}
const escapeCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ")
function confidenceTable(suggestion: Suggestion): string {
  const rows = suggestion.factors.map(
    (factor) =>
      `| ${factor.label} | ${escapeCell(factor.detail)} | ${(factor.weight * 100).toFixed(0)}% | ${(factor.score * 100).toFixed(1)}% | ${(factor.weight * factor.score * 100).toFixed(2)}% |`
  )
  return `**Why ${suggestion.confidence}%?**\n\n| Factor | Detail | Weight | Score | Contribution |\n| --- | --- | ---: | ---: | ---: |\n${rows.join("\n")}\n| **Total** | Rounded weighted score | 100% | | **${suggestion.confidence}%** |`
}
function openItems() {
  return Object.values(recon.getState().items).filter(
    (item) => item.status !== "resolved"
  )
}

export const reconciliationScript: Script = {
  id: "reconciliation",
  match: reconIntentScore,
  async run(ctx) {
    const intent = intentFor(ctx.input)
    const itemId = contextItemId(ctx.input)
    const item = itemId ? recon.getState().items[itemId] : undefined
    await ctx.thinking(420)
    if (intent === "stripe") {
      await tool(ctx, "Searching reconciled Stripe payouts", [
        ["Date", "September 28"],
        ["Source", "Bank and general ledger"],
      ])
      const found = recon.findAuto({ date: "2026-09-28", text: "stripe" })
      for (const match of found)
        ctx.card({ kind: "recon-item", itemId: match.id })
      await ctx.say(
        found.length
          ? "Here is the Stripe payout from September 28."
          : "No reconciled Stripe payout is dated September 28."
      )
      return
    }
    if (intent === "left") {
      const items = openItems()
      await tool(ctx, "Reading remaining reconciliation items")
      const rows = items.map((row) => {
        const top = row.suggestions[0]
        return `| ${escapeCell(row.title)} | ${fmtMoney(itemAmount(row))} | ${escapeCell(top?.title ?? "Review needed")} | ${top ? `${top.confidence}%` : "—"} |`
      })
      const summary = summarize(recon.getState())
      await ctx.say(
        items.length
          ? `| Item | Amount | Top suggestion | Confidence |\n| --- | ---: | --- | ---: |\n${rows.join("\n")}\n\n**Difference: ${fmtMoney(summary.difference)}** · ${items.length} left.`
          : `All items are reconciled. **Difference: ${fmtMoney(summary.difference)}.**`
      )
      return
    }
    if (intent === "bulk") {
      const items = openItems().filter(
        (row) =>
          row.status === "open" && (row.suggestions[0]?.confidence ?? 0) >= 90
      )
      if (!items.length) {
        await ctx.say(
          "There are no open suggestions at 90% confidence or above."
        )
        return
      }
      await tool(
        ctx,
        `Comparing ${items.length} high-confidence suggestions`,
        items.map((row) => [
          row.title,
          fmtMoney(itemAmount(row)),
          `${row.suggestions[0].confidence}%`,
        ])
      )
      const approval = await ctx.approve({
        title: `Accept ${items.length} suggestions at 90% or above?`,
        rows: items.map((row) => ({
          id: row.id,
          label: row.title,
          detail: `${fmtMoney(itemAmount(row))} · ${row.suggestions[0].confidence}% · ${row.suggestions[0].title}`,
          state: "pending",
        })),
      })
      let acceptedCount = 0
      for (const id of approval.approved) {
        const reviewed = items.find((row) => row.id === id)!
        const result = acceptSuggestion(id, reviewed.suggestions[0].id, "ember")
        if (result.ok) {
          acceptedCount += 1
          const action = recon
            .getState()
            .actions.find((candidate) => candidate.id === result.actionId)
          if (action) changeCard(ctx, action)
        } else await ctx.say(`${reviewed.title}: ${result.reason}`)
      }
      await flushApprovals()
      await ctx.say(
        `Accepted ${acceptedCount} suggestions. The difference is now **${fmtMoney(summarize(recon.getState()).difference)}**.`
      )
      return
    }
    if (!item || !itemId) {
      await reconciliationFallback.run(ctx)
      return
    }
    if (intent === "search") {
      await tool(ctx, "Searching AP inbox, bills and GL ±30 days", [
        ["Amount", fmtMoney(itemAmount(item))],
        ["Payee", item.title],
      ])
      const { candidates, actions } = discoverCandidates(itemId)
      for (const action of actions) changeCard(ctx, action)
      if (candidates.length) {
        await tool(
          ctx,
          `Comparing ${item.suggestions.length + candidates.length} candidates`,
          candidates.map((candidate) => [
            candidate.invoiceNumber ?? candidate.title,
            `${candidate.confidence}%`,
          ])
        )
        for (const candidate of candidates)
          ctx.card({
            kind: "recon-candidate",
            itemId,
            suggestionId: candidate.id,
          })
        await ctx.say("Is this the one?")
      } else {
        await ctx.say(
          `I searched the AP inbox, bills and GL within 30 days and found no additional match. ${item.bankIds.length && !item.bookIds.length ? "I can book it as a new entry." : !item.bankIds.length && item.bookIds.length ? "I can mark it outstanding." : "I can edit a line or compare a manual selection."}`
        )
      }
      return
    }
    if (intent === "explain") {
      const suggestion = activeSuggestion(itemId)
      if (!suggestion) {
        await ctx.say(
          "There are no visible suggestions to explain. I can search for another candidate."
        )
        return
      }
      const weakest = [...suggestion.factors].sort(
        (a, b) => a.score - b.score
      )[0]
      await tool(ctx, "Inspecting the confidence factors")
      await ctx.say(
        `${confidenceTable(suggestion)}\n\nStronger ${weakest.label.toLowerCase()} evidence would raise confidence.`
      )
      return
    }
    if (intent === "fee") {
      await tool(ctx, "Preparing the bank-fee entry")
      await showResult(
        ctx,
        bookFee(itemId),
        itemId === "r08"
          ? "Recorded the proposed wire-fee adjustment and requested Daniel’s approval."
          : "Booked the bank fee to 6820 · Bank Service Charges."
      )
      return
    }
    if (intent === "split") {
      const suggestion = item.suggestions.find(
        (candidate) => candidate.action === "match_many"
      )
      if (!suggestion) {
        await ctx.say(
          "This item has no supported many-to-one match. Select the bank line and the invoice lines to compare their totals."
        )
        return
      }
      await tool(
        ctx,
        "Comparing invoice totals",
        item.bookIds.map((id) => {
          const line = recon.getState().bookLines[id]
          return [line.reference ?? line.description, fmtMoney(line.amount)]
        })
      )
      await showResult(
        ctx,
        acceptSuggestion(itemId, suggestion.id, "ember"),
        "Matched the receipt across all three invoices."
      )
      return
    }
    if (intent === "edit" || intent === "remove") {
      await tool(
        ctx,
        intent === "edit"
          ? "Updating the transaction detail"
          : "Removing the candidate"
      )
      await showResult(
        ctx,
        intent === "edit"
          ? editFromInstruction(itemId, textFor(ctx.input))
          : removeFromInstruction(itemId, textFor(ctx.input)),
        intent === "edit"
          ? "Updated the line. The change is recorded in the audit trail."
          : "Removed that candidate. The remaining suggestions are ready to review."
      )
      return
    }
    if (intent === "outstanding") {
      const suggestion = item.suggestions.find(
        (candidate) => candidate.action === "outstanding"
      )
      if (!suggestion) {
        await ctx.say(
          "This item has no outstanding-check suggestion. I can explain its timing treatment."
        )
        return
      }
      await showResult(
        ctx,
        acceptSuggestion(itemId, suggestion.id, "ember"),
        "Marked the check outstanding for September."
      )
      return
    }
    if (intent === "entry") {
      const suggestion = activeSuggestion(itemId)
      const account = suggestion?.entries?.find(
        (entry) => !entry.account.startsWith("1010")
      )?.account
      if (!account) {
        await ctx.say("Tell me the account to use for the new entry.")
        return
      }
      await showResult(
        ctx,
        recon.createEntry(
          itemId,
          { account, amount: itemAmount(item) },
          "ember"
        ),
        `Booked the new entry to ${account}.`
      )
      return
    }
    await reconciliationFallback.run(ctx)
  },
}
export const reconciliationFallback: Script = {
  id: "fallback",
  match: () => 1,
  async run(ctx) {
    const itemId = contextItemId(ctx.input)
    const item = itemId ? recon.getState().items[itemId] : undefined
    if (!item) {
      await ctx.say(
        "- Show what’s left and the current difference.\n- Find a reconciled payout or explain a suggestion.\n- Accept high-confidence suggestions after your review."
      )
      return
    }
    const state = recon.getState()
    const summarizeSide = (side: "bank" | "book") => {
      const ids = side === "bank" ? item.bankIds : item.bookIds
      const lines = ids.map((id) =>
        side === "bank" ? state.bankLines[id] : state.bookLines[id]
      )
      return lines.length
        ? `${side === "bank" ? "Bank" : "Books"}: ${fmtMoney(lines.reduce((total, line) => total + line.amount, 0))} · ${[...new Set(lines.map((line) => fmtDate(line.date)))].join(", ")}`
        : `No ${side === "bank" ? "bank" : "book"} line`
    }
    const suggestion = activeSuggestion(item.id)
    const awaiting =
      item.status === "awaiting_approval"
        ? "\n\nDaniel’s approval is pending."
        : ""
    await ctx.say(
      `**${item.title}**\n\n${summarizeSide("bank")} · ${summarizeSide("book")}.${awaiting}\n\n${suggestion ? `Top suggestion: **${suggestion.title}** (${suggestion.confidence}%).` : "There are no visible suggestions."}\n\n- Search for another candidate.\n- Explain the confidence factors.\n- ${!item.bankIds.length && item.bookIds.length ? "Mark the check outstanding." : "Edit the description or date."}`
    )
  },
}
