/** September 2026 reconciliation fixture. Money is always an integer number of cents. */
export type Actor = "maya" | "daniel" | "priya" | "ember"
export type Action =
  | "match"
  | "match_many"
  | "match_adjust"
  | "create_je"
  | "create_bill"
  | "fix_amount"
  | "outstanding"
  | "in_transit"
  | "reverse_dup"
  | "reverse_void"
export interface Factor {
  key: string
  label: string
  detail: string
  score: number
  weight: number
}
export interface JournalLine {
  account: string
  debit: number
  credit: number
  memo?: string
}
export interface Pairing {
  bankIds: string[]
  bookIds: string[]
  warning?: string
}
export interface Suggestion {
  id: string
  itemId: string
  action: Action
  title: string
  reasoning: string
  reasons: string[]
  factors: Factor[]
  confidence: number
  bankIds: string[]
  bookIds: string[]
  entries?: JournalLine[]
  bookDelta: number
  inTransit?: number
  outstanding?: number
  approval?: { by: "daniel"; reason: string }
  attachmentIds?: string[]
  source: "matcher" | "ember" | "maya"
  pairings?: Pairing[]
  invoiceNumber?: string
  amortization?: { months: number; start: string; end: string; account: string }
}
export interface BankLine {
  id: string
  itemId: string
  date: string
  description: string
  amount: number
  memo?: string
  payee?: string
  reference?: string
}
export interface BookLine extends BankLine {
  journal: string
  type?: "check" | "payment" | "receipt" | "journal" | "transfer"
  checkNo?: string
}
export interface ReconItem {
  id: string
  kind: "auto" | "exception"
  title: string
  status: "open" | "resolved" | "awaiting_approval"
  bankIds: string[]
  bookIds: string[]
  suggestions: Suggestion[]
  hidden: Suggestion[]
  surfacedIds: string[]
  attachmentIds: string[]
  pairings: Pairing[]
  acceptedSuggestionId?: string
  resolution?: Suggestion
  confidence?: number
  matchedBy?: "rule" | "ai"
}
export interface Attachment {
  id: string
  kind:
    | "invoice"
    | "receipt"
    | "remittance"
    | "check"
    | "audit"
    | "feed"
    | "bank_detail"
  title: string
  from: string
  number?: string
  date: string
  lines: { label: string; amount?: number }[]
  total?: number
  note?: string
}
export interface Thread {
  id: string
  itemId: string
  resolved: boolean
  messages: { id: string; author: Actor; at: string; text: string }[]
}
export interface Teammate {
  id: Actor
  name: string
  role: string
  initials: string
  email?: string
}
export interface ActionBefore {
  items: Record<string, ReconItem | null>
  bankLines: Record<string, BankLine | null>
  bookLines: Record<string, BookLine | null>
  glBalanceDelta: number
}
export interface ActionRecord {
  id: string
  at: string
  actor: Actor
  kind: string
  itemId?: string
  label: string
  before: ActionBefore
  reverted?: boolean
  touches: string[]
  revertsActionId?: string
}
export interface ReconState {
  company: string
  account: string
  period: string
  workedOn: string
  statementOpening: number
  statementEnding: number
  previousReconciledEnding: number
  glOpeningBalance: number
  glBalance: number
  bankLines: Record<string, BankLine>
  bookLines: Record<string, BookLine>
  items: Record<string, ReconItem>
  attachments: Record<string, Attachment>
  threads: Record<string, Thread>
  teammates: Record<Actor, Teammate>
  actions: ActionRecord[]
  clock: number
}

