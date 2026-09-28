import { seed as defaultSeed } from "./data.ts"
import type {
  ActionBefore,
  ActionRecord,
  Actor,
  BankLine,
  BookLine,
  Pairing,
  ReconItem,
  ReconState,
  Suggestion,
} from "./data.ts"

export type Result =
  | {
      ok: true
      actionId: string
      itemId?: string
      delta?: number
      warning?: string
    }
  | { ok: false; reason: string; delta?: number }

export interface AutoQuery {
  date?: string
  text?: string
}
export type CandidateQuery =
  string | { itemId?: string; text?: string; includeHidden?: boolean }
export interface ReconSummary {
  statementOpening: number
  statementEnding: number
  inTransit: number
  outstanding: number
  adjustedBank: number
  glBalance: number
  bookAdjustments: number
  adjustedBook: number
  difference: number
  total: 14
  open: number
  resolved: number
  awaitingApproval: number
  autoMatched: number
  done: boolean
}

export interface ReconStore {
  getState(): ReconState
  subscribe(listener: () => void): () => void
  accept(itemId: string, suggestionId: string, actor?: Actor): Result
  approve(itemId: string, actor?: Actor): Result
  reject(itemId: string, suggestionId: string, actor?: Actor): Result
  unreconcile(itemId: string, actor?: Actor): Result
  matchSelected(bankIds: string[], bookIds: string[], actor?: Actor): Result
  addSuggestion(itemId: string, suggestion: Suggestion, actor?: Actor): Result
  removeSuggestion(itemId: string, suggestionId: string, actor?: Actor): Result
  editField(
    ref: { side: "bank" | "book"; id: string },
    field: "description" | "date" | "amount" | "memo",
    value: string | number,
    actor?: Actor
  ): Result
  createEntry(
    itemId: string,
    entry: { account: string; amount: number; memo?: string },
    actor?: Actor
  ): Result
  revert(actionId: string, actor?: Actor): Result
  restore(state: ReconState): void
  reset(): void
  ember: { search(itemId: string): Suggestion[] }
  findAuto(query: AutoQuery): ReconItem[]
  findCandidates(query: CandidateQuery): Suggestion[]
}

