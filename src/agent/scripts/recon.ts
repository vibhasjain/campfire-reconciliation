import { appendThreadMessage } from "@/comments/store"
import type { ReconCandidateCard } from "@/recon/cards"
import type { SendInput, RunCtx, Script } from "../types"
import { emberExchanges, emberFollowUps, suggestionSummary, type ActionRecord, type Suggestion } from "@/recon/data"
import type { Result } from "@/recon/store"
import { fmtMoney, summarize } from "@/recon/store"
import { recon, reconUi, itemAmount, queueItems } from "@/recon/useRecon"
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
/** Action history survives rejection, undo and reload; demo reset clears it. */
export function addEmberFollowUp(itemId: string): Suggestion | undefined {
  const candidate = emberFollowUps[itemId]
  const state = recon.getState()
  if (!candidate || state.items[itemId]?.status !== "open" || state.actions.some(
    action => action.itemId === itemId && action.kind === "addSuggestion" &&
      action.label === `Added suggestion: ${candidate.title}`
  )) return
  const result = recon.addSuggestion(itemId, candidate, "ember", "first")
  if (!result.ok) return
  reconUi.set(state => ({
    ...state,
    suggestionIndex: { ...state.suggestionIndex, [itemId]: 0 },
  }))
  return candidate
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
async function tool(
  ctx: RunCtx,
  label: string,
  rows?: string[][],
  collapse = true
) {
  ctx.status(label)
  const step = ctx.step("search", label)
  if (rows) step.rows(rows)
  await ctx.wait(420)
  step.done()
  if (collapse)
    ctx.collapse(
      label.replace(
        /^(Searching|Reading|Comparing|Inspecting|Preparing|Updating|Removing)/,
        (verb) =>
          ({
            Searching: "Searched",
            Reading: "Read",
            Comparing: "Compared",
            Inspecting: "Inspected",
            Preparing: "Prepared",
            Updating: "Updated",
            Removing: "Removed",
          })[verb]!
      )
    )
}
function confidenceExplanation(suggestion: Suggestion): string {
  return suggestionSummary(suggestion)
}

function openItems() {
  return queueItems(recon.getState()).filter(
    (item) => item.status !== "resolved"
  )
}
export function compactItems(items: ReturnType<typeof openItems>): string {
  const first = items[0]
  if (!first) return "All items are reconciled."
  return `${items.length} ${items.length === 1 ? "item remains" : "items remain"}, starting with ${first.title} for ${fmtMoney(itemAmount(first))}.`
}

async function saySnapshot(ctx: RunCtx, markdown: string) {
  const clock = recon.getState().clock
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  await ctx.say(`${markdown} (As of ${time})`, { snapshot: { clock, question: ctx.input.text } })
}

// Shared across item threads for this session; a reload starts at suggestion again.
let emberTurn = 0
async function itemThreadReply(ctx: RunCtx, itemId: string): Promise<boolean> {
  const exchange = emberExchanges[itemId]
  if (!exchange) return false
  let useCase = emberTurn++ % 4
  if (useCase === 0) {
    const followUp = addEmberFollowUp(itemId)
    if (followUp) {
      // "Got it." only acknowledges context the user actually typed (a bare @Ember gets straight to it).
      const typed = ctx.input.text.replace(/\[\[[^\]]+\]\]/g, "").trim()
      await ctx.say(`${typed ? "Got it. " : ""}Here's a new suggestion: ${followUp.title}. It's up top.`)
      return true
    }
    useCase = emberTurn++ % 4
  }
  if (useCase === 1) await ctx.say(exchange.answer)
  else if (useCase === 2) {
    await ctx.say(`[[member:${exchange.teammate}]] ${exchange.ask}`)
    await ctx.wait(2000)
    appendThreadMessage(itemId, exchange.reply, exchange.teammate)
  } else await ctx.say(exchange.history)
  return true
}