export function mulberry32(initial: number): () => number {
  let value = initial
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(20260930)
const integer = (min: number, max: number): number =>
  min + Math.floor(random() * (max - min + 1))
const cash = "1010 · Chase Operating"
const confidence = (factors: Factor[]): number =>
  Math.round(
    100 * factors.reduce((sum, factor) => sum + factor.weight * factor.score, 0)
  )
const factor = (
  key: string,
  label: string,
  detail: string,
  score: number,
  weight: number
): Factor => ({ key, label, detail, score, weight })
/** Internal fixture scoring; customer-facing reasons are separate from scoring metadata. */
function evidence(
  target: number,
  primary: Omit<Factor, "score" | "weight">,
  secondary: Omit<Factor, "score" | "weight">,
  primaryScore = 1
): Factor[] {
  return [
    { ...primary, score: primaryScore, weight: 0.5 },
    {
      ...secondary,
      score: (target / 100 - primaryScore * 0.5) / 0.5,
      weight: 0.5,
    },
  ]
}
function adjustment(
  delta: number,
  account: string,
  memo?: string
): JournalLine[] {
  const magnitude = Math.abs(delta)
  return delta > 0
    ? [
        { account: cash, debit: magnitude, credit: 0, memo },
        { account, debit: 0, credit: magnitude, memo },
      ]
    : [
        { account, debit: magnitude, credit: 0, memo },
        { account: cash, debit: 0, credit: magnitude, memo },
      ]
}
const bankLines: Record<string, BankLine> = {}
const bookLines: Record<string, BookLine> = {}
const items: Record<string, ReconItem> = {}
function exception(id: string, title: string): ReconItem {
  const item: ReconItem = {
    id,
    kind: "exception",
    title,
    status: "open",
    bankIds: [],
    bookIds: [],
    suggestions: [],
    hidden: [],
    surfacedIds: [],
    attachmentIds: [],
    pairings: [],
  }
  items[id] = item
  return item
}
for (const [id, title] of [
  ["r01", "Google Workspace alias"],
  ["r02", "September bank service charge"],
  ["r03", "September interest income"],
  ["r04", "Notion annual renewal"],
  ["r05", "Outstanding check #4127"],
  ["r06", "Meridian deposit in transit"],
  ["r07", "AWS transposed bill amount"],
  ["r08", "Northstar incoming-wire fee"],
  ["r09", "Harbour foreign exchange"],
  ["r10", "Kestrel wire approval delay"],
  ["r11", "Duplicate Datadog journal"],
  ["r12", "Cascade three-invoice receipt"],
  ["r13", "Two contractor payments"],
  ["r14", "August beginning-balance discrepancy"],
])
  exception(id, title)
function bank(
  itemId: string,
  suffix: string,
  day: string,
  description: string,
  amount: number,
  payee?: string,
  reference?: string
): string {
  const id = `${itemId}-bank${suffix}`
  bankLines[id] = {
    id,
    itemId,
    date: `2026-09-${day}`,
    description,
    amount,
    payee,
    reference,
  }
  items[itemId].bankIds.push(id)
  return id
}
let nextJournal = 386
function book(
  itemId: string,
  suffix: string,
  day: string,
  description: string,
  amount: number,
  payee?: string,
  extras: Partial<BookLine> = {}
): string {
  const id = `${itemId}-book${suffix}`
  bookLines[id] = {
    id,
    itemId,
    date: `2026-09-${day}`,
    description,
    amount,
    journal: String(nextJournal++).padStart(7, "0"),
    type: amount > 0 ? "receipt" : "payment",
    payee,
    ...extras,
  }
  items[itemId].bookIds.push(id)
  return id
}
bank(
  "r01",
  "",
  "03",
  "GOOGLE *GSUITE_ARBORANA CC@GOOGLE.COM",
  -264000,
  "Google Workspace"
)
book(
  "r01",
  "",
  "02",
  "Google Workspace — Sep seats (bill payment)",
  -264000,
  "Google Workspace"
)
bank("r02", "", "30", "ACCOUNT ANALYSIS FEE SEP", -28540, "Chase")
bank("r03", "", "30", "INTEREST PAYMENT", 391207, "Chase")
bank("r04", "", "19", "NOTION LABS INC NOTION.SO/BILL", -960000, "Notion")
book(
  "r05",
  "",
  "30",
  "Check #4127 · Evergreen Movers",
  -385000,
  "Evergreen Movers",
  { type: "check", checkNo: "4127", reference: "4127" }
)
book(
  "r06",
  "",
  "30",
  "Meridian Labs — wire received INV-1187",
  8640000,
  "Meridian Labs",
  { reference: "INV-1187" }
)
bank("r07", "", "08", "AMAZON WEB SERVICES AWS.AMAZON.CO WA", -1824000, "AWS")
book("r07", "", "08", "AWS — Aug usage (bill payment)", -1842000, "AWS")
bank(
  "r08",
  "",
  "22",
  "WIRE IN NORTHSTAR HEALTH SYS REF NH-48000",
  4797500,
  "Northstar Health",
  "NH-48000"
)
book(
  "r08",
  "",
  "22",
  "Northstar Health — INV-1162 payment",
  4800000,
  "Northstar Health",
  { reference: "INV-1162" }
)
bank(
  "r09",
  "",
  "17",
  "WIRE OUT GBP HARBOUR & CO LTD FX 1.271256",
  -1271256,
  "Harbour & Co"
)
book(
  "r09",
  "",
  "17",
  "Harbour & Co — £10,000 INV HC-2291",
  -1264958,
  "Harbour & Co",
  { reference: "HC-2291", memo: "Booked at GBP/USD 1.264958" }
)
bank(
  "r10",
  "",
  "16",
  "WIRE OUT KESTREL PARTNERS LLC",
  -1250000,
  "Kestrel Partners"
)
book(
  "r10",
  "",
  "11",
  "Kestrel Partners — Q3 retainer wire",
  -1250000,
  "Kestrel Partners",
  { memo: "Released by Daniel from dual approval on 9/16" }
)
bank("r11", "", "12", "DATADOG INC NY", -684000, "Datadog")
book(
  "r11",
  "-bill",
  "12",
  "Datadog — Aug invoice (bill payment)",
  -684000,
  "Datadog"
)
book(
  "r11",
  "-je",
  "12",
  'Datadog Aug — manual JE (journal 0007712, "JE-7712")',
  -684000,
  "Datadog",
  {
    journal: "0007712",
    type: "journal",
    memo: "Posted by Priya before the bill sync",
  }
)
bank(
  "r12",
  "",
  "24",
  "ACH CREDIT CASCADE OUTDOOR CO REMIT 3 INV",
  6125000,
  "Cascade Outdoor"
)
book(
  "r12",
  "-2041",
  "24",
  "Cascade Outdoor INV-2041",
  2450000,
  "Cascade Outdoor",
  { reference: "INV-2041" }
)
book(
  "r12",
  "-2044",
  "24",
  "Cascade Outdoor INV-2044",
  1875000,
  "Cascade Outdoor",
  { reference: "INV-2044" }
)
book(
  "r12",
  "-2047",
  "24",
  "Cascade Outdoor INV-2047",
  1800000,
  "Cascade Outdoor",
  { reference: "INV-2047" }
)
bank(
  "r13",
  "-chen",
  "15",
  "ACH DEBIT GUSTO CONTRACTOR L CHEN",
  -400000,
  "Lin Chen"
)
bank(
  "r13",
  "-okafor",
  "15",
  "ACH DEBIT GUSTO CONTRACTOR E OKAFOR",
  -400000,
  "Emeka Okafor"
)
book(
  "r13",
  "-okafor",
  "15",
  "Contractor — Emeka Okafor (Sep)",
  -400000,
  "Emeka Okafor"
)
book("r13", "-chen", "15", "Contractor — Lin Chen (Sep)", -400000, "Lin Chen")

function propose(
  itemId: string,
  suffix: string,
  action: Action,
  title: string,
  reasoning: string,
  reasons: string[],
  factors: Factor[],
  bookDelta: number,
  extras: Partial<Suggestion> = {}
): Suggestion {
  const item = items[itemId]
  const result: Suggestion = {
    id: `${itemId}-${suffix}`,
    itemId,
    action,
    title,
    reasoning,
    reasons,
    factors,
    confidence: confidence(factors),
    bankIds: [...item.bankIds],
    bookIds: [...item.bookIds],
    bookDelta,
    source: "matcher",
    ...extras,
  }
  item.suggestions.push(result)
  return result
}
const proof = (
  key: string,
  label: string,
  detail: string
): Omit<Factor, "score" | "weight"> => ({ key, label, detail })
const amortization = {
  months: 12,
  start: "2026-09",
  end: "2027-08",
  account: "6150 · Software Subscriptions",
}
propose(
  "r01",
  "match",
  "match",
  "Match to Google Workspace — Sep seats",
  "The bank payment and Google Workspace invoice both total $2,640, booked September 2 and cleared September 3. This Google bank description has matched Workspace payments for the past 11 months.",
  [
    "The bank payment and Google invoice both total $2,640.",
    "The payment was booked September 2 and cleared September 3.",
    "This Google bank description matched Workspace payments in the prior 11 months."
  ],
  [
    factor("amount", "Amount", "$0.00 difference", 1, 0.35),
    factor("date", "Date", "1 day apart", 0.9, 0.2),
    factor(
      "payee",
      "Payee",
      "41% text similarity · alias seen 11×",
      0.41,
      0.08
    ),
    factor(
      "history",
      "History",
      "Same alias matched for 11 prior months",
      1,
      0.25
    ),
    factor(
      "document",
      "Invoice",
      "Google invoice total $2,640.00",
      0.9766666666666667,
      0.12
    ),
  ],
  0,
  { attachmentIds: ["google-invoice"] }
)
propose(
  "r02",
  "fees",
  "create_je",
  "Record September bank service charges",
  "Chase charged $285.40 on September 30. The same monthly fee was $271.10 in July and $279.85 in August, both posted to Bank Service Charges.",
  [
    "Chase charged $285.40 on September 30.",
    "The same monthly fee was $271.10 in July and $279.85 in August.",
    "Both prior fees were posted to Bank Service Charges."
  ],
  evidence(
    97,
    proof(
      "recurrence",
      "Recurrence",
      "Jul $271.10 · Aug $279.85 · same description"
    ),
    proof(
      "policy",
      "Account",
      "Prior months posted to 6820 · Bank Service Charges"
    )
  ),
  -28540,
  { entries: adjustment(-28540, "6820 · Bank Service Charges") }
)
propose(
  "r02",
  "other-fees",
  "create_je",
  "Record as Bank Fees – Other",
  "Chase charged $285.40 on September 30. Bank Fees – Other records the charge, but the July and August fees were posted to Bank Service Charges.",
  [
    "Chase charged $285.40 on September 30.",
    "Recent monthly fees were posted to Bank Service Charges, not Bank Fees – Other."
  ],
  evidence(
    61,
    proof("feed", "Bank charge", "Statement debit $285.40"),
    proof("policy", "Account", "No recent analysis fees coded to 6800"),
    0.8
  ),
  -28540,
  { entries: adjustment(-28540, "6800 · Bank Fees – Other") }
)
propose(
  "r03",
  "interest",
  "create_je",
  "Record September interest income",
  "Chase credited $3,912.07 in interest on September 30. Record the credit as Interest Income.",
  [
    "Chase credited $3,912.07 in interest on September 30.",
    "The interest rate is consistent with August."
  ],
  evidence(
    98,
    proof(
      "recurrence",
      "Monthly credit",
      "Interest credit on the last day of the month"
    ),
    proof("history", "Rate", "Effective rate consistent with August")
  ),
  391207,
  { entries: adjustment(391207, "7100 · Interest Income") }
)
propose(
  "r04",
  "prepaid",
  "create_bill",
  "Create Notion annual prepaid software bill",
  "Notion charged $9,600 on September 19 and no bill is recorded. Last September’s renewal was also $9,600, recorded as prepaid software over 12 months.",
  [
    "Notion charged $9,600 on September 19; no bill is recorded.",
    "Last September’s renewal was also $9,600.",
    "Last year’s cost was spread over 12 months as prepaid software."
  ],
  evidence(
    72,
    proof(
      "recurrence",
      "Annual renewal",
      "Sep 2025 Notion renewal was $9,600.00"
    ),
    proof(
      "policy",
      "Treatment",
      "Prior year used prepaid software over 12 months"
    ),
    0.9
  ),
  -960000,
  { entries: adjustment(-960000, "1310 · Prepaid Software"), amortization }
)
propose(
  "r04",
  "expense",
  "create_je",
  "Expense Notion renewal now",
  "Notion charged $9,600 on September 19. Expensing it now puts the full annual cost in September, while last year’s renewal was spread over 12 months.",
  [
    "Notion charged $9,600 on September 19.",
    "Expensing it now puts the full annual cost in September.",
    "Last year’s renewal was spread over 12 months."
  ],
  evidence(
    58,
    proof("feed", "Bank charge", "Notion debit $9,600.00"),
    proof(
      "policy",
      "Treatment",
      "Expense now instead of prior-year amortization"
    ),
    0.9
  ),
  -960000,
  { entries: adjustment(-960000, "6150 · Software Subscriptions") }
)
const hiddenNotion = propose(
  "r04",
  "invoice-NTN-88213",
  "create_bill",
  "Create bill from NTN-88213",
  "Unprocessed Notion invoice NTN-88213 matches the $9,600 payment on September 19. It covers 40 seats from September 2026 through August 2027, so record prepaid software over 12 months.",
  [
    "Notion invoice NTN-88213 totals $9,600, matching the September 19 payment.",
    "It covers 40 seats from September 2026 through August 2027.",
    "The 12-month service period supports prepaid software treatment."
  ],
  evidence(
    96,
    proof(
      "document",
      "Invoice",
      "NTN-88213 · Notion Plus annual · 40 seats · $9,600.00"
    ),
    proof(
      "policy",
      "Service period",
      "Sep 2026–Aug 2027 · amortize over 12 months"
    )
  ),
  -960000,
  {
    entries: adjustment(-960000, "1310 · Prepaid Software"),
    source: "ember",
    attachmentIds: ["notion-invoice"],
    invoiceNumber: "NTN-88213",
    amortization,
  }
)
items.r04.suggestions.pop()
items.r04.hidden.push(hiddenNotion)
propose(
  "r05",
  "outstanding",
  "outstanding",
  "Carry check #4127 as outstanding",
  "Check #4127 for $3,850 to Evergreen Movers was issued September 30 and is absent from the September bank statement. Carry it as outstanding at month-end.",
  [
    "Check #4127 for $3,850 to Evergreen Movers was issued September 30.",
    "It does not appear on the September bank statement.",
    "Evergreen checks typically clear in six business days; only three have passed."
  ],
  evidence(
    90,
    proof("document", "Check copy", "Check #4127 · 9/30 · $3,850.00"),
    proof("clearTime", "Clearing time", "Median 6 business days · 3 elapsed")
  ),
  0,
  { outstanding: 385000, attachmentIds: ["check-4127"] }
)
propose(
  "r06",
  "transit",
  "in_transit",
  "Carry Meridian wire as a deposit in transit",
  "The $86,400 Meridian wire was booked September 30. Chase’s live feed shows it posted October 1, so carry it as a deposit in transit at the September cutoff.",
  [
    "The $86,400 Meridian wire was booked September 30.",
    "Chase’s live feed shows it posted October 1, after the September cutoff."
  ],
  evidence(
    95,
    proof(
      "feed",
      "Live feed",
      "10/01 posting · ref FW-100126-7731 · $86,400.00"
    ),
    proof("date", "Cutoff", "Book 9/30 · bank 10/01")
  ),
  0,
  { inTransit: 8640000, attachmentIds: ["meridian-feed"] }
)
propose(
  "r07",
  "fix",
  "fix_amount",
  "Fix AWS bill payment to $18,240.00",
  "The AWS invoice and September 8 bank payment both total $18,240. The bill was entered as $18,420, so correcting it removes the $180 difference.",
  [
    "The AWS invoice and September 8 bank payment both total $18,240.",
    "The bill was entered as $18,420; the swapped digits explain the $180 difference."
  ],
  evidence(
    88,
    proof("document", "Invoice", "Invoice PDF total $18,240.00"),
    proof(
      "amount",
      "Transposition",
      "$180.00 gap ÷ 9 = $20.00 · 18,420 ↔ 18,240"
    )
  ),
  18000,
  {
    entries: adjustment(18000, "6150 · Cloud Hosting"),
    attachmentIds: ["aws-invoice"],
  }
)
propose(
  "r07",
  "adjust",
  "match_adjust",
  "Match AWS and adjust Cloud Hosting by $180.00",
  "AWS was paid $18,240 on September 8, but the books show $18,420. A $180 credit to Cloud Hosting balances cash and leaves the incorrect bill amount unchanged.",
  [
    "AWS was paid $18,240 on September 8; the books show $18,420.",
    "A $180 adjustment balances cash but leaves the incorrect bill amount unchanged."
  ],
  evidence(
    54,
    proof("amount", "Variance", "Bank $18,240.00 · book $18,420.00"),
    proof(
      "policy",
      "Treatment",
      "Variance adjustment leaves the original bill amount intact"
    ),
    0.8
  ),
  18000,
  {
    entries: adjustment(18000, "6150 · Cloud Hosting"),
    attachmentIds: ["aws-invoice"],
  }
)
propose(
  "r08",
  "fee",
  "match_adjust",
  "Match Northstar and record the $25.00 wire fee",
  "Northstar’s wire advice shows $48,000 sent against INV-1162, less a $25 bank fee. The net $47,975 matches the September 22 deposit, so record the fee and match the receipt.",
  [
    "Northstar’s wire advice shows $48,000 sent and a $25 bank fee.",
    "The remaining $47,975 matches the September 22 deposit.",
    "The $48,000 receipt is recorded against Northstar invoice INV-1162."
  ],
  evidence(
    84,
    proof(
      "document",
      "Wire advice",
      "$48,000.00 gross − $25.00 fee = $47,975.00"
    ),
    proof("reference", "Invoice", "Northstar INV-1162 · wire ref NH-48000")
  ),
  -2500,
  {
    entries: adjustment(-2500, "6820 · Bank Service Charges"),
    approval: { by: "daniel", reason: "Adjusting entry on a customer receipt" },
    attachmentIds: ["northstar-invoice", "northstar-wire"],
  }
)
propose(
  "r08",
  "short-pay",
  "match",
  "Match Northstar and leave $25.00 receivable",
  "The $47,975 deposit is $25 short of Northstar invoice INV-1162. Leaving $25 receivable treats it as unpaid by Northstar, although the wire advice identifies a bank fee.",
  [
    "The $47,975 deposit is $25 less than Northstar invoice INV-1162.",
    "The wire advice identifies a bank fee, so it does not support leaving $25 owed by Northstar."
  ],
  evidence(
    38,
    proof("amount", "Difference", "$25.00 short of INV-1162"),
    proof(
      "document",
      "Evidence",
      "Advice identifies a bank fee rather than a customer short-pay"
    ),
    0.6
  ),
  -2500,
  {
    entries: adjustment(-2500, "1200 · Accounts Receivable"),
    attachmentIds: ["northstar-invoice", "northstar-wire"],
  }
)
propose(
  "r09",
  "fx",
  "match_adjust",
  "Match Harbour and record $62.98 realized FX loss",
  "Harbour’s £10,000 invoice was booked at $12,649.58, and Chase paid $12,712.56 on September 17. Record the $62.98 exchange loss to match the payment.",
  [
    "Harbour’s £10,000 invoice was recorded at $12,649.58.",
    "Chase paid $12,712.56 on September 17 using its exchange rate.",
    "The $62.98 difference is an exchange loss."
  ],
  evidence(
    89,
    proof("document", "FX confirmation", "£10,000 × 1.271256 = $12,712.56"),
    proof(
      "amount",
      "Exchange loss",
      "$12,712.56 cash − $12,649.58 book = $62.98"
    )
  ),
  -6298,
  {
    entries: adjustment(-6298, "7210 · Realized FX Loss"),
    attachmentIds: ["harbour-invoice", "chase-fx"],
  }
)
propose(
  "r10",
  "match",
  "match",
  "Match Kestrel’s Q3 retainer wire",
  "The bank and books both show a $12,500 payment to Kestrel Partners. It was booked September 11 and released by Daniel on September 16 after five days in approval.",
  [
    "The bank and books both show a $12,500 payment to Kestrel Partners.",
    "It was booked September 11; Daniel released it September 16 after approval."
  ],
  evidence(
    91,
    proof("amount", "Amount and payee", "$0.00 difference · Kestrel Partners"),
    proof(
      "date",
      "Approval delay",
      "5 days apart · booked 9/11 · released 9/16"
    )
  ),
  0
)
propose(
  "r11",
  "reverse-je",
  "reverse_dup",
  "Match Datadog bill payment and reverse JE-7712",
  "The books have two $6,840 Datadog payments but the bank shows one, on September 12. Priya entered JE-7712 by hand before the bill synced, so reversing it leaves the synced payment matched.",
  [
    "The books show two $6,840 Datadog payments; the bank shows one on September 12.",
    "Priya confirms she entered JE-7712 before the same bill synced.",
    "Reversing JE-7712 keeps the payment linked to the invoice."
  ],
  evidence(
    92,
    proof(
      "document",
      "Duplicate",
      "Same vendor, August period, and $6,840.00 amount"
    ),
    proof(
      "audit",
      "Posting history",
      "Priya posted JE-7712 on 9/12 before the bill sync"
    )
  ),
  684000,
  {
    entries: adjustment(
      684000,
      "6150 · Software Subscriptions",
      "Reverse duplicate JE-7712"
    ),
    attachmentIds: ["datadog-bill", "datadog-je"],
    pairings: [{ bankIds: ["r11-bank"], bookIds: ["r11-book-bill"] }],
  }
)
propose(
  "r11",
  "void-bill",
  "reverse_dup",
  "Match JE-7712 and void the Datadog bill payment",
  "Two $6,840 Datadog entries match a single bank payment on September 12. Voiding the synced payment removes the duplicate but leaves JE-7712 without the bill’s invoice detail.",
  [
    "Both Datadog book entries are $6,840, matching the single September 12 bank payment.",
    "Keeping JE-7712 removes the duplicate but loses the synced bill’s invoice detail."
  ],
  evidence(
    41,
    proof("amount", "Equal duplicates", "Both book entries are $6,840.00"),
    proof(
      "audit",
      "Record quality",
      "Manual JE has less invoice detail than the synced bill"
    ),
    0.7
  ),
  684000,
  {
    entries: adjustment(
      684000,
      "6150 · Software Subscriptions",
      "Void duplicate bill payment"
    ),
    attachmentIds: ["datadog-bill", "datadog-je"],
    pairings: [{ bankIds: ["r11-bank"], bookIds: ["r11-book-je"] }],
  }
)
propose(
  "r12",
  "many",
  "match_many",
  "Match Cascade receipt to three invoices",
  "Cascade’s September 24 deposit is $61,250. Its remittance lists INV-2041, INV-2044, and INV-2047 for $24,500, $18,750, and $18,000, which total the deposit.",
  [
    "Cascade deposited $61,250 on September 24.",
    "Its remittance lists INV-2041, INV-2044, and INV-2047.",
    "Those invoices total $61,250: $24,500, $18,750, and $18,000."
  ],
  evidence(
    95,
    proof(
      "amount",
      "Exact subset sum",
      "$24,500 + $18,750 + $18,000 = $61,250"
    ),
    proof(
      "document",
      "Remittance",
      "Advice lists INV-2041, INV-2044, and INV-2047"
    )
  ),
  0,
  { attachmentIds: ["cascade-remittance"] }
)
propose(
  "r13",
  "names",
  "match",
  "Pair contractor payments by payee name",
  "Both contractor payments are $4,000 and dated September 15. The bank descriptions name CHEN and OKAFOR, matching Lin Chen and Emeka Okafor.",
  [
    "Both contractor payments are $4,000 and dated September 15.",
    "The bank descriptions name CHEN and OKAFOR, matching Lin Chen and Emeka Okafor."
  ],
  [
    factor("amount", "Amount", "Both payments are $4,000.00", 1, 0.15),
    factor("date", "Date", "Both bank and book dates are 9/15", 1, 0.15),
    factor(
      "payee",
      "Names",
      "CHEN ↔ Lin Chen · OKAFOR ↔ Emeka Okafor",
      0.95,
      0.6
    ),
    factor(
      "reference",
      "Payment detail",
      "Gusto contractor payment descriptions identify each surname",
      0.9,
      0.1
    ),
  ],
  0,
  {
    pairings: [
      { bankIds: ["r13-bank-chen"], bookIds: ["r13-book-chen"] },
      { bankIds: ["r13-bank-okafor"], bookIds: ["r13-book-okafor"] },
    ],
  }
)
propose(
  "r13",
  "rows",
  "match",
  "Pair contractor payments by row order",
  "Both contractor payments are $4,000 and dated September 15. Pairing by row order matches Chen to Okafor and Okafor to Chen, so the amounts agree but the payees are wrong.",
  [
    "Both contractor payments are $4,000 and dated September 15.",
    "Row order pairs Chen with Okafor and Okafor with Chen, so the payee names do not match."
  ],
  evidence(
    52,
    proof("amount", "Amounts", "Both bank and book rows are $4,000.00"),
    proof("payee", "Names", "Chen ↔ Okafor · Okafor ↔ Chen: payee names differ")
  ),
  0,
  {
    pairings: [
      {
        bankIds: ["r13-bank-chen"],
        bookIds: ["r13-book-okafor"],
        warning: "Payee names differ",
      },
      {
        bankIds: ["r13-bank-okafor"],
        bookIds: ["r13-book-chen"],
        warning: "Payee names differ",
      },
    ],
  }
)
propose(
  "r14",
  "reverse-void",
  "reverse_void",
  "Reverse the backdated void of check #4098 in September",
  "Pinecrest check #4098 for $1,150 cleared August 26, but J. Alvarez voided it on September 12 with an August 28 date after August closed. Reverse the void in September to correct the $1,150 overstatement.",
  [
    "Pinecrest check #4098 for $1,150 cleared August 26.",
    "J. Alvarez voided it on September 12 with an August 28 date, after August closed.",
    "Reversing the void in September corrects the $1,150 overstatement."
  ],
  evidence(
    90,
    proof(
      "audit",
      "Void history",
      "J. Alvarez voided 9/12, effective 8/28 · August closed"
    ),
    proof(
      "feed",
      "Cleared check",
      "#4098 · Pinecrest Facilities · $1,150.00 · cleared 8/26"
    )
  ),
  -115000,
  {
    entries: adjustment(
      -115000,
      "6100 · Facilities Expense",
      "September reversal of void for cleared check #4098"
    ),
    approval: {
      by: "daniel",
      reason: "Correcting entry that touches a closed period",
    },
    attachmentIds: ["void-audit"],
  }
)

/** One extra proposal per exception, created only by the first live Ember exchange. */
export const emberFollowUps: Record<string, Suggestion> = {}
function followUp(
  itemId: string,
  title: string,
  score: number,
  reasoning: string,
  extras: Partial<Suggestion> = {}
) {
  const original = items[itemId].suggestions[0]
  emberFollowUps[itemId] = {
    ...original,
    id: `${itemId}-ember-follow-up`,
    source: "ember",
    title,
    reasoning,
    reasons: [reasoning],
    factors: [factor("review", "Supporting evidence", reasoning, score / 100, 1)],
    confidence: score,
    ...extras,
  }
}
followUp("r01", "Match Google after invoice review", 93,
  "The Google invoice and payment both total $2,640. Send the invoice match to Daniel for review instead of relying on the bank alias history.",
  { approval: { by: "daniel", reason: "Review invoice support for the Google alias" } })
followUp("r02", "Split the charge between service and other bank fees", 76,
  "Chase charged $285.40, up $5.55 from August. Book $279.85 to Bank Service Charges and the $5.55 increase to Bank Fees – Other.",
  { entries: [
    { account: "6820 · Bank Service Charges", debit: 27985, credit: 0 },
    { account: "6800 · Bank Fees – Other", debit: 555, credit: 0 },
    { account: cash, debit: 0, credit: 28540 },
  ] })
followUp("r03", "Apply the interest credit to accrued interest", 74,
  "Chase credited $3,912.07 on September 30. Apply it to Interest Receivable and ask Daniel to confirm the accrual before completing the reconciliation.",
  { entries: adjustment(391207, "1250 · Interest Receivable"),
    approval: { by: "daniel", reason: "Confirm the interest accrual" } })
followUp("r04", "Record Notion from the invoice as a prepaid journal", 94,
  "Invoice NTN-88213 covers 40 seats for $9,600 from September through August. Record a prepaid software journal against the bank payment and spread the cost over 12 months.",
  { action: "create_je", attachmentIds: ["notion-invoice"], invoiceNumber: "NTN-88213" })
followUp("r05", "Send the outstanding check to Daniel for review", 86,
  "Check #4127 for $3,850 is absent from the September statement. Carry it as outstanding and require Daniel’s review of the attached check before closing the item.",
  { approval: { by: "daniel", reason: "Review the outstanding check copy" } })
followUp("r06", "Review Meridian’s October posting before sign-off", 97,
  "Chase’s October 1 feed identifies the $86,400 Meridian wire as FW-100126-7731. Keep the September deposit in transit and send the posting evidence to Daniel for sign-off.",
  { approval: { by: "daniel", reason: "Review subsequent clearing of the deposit" } })
followUp("r07", "Match AWS and return $180 to accounts payable", 79,
  "The AWS invoice and bank payment are $18,240, but the recorded payment is $18,420. Match the bank debit and credit the $180 payment overstatement back to Accounts Payable.",
  { action: "match_adjust", entries: adjustment(18000, "2000 · Accounts Payable") })
followUp("r08", "Write off Northstar’s $25 difference", 72,
  "Northstar’s $47,975 deposit is $25 below the recorded receipt. Match the receipt and book the difference to Small Balance Write-offs, with Daniel’s approval.",
  { entries: adjustment(-2500, "6810 · Small Balance Write-offs") })
followUp("r09", "Book Harbour’s difference to FX clearing", 77,
  "Chase paid $12,712.56 against Harbour’s $12,649.58 book entry. Put the $62.98 difference in FX Clearing for Daniel to review against the exchange confirmation.",
  { entries: adjustment(-6298, "1290 · FX Clearing"),
    approval: { by: "daniel", reason: "Review the exchange difference in FX Clearing" } })
followUp("r10", "Route the Kestrel match for Daniel’s sign-off", 94,
  "Kestrel’s $12,500 wire cleared September 16, five days after booking. Match the amounts and route the date exception to Daniel, who released the wire.",
  { approval: { by: "daniel", reason: "Confirm the five-day wire approval delay" } })
followUp("r11", "Keep the Datadog bill and offset the duplicate in clearing", 78,
  "The bank shows one $6,840 Datadog payment and the books show two. Keep the bill payment matched and offset JE-7712 through Duplicate Payment Clearing for Daniel’s review.",
  { action: "match_adjust", entries: adjustment(684000, "1295 · Duplicate Payment Clearing"),
    approval: { by: "daniel", reason: "Review the duplicate offset before clearing it" } })
followUp("r12", "Match Cascade after remittance sign-off", 97,
  "Cascade’s $61,250 remittance names all three invoices and matches their total. Send the allocation to Daniel for sign-off before completing the three-invoice match.",
  { approval: { by: "daniel", reason: "Review the three-invoice remittance allocation" } })
followUp("r13", "Match the two contractors as one payroll batch", 88,
  "The two September 15 Gusto debits total $8,000, matching the two contractor entries. Reconcile them as one payroll batch instead of assigning individual bank-to-book pairs.",
  { action: "match_many", pairings: [{ bankIds: [...items.r13.bankIds], bookIds: [...items.r13.bookIds] }] })
followUp("r14", "Correct the void through prior-period adjustments", 82,
  "Check #4098 cleared for $1,150 before its backdated void. Post the September correction to Prior-period Adjustments and send it to Daniel for approval.",
  { entries: adjustment(-115000, "3200 · Prior-period Adjustments") })

const attachmentList: Attachment[] = [
  {
    id: "google-invoice",
    kind: "invoice",
    title: "Google Workspace — September seats",
    from: "Google LLC",
    number: "GW-SEP26-4281",
    date: "2026-09-01",
    lines: [
      { label: "Google Workspace Business Plus · 120 seats", amount: 264000 },
    ],
    total: 264000,
    note: "Paid September 2; bank descriptor GOOGLE *GSUITE_ARBORANA.",
  },
  {
    id: "notion-invoice",
    kind: "invoice",
    title: "Notion Plus — annual, 40 seats",
    from: "Notion Labs, Inc.",
    number: "NTN-88213",
    date: "2026-09-19",
    lines: [
      { label: "40 seats · annual plan · Sep 2026–Aug 2027", amount: 960000 },
    ],
    total: 960000,
    note: "Emailed to the AP inbox on September 19; unprocessed. Amortize over 12 months.",
  },
  {
    id: "check-4127",
    kind: "check",
    title: "Check #4127 copy",
    from: "Arbor Analytics, Inc.",
    number: "4127",
    date: "2026-09-30",
    lines: [{ label: "Pay to Evergreen Movers", amount: 385000 }],
    total: 385000,
    note: "Issued September 30; not present on the September statement. Median clearing time: 6 business days.",
  },
  {
    id: "meridian-feed",
    kind: "feed",
    title: "Chase live feed — Meridian wire",
    from: "Chase",
    number: "FW-100126-7731",
    date: "2026-10-01",
    lines: [{ label: "WIRE IN MERIDIAN LABS · INV-1187", amount: 8640000 }],
    total: 8640000,
    note: "Posted October 1, after the September statement cutoff.",
  },
  {
    id: "aws-invoice",
    kind: "invoice",
    title: "AWS — August usage",
    from: "Amazon Web Services",
    number: "AWS-2026-08-7719",
    date: "2026-09-01",
    lines: [
      { label: "EC2 compute", amount: 1082000 },
      { label: "RDS databases", amount: 426000 },
      { label: "S3 storage", amount: 186000 },
      { label: "Data transfer", amount: 130000 },
    ],
    total: 1824000,
    note: "AP bill was entered as $18,420.00; invoice total is $18,240.00.",
  },
  {
    id: "northstar-invoice",
    kind: "invoice",
    title: "Northstar Health — platform subscription",
    from: "Arbor Analytics, Inc.",
    number: "INV-1162",
    date: "2026-09-01",
    lines: [{ label: "Northstar Health subscription", amount: 4800000 }],
    total: 4800000,
  },
  {
    id: "northstar-wire",
    kind: "bank_detail",
    title: "Northstar incoming-wire advice",
    from: "Chase",
    number: "NH-48000",
    date: "2026-09-22",
    lines: [
      { label: "Gross wire received", amount: 4800000 },
      { label: "Incoming-wire fee", amount: -2500 },
    ],
    total: 4797500,
    note: "Net amount credited to Chase Operating.",
  },
  {
    id: "harbour-invoice",
    kind: "invoice",
    title: "Harbour & Co — consulting invoice",
    from: "Harbour & Co Ltd.",
    number: "HC-2291",
    date: "2026-09-10",
    lines: [
      { label: "Consulting services · original currency GBP £10,000.00" },
      { label: "USD carrying amount at GBP/USD 1.264958", amount: 1264958 },
    ],
    total: 1264958,
    note: "All numeric monetary fields are USD cents; the original GBP amount is stated in the label.",
  },
  {
    id: "chase-fx",
    kind: "bank_detail",
    title: "Chase foreign-exchange confirmation",
    from: "Chase",
    number: "FX-091726-HC",
    date: "2026-09-17",
    lines: [
      { label: "GBP £10,000.00 converted at 1.271256", amount: 1271256 },
      { label: "Book carrying amount", amount: -1264958 },
    ],
    total: 6298,
    note: "Cash paid $12,712.56; realized exchange loss $62.98.",
  },
  {
    id: "datadog-bill",
    kind: "invoice",
    title: "Datadog — August invoice",
    from: "Datadog, Inc.",
    number: "DD-2026-08-3912",
    date: "2026-09-01",
    lines: [{ label: "August infrastructure monitoring", amount: 684000 }],
    total: 684000,
    note: "Synced bill payment posted September 12.",
  },
  {
    id: "datadog-je",
    kind: "audit",
    title: "Journal 0007712 · JE-7712",
    from: "Priya Shah",
    number: "0007712",
    date: "2026-09-12",
    lines: [
      { label: "Debit 6150 · Software Subscriptions", amount: 684000 },
      { label: "Credit 1010 · Chase Operating", amount: -684000 },
    ],
    total: 0,
    note: "Manual Datadog August accrual/payment posted before the same bill synced. Duplicate cash credit: $6,840.00.",
  },
  {
    id: "cascade-remittance",
    kind: "remittance",
    title: "Cascade Outdoor — payment remittance",
    from: "Cascade Outdoor Co.",
    number: "CO-092426",
    date: "2026-09-24",
    lines: [
      { label: "INV-2041", amount: 2450000 },
      { label: "INV-2044", amount: 1875000 },
      { label: "INV-2047", amount: 1800000 },
    ],
    total: 6125000,
    note: "One ACH payment covers all three invoices.",
  },
  {
    id: "void-audit",
    kind: "audit",
    title: "Check #4098 — backdated void audit",
    from: "Campfire audit log",
    number: "4098",
    date: "2026-09-12",
    lines: [
      {
        label: "Pinecrest Facilities · check cleared August 26",
        amount: -115000,
      },
      {
        label: "Void posted by J. Alvarez on September 12, effective August 28",
        amount: 115000,
      },
    ],
    total: 0,
    note: "August is closed. Void inflated the August 31 GL by $1,150.00; reverse the void in September with Daniel’s approval.",
  },
]
const attachments = Object.fromEntries(
  attachmentList.map((entry) => [entry.id, entry])
)
for (const item of Object.values(items))
  item.attachmentIds = [
    ...new Set(
      item.suggestions.flatMap((suggestion) => suggestion.attachmentIds ?? [])
    ),
  ]

// Generated matched activity: one Stripe payout each September weekday, then recurring and operating transactions.
const weekdays = [
  1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29,
  30,
]
let autoCount = 0
function auto(
  day: number,
  bankDescription: string,
  bookDescription: string,
  amount: number,
  payee: string,
  type?: BookLine["type"]
): ReconItem {
  const id = `auto-${String(++autoCount).padStart(3, "0")}`
  const bankId = `${id}-bank`
  const bookId = `${id}-book`
  const dayText = String(day).padStart(2, "0")
  const earlier = [0, 1, 2].filter((gap) => weekdays.includes(day - gap))
  const bookDay = day - earlier[integer(0, earlier.length - 1)]
  const score = integer(95, 100)
  const factors = [
    factor("amount", "Amount", "$0.00 difference", 1, 0.5),
    factor(
      "reference",
      "Reference",
      "Payment reference and payee match",
      (score - 50) / 50,
      0.5
    ),
  ]
  const suggestion: Suggestion = {
    id: `${id}-match`,
    itemId: id,
    action: "match",
    title: `Match ${bookDescription}`,
    reasoning: `The bank and books both show $${(Math.abs(amount) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${payee}. ${bookDay === day ? `Both entries are dated September ${day}.` : `It was booked September ${bookDay} and cleared September ${day}.`}`,
    reasons: [
      `The bank and books both show $${(Math.abs(amount) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for ${payee}.`,
      bookDay === day
        ? `Both entries are dated September ${day}.`
        : `It was booked September ${bookDay} and cleared September ${day}.`,
    ],
    factors,
    confidence: confidence(factors),
    bankIds: [bankId],
    bookIds: [bookId],
    bookDelta: 0,
    source: "matcher",
  }
  bankLines[bankId] = {
    id: bankId,
    itemId: id,
    date: `2026-09-${dayText}`,
    description: bankDescription,
    amount,
    payee,
  }
  bookLines[bookId] = {
    id: bookId,
    itemId: id,
    date: `2026-09-${String(bookDay).padStart(2, "0")}`,
    description: bookDescription,
    amount,
    payee,
    journal: String(1000 + autoCount).padStart(7, "0"),
    type: type ?? (amount > 0 ? "receipt" : "payment"),
  }
  const item: ReconItem = {
    id,
    kind: "auto",
    title: bookDescription,
    status: "resolved",
    bankIds: [bankId],
    bookIds: [bookId],
    suggestions: [suggestion],
    hidden: [],
    surfacedIds: [],
    attachmentIds: [],
    pairings: [{ bankIds: [bankId], bookIds: [bookId] }],
    acceptedSuggestionId: suggestion.id,
    resolution: suggestion,
    confidence: score,
    matchedBy: random() < 0.7 ? "rule" : "ai",
  }
  items[id] = item
  return item
}
const day = (): number => weekdays[integer(0, weekdays.length - 1)]
for (const date of weekdays)
  auto(
    date,
    `STRIPE TRANSFER ST-${integer(1000, 9999)}`,
    `Stripe payout 9/${date}`,
    integer(600000, 1700000),
    "Stripe"
  )
const customers = [
  "Juniper Retail",
  "Atlas Robotics",
  "Summit Logistics",
  "Cedar Health",
  "Redwood Energy",
  "Brookfield Media",
  "Lumen Education",
  "Westhaven Foods",
  "Stonebridge Capital",
  "Oakridge Systems",
  "Silverline Design",
  "Bluewater Travel",
]
for (let index = 0; index < 36; index++) {
  const customer = customers[index % customers.length]
  const invoice = `INV-${2100 + index}`
  auto(
    day(),
    `${index % 3 === 0 ? "WIRE IN" : "ACH CREDIT"} ${customer.toUpperCase()} ${invoice}`,
    `${customer} — ${invoice} payment`,
    integer(450000, 1700000),
    customer
  )
}
auto(
  15,
  "GUSTO PAYROLL ACH 091526 ARBOR",
  "Gusto payroll — September 15",
  -28876432,
  "Gusto"
)
auto(
  30,
  "GUSTO PAYROLL ACH 093026 ARBOR",
  "Gusto payroll — September 30",
  -29318675,
  "Gusto"
)
auto(
  16,
  "IRS USATAXPYMT EFTPS 091626",
  "EFTPS — midmonth payroll taxes",
  -6354210,
  "IRS EFTPS"
)
auto(
  30,
  "IRS USATAXPYMT EFTPS 093026",
  "EFTPS — month-end payroll taxes",
  -6478330,
  "IRS EFTPS"
)
auto(
  16,
  "GUIDELINE 401K ACH PLAN ARBOR",
  "Guideline 401(k) — September 15 payroll",
  -1532450,
  "Guideline"
)
auto(
  30,
  "GUIDELINE 401K ACH PLAN ARBOR",
  "Guideline 401(k) — September 30 payroll",
  -1576320,
  "Guideline"
)
auto(
  1,
  "WEWORK 524 BROADWAY RENT SEP",
  "WeWork — September office rent",
  -4875000,
  "WeWork"
)
auto(
  4,
  "RAMP CARD PAYMENT ACH 090426",
  "Ramp card payment — August statement",
  -7234812,
  "Ramp"
)
auto(
  25,
  "RAMP CARD PAYMENT ACH 092526",
  "Ramp card payment — September interim",
  -5126420,
  "Ramp"
)
auto(
  3,
  "HARTFORD INSURANCE ACH PREMIUM",
  "Hartford — business insurance premium",
  -286400,
  "Hartford"
)
const subscriptions: [string, string, number][] = [
  ["SLACK TECHNOLOGIES", "Slack", 184500],
  ["FIGMA INC", "Figma", 98500],
  ["SALESFORCE COM", "Salesforce", 672000],
  ["GITHUB INC", "GitHub", 126000],
  ["ZOOM VIDEO COMM", "Zoom", 48900],
  ["ATLASSIAN PTY LTD", "Atlassian", 216400],
  ["LINEAR APP", "Linear", 62400],
  ["RIPPLING PEOPLE CTR", "Rippling", 173200],
  ["1PASSWORD", "1Password", 38900],
  ["VERCEL INC", "Vercel", 86400],
  ["ANTHROPIC PBC", "Anthropic", 94200],
  ["OPENAI BUSINESS", "OpenAI", 108000],
]
for (const [description, vendor, amount] of subscriptions)
  auto(
    day(),
    `${description} SUBSCRIPTION SEP26`,
    `${vendor} — September subscription`,
    -amount,
    vendor
  )
for (const [description, vendor, amount] of [
  ["CON EDISON AUTOPAY", "Con Edison", 84723],
  ["VERIZON BUSINESS ACH", "Verizon", 49800],
  ["SPECTRUM BUSINESS", "Spectrum", 32900],
  ["NYC WATER FINANCE", "NYC Water", 18642],
] as const)
  auto(day(), description, `${vendor} — September service`, -amount, vendor)
const travel = [
  "Delta Air Lines",
  "United Airlines",
  "Amtrak",
  "Marriott",
  "Hilton",
  "Uber for Business",
]
for (let index = 0; index < 18; index++) {
  const vendor = travel[index % travel.length]
  auto(
    day(),
    `${vendor.toUpperCase()} TRVL ${integer(100000, 999999)}`,
    `${vendor} — customer visit ${Math.floor(index / 6) + 1}`,
    -integer(14000, 145000),
    vendor
  )
}
for (let index = 0; index < 15; index++) {
  const customer = customers[index % customers.length]
  auto(
    day(),
    `ACH DEBIT REFUND ${customer.toUpperCase()} RF${400 + index}`,
    `${customer} — unused-seat refund RF-${400 + index}`,
    -integer(9000, 68000),
    customer
  )
}
const vendors = [
  "Brightside Research",
  "Apex Data Services",
  "Spruce Legal",
  "Horizon Recruiting",
  "Union Print",
  "Clearpath Security",
  "Maple Consulting",
  "Beacon Events",
  "Riverbend Translation",
  "Metro Courier",
]
for (let index = 0; index < 50; index++) {
  const vendor = vendors[index % vendors.length]
  auto(
    day(),
    `ACH DEBIT ${vendor.toUpperCase()} PMT ${integer(10000, 99999)}`,
    `${vendor} — service invoice ${3300 + index}`,
    -integer(50000, 340000),
    vendor
  )
}
auto(
  11,
  "TRANSFER FROM SAVINGS ••2210 ONLINE",
  "Transfer from Savings ••2210",
  7500000,
  "Chase Savings",
  "transfer"
)
while (autoCount < 206) {
  const customer = customers[autoCount % customers.length]
  auto(
    day(),
    `ACH CREDIT ${customer.toUpperCase()} USAGE ${2300 + autoCount}`,
    `${customer} — usage invoice INV-${2300 + autoCount}`,
    integer(120000, 540000),
    customer
  )
}
const autoSumBeforeTransfer = Object.values(bankLines)
  .filter((line) => items[line.itemId].kind === "auto")
  .reduce((sum, line) => sum + line.amount, 0)
export const balancingTransferAmount = -50788896 - autoSumBeforeTransfer
if (
  balancingTransferAmount >= 0 ||
  Math.abs(balancingTransferAmount) < 500000 ||
  Math.abs(balancingTransferAmount) > 40000000
)
  throw new Error(
    `Savings balancing transfer is outside $5,000–$400,000: ${balancingTransferAmount} cents`
  )
auto(
  30,
  "TRANSFER TO SAVINGS ••2210 ONLINE",
  "Transfer to Savings ••2210",
  balancingTransferAmount,
  "Chase Savings",
  "transfer"
)

const threadList: Thread[] = [
  {
    id: "thread-r14",
    itemId: "r14",
    resolved: false,
    messages: [
      {
        id: "message-r14-1",
        author: "daniel",
        at: "2026-10-02T16:12:00-04:00",
        text: "Someone voided #4098 with an 8/28 date and August is closed. @Maya can you fix it in September? I'll approve.",
      },
      {
        id: "message-r14-2",
        author: "ember",
        at: "2026-10-02T16:13:00-04:00",
        text: "J. Alvarez voided #4098 on 9/12, effective 8/28. The check cleared 8/26. Reversing the void in September corrects the $1,150 beginning-balance discrepancy.",
      },
    ],
  },
  {
    id: "thread-r11",
    itemId: "r11",
    resolved: false,
    messages: [
      {
        id: "message-r11-1",
        author: "priya",
        at: "2026-10-01T10:40:00-04:00",
        text: "I posted JE-7712 by hand before the Datadog bill synced. That one's a dupe, sorry.",
      },
    ],
  },
  {
    id: "thread-r08",
    itemId: "r08",
    resolved: false,
    messages: [
      {
        id: "message-r08-1",
        author: "daniel",
        at: "2026-10-01T09:05:00-04:00",
        text: "Wire fees under $50 can go to 6820. Just route it to me.",
      },
    ],
  },
  {
    id: "thread-r09",
    itemId: "r09",
    resolved: false,
    messages: [
      {
        id: "message-r09-1",
        author: "priya",
        at: "2026-09-30T15:22:00-04:00",
        text: "Harbour invoiced £10,000. We booked it at 1.264958; Chase converted at 1.271256.",
      },
    ],
  },
]
export const seed: ReconState = {
  company: "Arbor Analytics, Inc.",
  account: "1010 · Chase Operating ••4821",
  period: "2026-09",
  workedOn: "2026-10-05",
  statementOpening: 941288643,
  statementEnding: 894731658,
  previousReconciledEnding: 941288643,
  glOpeningBalance: 941403643,
  glBalance: 903005789,
  bankLines,
  bookLines,
  items,
  attachments,
  threads: Object.fromEntries(threadList.map((thread) => [thread.id, thread])),
  teammates: {
    maya: {
      id: "maya",
      name: "Maya Patel",
      role: "Staff Accountant",
      initials: "MP",
      email: "maya@arboranalytics.com",
    },
    daniel: {
      id: "daniel",
      name: "Daniel Kim",
      role: "Controller",
      initials: "DK",
      email: "daniel@arboranalytics.com",
    },
    priya: {
      id: "priya",
      name: "Priya Shah",
      role: "AP Specialist",
      initials: "PS",
      email: "priya@arboranalytics.com",
    },
    ember: {
      id: "ember",
      name: "Ember",
      role: "Campfire agent",
      initials: "E",
    },
  },
  actions: [],
  clock: 0,
}

/** Use current fixture copy even when a saved session contains older suggestion text. */
export function suggestionReasons(suggestion: Suggestion): string[] {
  const item = seed.items[suggestion.itemId]
  const current = item && [...item.suggestions, ...item.hidden].find(candidate => candidate.id === suggestion.id)
  return current?.reasons ?? suggestion.reasons ?? [suggestion.reasoning]
}

/** Refresh card copy for saved sessions without changing their accounting data. */
export function suggestionSummary(suggestion: Suggestion): string {
  const item = seed.items[suggestion.itemId]
  const current = item && [...item.suggestions, ...item.hidden].find(candidate => candidate.id === suggestion.id)
  return current?.reasoning ?? suggestion.reasoning
}