/** Formatting uses integer cents throughout, with no floating point rounding. */
export function fmtMoney(
  cents: number,
  opts: { sign?: "parens" | "minus" | "plus" } = {}
): string {
  if (!Number.isSafeInteger(cents))
    throw new RangeError("Money must be safe integer cents")
  const digits = String(Math.abs(cents)).padStart(3, "0")
  const dollars = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const value = `$${dollars}.${digits.slice(-2)}`
  if (cents < 0)
    return (opts.sign ?? "parens") === "parens" ? `(${value})` : `-${value}`
  return opts.sign === "plus" && cents > 0 ? `+${value}` : value
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

/** Read the calendar date literally, independent of the machine's time zone. */
export function fmtDate(
  iso: string,
  style: "short" | "numeric" | "long" = "short"
): string {
  const date = iso.slice(0, 10)
  if (!validDate(date)) throw new RangeError("Invalid ISO date")
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  if (style === "numeric") return `${month}/${day}/${year}`
  const name = months[month - 1]!
  return style === "long"
    ? `${name} ${day}, ${year}`
    : `${name.slice(0, 3)} ${day}`
}

export function summarize(state: ReconState): ReconSummary {
  let inTransit = 0
  let outstanding = 0
  let bookAdjustments = 0
  let open = 0
  let resolved = 0
  let awaitingApproval = 0
  let autoMatched = 0
  for (const item of Object.values(state.items)) {
    if (item.status === "open") open += 1
    if (item.status === "awaiting_approval") awaitingApproval += 1
    if (item.status !== "resolved") continue
    if (item.kind === "auto") autoMatched += 1
    else resolved += 1
    inTransit += item.resolution?.inTransit ?? 0
    outstanding += item.resolution?.outstanding ?? 0
    bookAdjustments += item.resolution?.bookDelta ?? 0
  }
  const adjustedBank = state.statementEnding + inTransit - outstanding
  const adjustedBook = state.glBalance + bookAdjustments
  const difference = adjustedBank - adjustedBook
  return {
    statementOpening: state.statementOpening,
    statementEnding: state.statementEnding,
    inTransit,
    outstanding,
    adjustedBank,
    glBalance: state.glBalance,
    bookAdjustments,
    adjustedBook,
    difference,
    total: 14,
    open,
    resolved,
    awaitingApproval,
    autoMatched,
    done: open === 0 && awaitingApproval === 0 && difference === 0,
  }
}

export function findAuto(
  state: ReconState,
  query: AutoQuery = {}
): ReconItem[] {
  const text = query.text?.toLocaleLowerCase("en-US").trim()
  return Object.values(state.items).filter((item) => {
    if (item.kind !== "auto" || item.status !== "resolved") return false
    const lines = [
      ...item.bankIds.map((id) => state.bankLines[id]!),
      ...item.bookIds.map((id) => state.bookLines[id]!),
    ]
    return lines.some(
      (line) =>
        (!query.date || line.date === query.date) &&
        (!text || line.description.toLocaleLowerCase("en-US").includes(text))
    )
  })
}

/** Pure discovery; store.ember.search records disclosure of a hidden document. */
export function findCandidates(
  state: ReconState,
  query: CandidateQuery
): Suggestion[] {
  const filter =
    typeof query === "string"
      ? state.items[query]
        ? { itemId: query }
        : { text: query }
      : query
  const text = filter.text?.toLocaleLowerCase("en-US").trim()
  return Object.values(state.items)
    .filter((item) => !filter.itemId || item.id === filter.itemId)
    .flatMap((item) => {
      const all =
        filter.includeHidden === false
          ? item.suggestions
          : [...item.suggestions, ...item.hidden]
      return all.filter(
        (candidate, index) =>
          all.findIndex((other) => other.id === candidate.id) === index
      )
    })
    .filter((candidate) => {
      if (!text) return true
      const documents = (candidate.attachmentIds ?? []).map(
        (id) => state.attachments[id]
      )
      return JSON.stringify([candidate, documents])
        .toLocaleLowerCase("en-US")
        .includes(text)
    })
    .sort((a, b) => b.confidence - a.confidence)
}

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map((child) => clone(child)) as T
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, clone(child)])
    ) as T
  }
  return value
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}
function unique(values: string[]): string[] {
  return [...new Set(values)]
}
function sameIds(a: string[], b: string[]): boolean {
  return (
    a.length === b.length &&
    unique(a).length === a.length &&
    a.every((id) => b.includes(id))
  )
}
function sum(lines: (BankLine | BookLine)[]): number {
  return lines.reduce((total, line) => total + line.amount, 0)
}
function openItem(item: ReconItem): ReconItem {
  const next = { ...item, status: "open" as const, pairings: [] }
  delete next.resolution
  delete next.acceptedSuggestionId
  return next
}
function withPatch<T>(
  original: Record<string, T>,
  patch: Record<string, T | null>
): Record<string, T> {
  const next = { ...original }
  for (const [id, value] of Object.entries(patch)) {
    if (value === null) delete next[id]
    else next[id] = value
  }
  return next
}
function snapshot<T>(
  values: Record<string, T>,
  ids: string[]
): Record<string, T | null> {
  return Object.fromEntries(ids.map((id) => [id, values[id] ?? null]))
}
function stamp(counter: number): string {
  return `${new Date(Date.UTC(2026, 9, 5, 9, 0, counter)).toISOString().slice(0, 19)}-04:00`
}
function validateSuggestion(
  candidate: Suggestion,
  item: ReconItem
): string | undefined {
  if (!candidate.id || candidate.itemId !== item.id)
    return "Suggestion belongs to a different item"
  if (
    !sameIds(candidate.bankIds, item.bankIds) ||
    !sameIds(candidate.bookIds, item.bookIds)
  ) {
    return "Suggestion must account for every line of the item"
  }
  if (candidate.pairings) {
    const bank = candidate.pairings.flatMap((pairing) => pairing.bankIds)
    const book = candidate.pairings.flatMap((pairing) => pairing.bookIds)
    if (
      unique(bank).length !== bank.length ||
      unique(book).length !== book.length ||
      bank.some((id) => !item.bankIds.includes(id)) ||
      book.some((id) => !item.bookIds.includes(id))
    ) {
      return "Suggestion pairings must use each of this item’s lines at most once"
    }
  }
  if (!Number.isSafeInteger(candidate.bookDelta))
    return "Book delta must be integer cents"
  for (const timing of [candidate.inTransit, candidate.outstanding]) {
    if (timing !== undefined && (!Number.isSafeInteger(timing) || timing < 0))
      return "Timing amounts must be nonnegative integer cents"
  }
  if (
    !candidate.reasoning ||
    candidate.reasoning.length > 110 ||
    /[\r\n]/.test(candidate.reasoning)
  )
    return "Reasoning must be one line of at most 110 characters"
  if (
    !candidate.factors.length ||
    candidate.factors.some(
      (factor) =>
        !Number.isFinite(factor.weight) ||
        !Number.isFinite(factor.score) ||
        factor.weight < 0 ||
        factor.weight > 1 ||
        factor.score < 0 ||
        factor.score > 1
    )
  )
    return "Invalid confidence factors"
  const weight = candidate.factors.reduce(
    (value, factor) => value + factor.weight,
    0
  )
  const confidence = Math.round(
    100 *
      candidate.factors.reduce(
        (value, factor) => value + factor.weight * factor.score,
        0
      )
  )
  if (Math.abs(weight - 1) > 1e-9 || candidate.confidence !== confidence)
    return "Confidence must follow the weighted factor formula"
  if (candidate.entries) {
    if (
      candidate.entries.some(
        (line) =>
          !line.account.trim() ||
          !Number.isSafeInteger(line.debit) ||
          !Number.isSafeInteger(line.credit) ||
          line.debit < 0 ||
          line.credit < 0
      )
    )
      return "Journal entries require nonnegative integer cents"
    const debit = candidate.entries.reduce(
      (value, line) => value + line.debit,
      0
    )
    const credit = candidate.entries.reduce(
      (value, line) => value + line.credit,
      0
    )
    if (debit !== credit) return "Journal entries do not balance"
  }
  return undefined
}