export const reconciliationScript: Script = {
  id: "reconciliation",
  match: reconIntentScore,
  async run(ctx) {
    const itemId = contextItemId(ctx.input)
    const item = itemId ? recon.getState().items[itemId] : undefined
    await ctx.thinking(420)
    if (itemId && ctx.input.chatId?.startsWith("thread:") && await itemThreadReply(ctx, itemId)) return
    const intent = intentFor(ctx.input)
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
          ? "Found the September 28 Stripe payout."
          : "No reconciled Stripe payout is dated September 28."
      )
      return
    }
    if (intent === "left") {
      await tool(ctx, "Reading remaining reconciliation items")
      const items = openItems()
      const summary = summarize(recon.getState())
      await saySnapshot(ctx,
        `${compactItems(items)} The difference is ${fmtMoney(summary.difference)}.`
      )
      return
    }
    if (intent === "bulk") {
      const items = openItems().filter(
        (row) =>
          row.status === "open" && (row.suggestions[0]?.confidence ?? 0) >= 90
      )
      if (!items.length) {
        await saySnapshot(ctx,
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
      await saySnapshot(ctx,
        `Accepted ${acceptedCount} suggestions. The difference is now ${fmtMoney(summarize(recon.getState()).difference)}.`
      )
      return
    }
    if (!item || !itemId) {
      await reconciliationFallback.run(ctx)
      return
    }
    if (intent === "search") {
      await tool(
        ctx,
        "Searching AP inbox, bills and GL ±30 days",
        [
          ["Amount", fmtMoney(itemAmount(item))],
          ["Payee", item.title],
        ],
        false
      )
      const { candidates, actions } = discoverCandidates(itemId)
      if (candidates.length) {
        await tool(
          ctx,
          `Comparing ${item.suggestions.length + candidates.length} candidates`,
          candidates.map((candidate) => [
            candidate.invoiceNumber ?? candidate.title,
            `${candidate.confidence}%`,
          ]),
          false
        )
        ctx.collapse("Searched the AP inbox, bills and GL ±30 days")
        for (const candidate of candidates) {
          const card: ReconCandidateCard = {
            kind: "recon-candidate",
            itemId,
            suggestionId: candidate.id,
            actionId: actions.find(
              (action) =>
                action.kind === "addSuggestion" &&
                action.label === `Added suggestion: ${candidate.title}`
            )?.id,
          }
          if (ctx.input.chatId?.startsWith("thread:") && card.actionId) ctx.card({
            kind: "recon-change", actionId: card.actionId, itemId, suggestionId: candidate.id,
            label: `Added ${candidate.title} (${candidate.confidence}%) as the top suggestion`,
          })
          else ctx.card(card)
        }
        if (!ctx.input.chatId?.startsWith("thread:")) await ctx.say("Is this the one?")
      } else {
        ctx.collapse("Searched the AP inbox, bills and GL ±30 days")
        await ctx.say("No additional match found.")
      }
      return
    }
    if (intent === "explain") {
      const suggestion = activeSuggestion(itemId)
      if (!suggestion) {
        await ctx.say(
          "No suggestions are visible. Want me to search for a match?"
        )
        return
      }
      await tool(ctx, "Reading the supporting transactions")
      await ctx.say(confidenceExplanation(suggestion))
      return
    }
    if (intent === "fee") {
      await tool(ctx, "Preparing the bank-fee entry")
      await showResult(
        ctx,
        bookFee(itemId),
        itemId === "r08"
          ? "Recorded the $25 wire-fee adjustment for Daniel’s approval."
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
          "No invoice-group suggestion is available. Select the bank and invoice lines to compare totals."
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
        intent === "edit" ? "Updated the line." : "Removed that candidate."
      )
      return
    }
    if (intent === "outstanding") {
      const suggestion = item.suggestions.find(
        (candidate) => candidate.action === "outstanding"
      )
      if (!suggestion) {
        await ctx.say(
          "There’s no outstanding-check suggestion for this item."
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
    const suggestion = item?.suggestions[0] ?? (!item ? openItems()[0]?.suggestions[0] : undefined)
    await ctx.say(
      suggestion
        ? `I'd go with '${suggestion.title}' at ${suggestion.confidence}%.`
        : item
          ? "No suggestions are visible. Want me to search for a match?"
          : openItems().length
            ? "No suggestions are visible for the next open item."
            : "All items are reconciled."
    )
  },
}