export function createReconStore(seed: ReconState = defaultSeed): ReconStore {
  const initial = freeze(clone(seed))
  let state = initial
  const listeners = new Set<() => void>()
  function publish(next: ReconState): void {
    state = freeze(next)
    // One faulty subscriber must not prevent other consumers from seeing a committed action.
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        /* State is already committed. */
      }
    }
  }

  interface Patch {
    items?: Record<string, ReconItem | null>
    bankLines?: Record<string, BankLine | null>
    bookLines?: Record<string, BookLine | null>
    glBalanceDelta?: number
  }

  function commit(
    kind: string,
    label: string,
    actor: Actor,
    itemIds: string[],
    patch: Patch,
    revertsActionId?: string
  ): Result {
    const ids = unique([...itemIds, ...Object.keys(patch.items ?? {})])
    const before: ActionBefore = {
      items: snapshot(state.items, ids),
      bankLines: snapshot(state.bankLines, Object.keys(patch.bankLines ?? {})),
      bookLines: snapshot(state.bookLines, Object.keys(patch.bookLines ?? {})),
      glBalanceDelta: patch.glBalanceDelta ?? 0,
    }
    const touches = unique([
      ...ids.map((id) => `item:${id}`),
      ...ids.flatMap((id) => {
        const item = state.items[id]
        return item
          ? [
              ...item.bankIds.map((line) => `bank:${line}`),
              ...item.bookIds.map((line) => `book:${line}`),
            ]
          : []
      }),
      ...Object.keys(patch.bankLines ?? {}).map((id) => `bank:${id}`),
      ...Object.keys(patch.bookLines ?? {}).map((id) => `book:${id}`),
    ])
    const actionId = `action-${String(state.clock + 1).padStart(6, "0")}`
    const record: ActionRecord = {
      id: actionId,
      at: stamp(state.clock),
      actor,
      kind,
      label,
      before,
      touches,
    }
    if (ids[0]) record.itemId = ids[0]
    if (revertsActionId) record.revertsActionId = revertsActionId
    const history = revertsActionId
      ? state.actions.map((action) =>
          action.id === revertsActionId ? { ...action, reverted: true } : action
        )
      : state.actions
    publish({
      ...state,
      items: patch.items ? withPatch(state.items, patch.items) : state.items,
      bankLines: patch.bankLines
        ? withPatch(state.bankLines, patch.bankLines)
        : state.bankLines,
      bookLines: patch.bookLines
        ? withPatch(state.bookLines, patch.bookLines)
        : state.bookLines,
      glBalance: state.glBalance + (patch.glBalanceDelta ?? 0),
      clock: state.clock + 1,
      actions: [...history, record],
    })
    return { ok: true, actionId, ...(ids[0] ? { itemId: ids[0] } : {}) }
  }

  function currentEffect(
    item: ReconItem,
    candidate: Suggestion
  ): string | undefined {
    const original = initial.items[item.id]?.suggestions[0]
    if (
      (candidate.inTransit ?? 0) !== (original?.inTransit ?? 0) ||
      (candidate.outstanding ?? 0) !== (original?.outstanding ?? 0)
    ) {
      return "Suggestion must preserve the item’s bank timing adjustment"
    }
    const bank = sum(item.bankIds.map((id) => state.bankLines[id]!))
    const book = sum(item.bookIds.map((id) => state.bookLines[id]!))
    if (item.bankIds.length === 0 && item.bookIds.length === 0) {
      return original && candidate.bookDelta === original.bookDelta
        ? undefined
        : "Suggestion must preserve the original beginning-balance correction"
    }
    const expected =
      bank - book + (candidate.inTransit ?? 0) - (candidate.outstanding ?? 0)
    if (candidate.bookDelta !== expected)
      return "Suggestion no longer matches current amounts; match or propose an updated adjustment"
    return undefined
  }

  // Cross-item manual pairings are shared. Reopening or changing an amount clears
  // the connected group so a line cannot remain paired to an unavailable peer.
  function connectedIds(itemId: string): string[] {
    const ids = new Set([itemId])
    for (const id of ids) {
      for (const pairing of state.items[id]?.pairings ?? []) {
        for (const line of pairing.bankIds)
          if (state.bankLines[line]) ids.add(state.bankLines[line]!.itemId)
        for (const line of pairing.bookIds)
          if (state.bookLines[line]) ids.add(state.bookLines[line]!.itemId)
      }
    }
    return [...ids]
  }

  function hideSuggestion(
    itemId: string,
    suggestionId: string,
    actor: Actor,
    kind: string
  ): Result {
    const item = state.items[itemId]
    if (!item) return { ok: false, reason: "Item not found" }
    if (item.status !== "open")
      return {
        ok: false,
        reason: "Reopen the item before changing its suggestions",
      }
    const candidate = item.suggestions.find(
      (suggestion) => suggestion.id === suggestionId
    )
    if (!candidate) return { ok: false, reason: "Visible suggestion not found" }
    if (item.kind === "auto")
      return {
        ok: false,
        reason: "Auto pairs retain their original match suggestion",
      }
    return commit(
      kind,
      `${kind === "reject" ? "Rejected" : "Removed suggestion"}: ${candidate.title}`,
      actor,
      [itemId],
      {
        items: {
          [itemId]: {
            ...item,
            suggestions: item.suggestions.filter(
              (suggestion) => suggestion.id !== suggestionId
            ),
          },
        },
      }
    )
  }

  const store: ReconStore = {
    getState: () => state,
    restore: (next) => publish(clone(next)),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    accept(itemId, suggestionId, actor = "maya") {
      const item = state.items[itemId]
      if (!item) return { ok: false, reason: "Item not found" }
      if (item.status !== "open")
        return { ok: false, reason: "Item is not open" }
      if (item.pairings.length)
        return {
          ok: false,
          reason:
            "Clear manual pairings with unreconcile before accepting a suggestion",
        }
      const candidate = item.suggestions.find(
        (suggestion) => suggestion.id === suggestionId
      )
      if (!candidate)
        return { ok: false, reason: "Visible suggestion not found" }
      const reason =
        validateSuggestion(candidate, item) ?? currentEffect(item, candidate)
      if (reason) return { ok: false, reason }
      return commit(
        "accept",
        candidate.approval
          ? "Sent to Daniel for approval"
          : `Accepted: ${candidate.title}`,
        actor,
        [itemId],
        {
          items: {
            [itemId]: {
              ...item,
              status: candidate.approval ? "awaiting_approval" : "resolved",
              acceptedSuggestionId: candidate.id,
              resolution: candidate,
              pairings: candidate.pairings ?? [],
            },
          },
        }
      )
    },
    approve(itemId, actor = "daniel") {
      const item = state.items[itemId]
      if (!item) return { ok: false, reason: "Item not found" }
      if (item.status !== "awaiting_approval" || !item.resolution?.approval)
        return { ok: false, reason: "Item is not awaiting approval" }
      if (actor !== item.resolution.approval.by)
        return { ok: false, reason: "Daniel must approve this adjustment" }
      const reason = currentEffect(item, item.resolution)
      if (reason) return { ok: false, reason }
      return commit(
        "approve",
        `Approved: ${item.resolution.title}`,
        actor,
        [itemId],
        {
          items: { [itemId]: { ...item, status: "resolved" } },
        }
      )
    },
    reject: (itemId, suggestionId, actor = "maya") =>
      hideSuggestion(itemId, suggestionId, actor, "reject"),
    removeSuggestion: (itemId, suggestionId, actor = "ember") =>
      hideSuggestion(itemId, suggestionId, actor, "removeSuggestion"),
    unreconcile(itemId, actor = "maya") {
      const item = state.items[itemId]
      if (!item) return { ok: false, reason: "Item not found" }
      if (item.status === "open" && !item.pairings.length)
        return { ok: false, reason: "Item is already open" }
      const ids = connectedIds(itemId)
      return commit("unreconcile", `Reopened: ${item.title}`, actor, ids, {
        items: Object.fromEntries(
          ids.map((id) => [id, openItem(state.items[id]!)])
        ),
      })
    },
    matchSelected(bankIds, bookIds, actor = "maya") {
      if (!bankIds.length || !bookIds.length)
        return {
          ok: false,
          reason: "Select at least one bank line and one book entry",
        }
      if (
        unique(bankIds).length !== bankIds.length ||
        unique(bookIds).length !== bookIds.length
      )
        return { ok: false, reason: "A line may only be selected once" }
      const bank = bankIds.map((id) => state.bankLines[id])
      const book = bookIds.map((id) => state.bookLines[id])
      if (bank.some((line) => !line) || book.some((line) => !line))
        return { ok: false, reason: "Selected line not found" }
      const ids = unique([...bank, ...book].map((line) => line!.itemId))
      if (ids.some((id) => state.items[id]?.status !== "open"))
        return {
          ok: false,
          reason: "All selected lines must belong to open items",
        }
      const paired = ids.flatMap((id) => state.items[id]!.pairings)
      if (
        paired.some(
          (pairing) =>
            pairing.bankIds.some((id) => bankIds.includes(id)) ||
            pairing.bookIds.some((id) => bookIds.includes(id))
        )
      ) {
        return { ok: false, reason: "A selected line is already paired" }
      }
      const delta = sum(bank as BankLine[]) - sum(book as BookLine[])
      if (delta !== 0)
        return {
          ok: false,
          reason: `Amounts differ by ${fmtMoney(Math.abs(delta))}`,
          delta,
        }
      const normalize = (name: string): string =>
        name.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]/gu, "")
      const warning =
        bank.length === 1 &&
        book.length === 1 &&
        bank[0]!.payee &&
        book[0]!.payee &&
        normalize(bank[0]!.payee) !== normalize(book[0]!.payee)
          ? "Payee names differ"
          : undefined
      const pairing: Pairing = {
        bankIds: [...bankIds],
        bookIds: [...bookIds],
        ...(warning ? { warning } : {}),
      }
      const items: Record<string, ReconItem> = {}
      for (const id of ids) {
        const item = state.items[id]!
        const pairings = [...item.pairings, pairing]
        const complete =
          item.bankIds.every((line) =>
            pairings.some((pair) => pair.bankIds.includes(line))
          ) &&
          item.bookIds.every((line) =>
            pairings.some((pair) => pair.bookIds.includes(line))
          )
        if (!complete) {
          items[id] = { ...item, pairings }
          continue
        }
        const candidate: Suggestion = {
          id: `manual-${id}-${state.clock + 1}`,
          itemId: id,
          action:
            item.bankIds.length > 1 || item.bookIds.length > 1
              ? "match_many"
              : "match",
          title: `Manually matched ${item.title}`,
          reasoning: "Selected bank and book amounts agree exactly.",
          reasons: [
            `The selected bank and book lines total ${fmtMoney(sum(bankIds.map(id => state.bankLines[id])))} on each side.`,
            "The preparer selected these lines to match.",
          ],
          factors: [
            {
              key: "amount",
              label: "Amount",
              detail: "$0.00 difference across the selected lines",
              score: 1,
              weight: 1,
            },
          ],
          confidence: 100,
          bankIds: [...item.bankIds],
          bookIds: [...item.bookIds],
          bookDelta: 0,
          source: "maya",
          pairings,
        }
        items[id] = {
          ...item,
          pairings,
          status: "resolved",
          resolution: candidate,
          acceptedSuggestionId: candidate.id,
        }
      }
      const result = commit(
        "matchSelected",
        `Matched ${bankIds.length} bank line${bankIds.length === 1 ? "" : "s"} to ${bookIds.length} book entr${bookIds.length === 1 ? "y" : "ies"}`,
        actor,
        ids,
        { items }
      )
      return result.ok
        ? { ...result, delta: 0, ...(warning ? { warning } : {}) }
        : result
    },
    addSuggestion(itemId, suggestion, actor = "ember") {
      const item = state.items[itemId]
      if (!item) return { ok: false, reason: "Item not found" }
      if (item.status !== "open")
        return { ok: false, reason: "Item is not open" }
      if (item.kind === "auto")
        return {
          ok: false,
          reason: "Auto pairs retain their original match suggestion",
        }
      if (item.suggestions.some((candidate) => candidate.id === suggestion.id))
        return { ok: false, reason: "Suggestion already exists" }
      const reason =
        validateSuggestion(suggestion, item) ?? currentEffect(item, suggestion)
      if (reason) return { ok: false, reason }
      if ((suggestion.attachmentIds ?? []).some((id) => !state.attachments[id]))
        return { ok: false, reason: "Attachment not found" }
      const candidate = clone(suggestion)
      return commit(
        "addSuggestion",
        `Added suggestion: ${candidate.title}`,
        actor,
        [itemId],
        {
          items: {
            [itemId]: {
              ...item,
              suggestions: [...item.suggestions, candidate].sort(
                (a, b) => b.confidence - a.confidence
              ),
              surfacedIds: item.hidden.some(
                (hidden) => hidden.id === candidate.id
              )
                ? unique([...item.surfacedIds, candidate.id])
                : item.surfacedIds,
              attachmentIds: unique([
                ...item.attachmentIds,
                ...(candidate.attachmentIds ?? []),
              ]),
            },
          },
        }
      )
    },
    editField(ref, field, value, actor = "maya") {
      if (ref.side !== "bank" && ref.side !== "book")
        return { ok: false, reason: "Unknown line side" }
      const line =
        ref.side === "bank" ? state.bankLines[ref.id] : state.bookLines[ref.id]
      if (!line) return { ok: false, reason: "Line not found" }
      if (!["description", "date", "amount", "memo"].includes(field))
        return { ok: false, reason: "Field cannot be edited" }
      if (
        field === "amount"
          ? !Number.isSafeInteger(value)
          : typeof value !== "string"
      )
        return {
          ok: false,
          reason:
            field === "amount"
              ? "Amount must be integer cents"
              : "Field must be text",
        }
      if (field === "date" && !validDate(value as string))
        return { ok: false, reason: "Date must be a valid YYYY-MM-DD date" }
      if (line[field] === value)
        return { ok: false, reason: "Value is unchanged" }
      const glBalanceDelta =
        ref.side === "book" && field === "amount"
          ? (value as number) - line.amount
          : 0
      if (
        !Number.isSafeInteger(glBalanceDelta) ||
        !Number.isSafeInteger(state.glBalance + glBalanceDelta)
      )
        return {
          ok: false,
          reason: "Amount exceeds the supported integer range",
        }
      const ids = field === "amount" ? connectedIds(line.itemId) : [line.itemId]
      const patch: Patch = { glBalanceDelta }
      if (ref.side === "bank")
        patch.bankLines = { [ref.id]: { ...line, [field]: value } as BankLine }
      else
        patch.bookLines = { [ref.id]: { ...line, [field]: value } as BookLine }
      if (field === "amount")
        patch.items = Object.fromEntries(
          ids.map((id) => [id, openItem(state.items[id]!)])
        )
      const display =
        field === "amount" ? fmtMoney(value as number) : String(value)
      return commit(
        "editField",
        `Changed ${ref.side} ${field} to ${display}`,
        actor,
        ids,
        patch
      )
    },
    createEntry(itemId, entry, actor = "maya") {
      const item = state.items[itemId]
      if (!item) return { ok: false, reason: "Item not found" }
      if (
        item.status !== "open" ||
        !item.bankIds.length ||
        item.bookIds.length ||
        item.pairings.length
      )
        return {
          ok: false,
          reason: "Create an entry for an open, unpaired bank-only item",
        }
      if (!entry.account.trim())
        return { ok: false, reason: "Account is required" }
      if (!Number.isSafeInteger(entry.amount))
        return { ok: false, reason: "Amount must be integer cents" }
      const amount = Math.abs(entry.amount)
      const candidate: Suggestion = {
        id: `entry-${itemId}-${state.clock + 1}`,
        itemId,
        action: "create_je",
        title: `Create entry to ${entry.account}`,
        reasoning: "Manual journal entry entered by the preparer.",
        reasons: [
          `The preparer entered ${fmtMoney(amount)} to ${entry.account}.`,
          `The entry ${entry.amount > 0 ? "increases" : "decreases"} cash by ${fmtMoney(amount)}.`,
        ],
        factors: [
          {
            key: "audit",
            label: "Preparer instruction",
            detail: "Account and amount supplied by the preparer",
            score: 1,
            weight: 1,
          },
        ],
        confidence: 100,
        bankIds: [...item.bankIds],
        bookIds: [],
        bookDelta: entry.amount,
        source: "maya",
        entries: [
          {
            account: "1010 · Chase Operating",
            debit: entry.amount > 0 ? amount : 0,
            credit: entry.amount < 0 ? amount : 0,
            ...(entry.memo ? { memo: entry.memo } : {}),
          },
          {
            account: entry.account,
            debit: entry.amount < 0 ? amount : 0,
            credit: entry.amount > 0 ? amount : 0,
            ...(entry.memo ? { memo: entry.memo } : {}),
          },
        ],
      }
      return commit(
        "createEntry",
        `Created journal entry: ${entry.account}, ${fmtMoney(entry.amount)}`,
        actor,
        [itemId],
        {
          items: {
            [itemId]: {
              ...item,
              status: "resolved",
              resolution: candidate,
              acceptedSuggestionId: candidate.id,
            },
          },
        }
      )
    },
    revert(actionId, actor = "maya") {
      const index = state.actions.findIndex((action) => action.id === actionId)
      const target = state.actions[index]
      if (!target) return { ok: false, reason: "Action not found" }
      if (target.reverted)
        return { ok: false, reason: "Action was already reverted" }
      if (target.kind === "revert")
        return {
          ok: false,
          reason:
            "Revert records are audit history; reapply the original action instead",
        }
      const later = state.actions
        .slice(index + 1)
        .find(
          (action) =>
            !action.reverted &&
            action.kind !== "revert" &&
            action.touches.some((touch) => target.touches.includes(touch))
        )
      if (later)
        return {
          ok: false,
          reason: `Cannot revert: a later action touched the same item or line (${later.label})`,
        }
      return commit(
        "revert",
        `Reverted: ${target.label}`,
        actor,
        Object.keys(target.before.items),
        {
          items: target.before.items,
          bankLines: target.before.bankLines,
          bookLines: target.before.bookLines,
          // Subtract only this action's edit; independent edits on other items survive.
          glBalanceDelta: -target.before.glBalanceDelta,
        },
        actionId
      )
    },
    reset() {
      publish(freeze(clone(initial)))
    },
    ember: {
      search(itemId) {
        const item = state.items[itemId]
        if (!item || !item.hidden.length) return []
        const newlyFound = item.hidden.filter(
          (candidate) => !item.surfacedIds.includes(candidate.id)
        )
        if (newlyFound.length) {
          commit(
            "search",
            `Ember found ${newlyFound.length} candidate${newlyFound.length === 1 ? "" : "s"} for ${item.title}`,
            "ember",
            [itemId],
            {
              items: {
                [itemId]: {
                  ...item,
                  surfacedIds: unique([
                    ...item.surfacedIds,
                    ...newlyFound.map((candidate) => candidate.id),
                  ]),
                  attachmentIds: unique([
                    ...item.attachmentIds,
                    ...newlyFound.flatMap(
                      (candidate) => candidate.attachmentIds ?? []
                    ),
                  ]),
                },
              },
            }
          )
        }
        return [...state.items[itemId]!.hidden]
      },
    },
    findAuto: (query) => findAuto(state, query),
    findCandidates: (query) => findCandidates(state, query),
  }
  return store
}
