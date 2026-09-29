// Every published artifact, newest first. /version-control renders this list; each card opens the real page.
export type Medium = "Code" | "Brilliant" | "Paper" | "Story" | "References"

export interface Version {
  id: string
  version: string // e.g. "1.5"
  title: string
  medium: Medium
  at: string // ISO, America/New_York
  links: { label: string; href: string }[]
  changes: string[] // what's different in this version, ≤ 4 short lines
  commit?: string // short sha on GitHub
}

export const REPO = "https://github.com/vibhasjain/campfire-reconciliation"

const prototypes = (version: string) =>
  ["Workbench", "Paired ledger", "Flow"].map((name, index) => ({
    label: `v${index + 1} ${name}`,
    href: `/code/${version}/campfire${index + 1}`,
  }))

/** The three live prototypes: what the Code filter shows. v1 is the homepage. */
export const LIVE: Version[] = [
  {
    id: "live-v1",
    version: "v1",
    title: "Workbench",
    medium: "Code",
    at: "",
    links: [{ label: "v1 Workbench", href: "/" }],
    changes: [
      "A prioritized queue with a review sheet",
      "Ember suggests; accept, reject or tell it more",
      "Keyboard first: J K, A, E, O",
    ],
  },
  {
    id: "live-v2",
    version: "v2",
    title: "Paired ledger",
    medium: "Code",
    at: "",
    links: [{ label: "v2 Paired ledger", href: "/v2" }],
    changes: [
      "Books and bank side by side",
      "Ember's pairs pre-aligned",
      "Matching is reading across a line",
    ],
  },
  {
    id: "live-v3",
    version: "v3",
    title: "Flow",
    medium: "Code",
    at: "",
    links: [{ label: "v3 Flow", href: "/v3" }],
    changes: [
      "One decision at a time",
      "Accept and the next arrives",
      "The difference closes to $0.00",
    ],
  },
]

export const VERSIONS: Version[] = [
  {
    id: "code-1.5",
    version: "1.5",
    title: "Prototypes: round 4 polish",
    medium: "Code",
    at: "2026-09-27T16:24:00-04:00",
    links: prototypes("1.5"),
    changes: [
      "Expand the confidence label to see the transaction facts behind each suggestion.",
      "The done state says “Balanced · ready to submit” until Maya submits to Daniel.",
      "Phones show one toast at a time, so it can't cover progress.",
    ],
    commit: "8b4078f",
  },
  {
    id: "code-1.4",
    version: "1.4",
    title: "Prototypes: round 3 fixes",
    medium: "Code",
    at: "2026-09-27T16:09:00-04:00",
    links: prototypes("1.4"),
    changes: [
      "A compact done state replaces the CSS overrides that blanked v1 and v2's finish.",
      "Phone toasts moved to the top, clear of Accept and Reject.",
      "Item amounts are signed the same way everywhere, chat included.",
    ],
    commit: "76e05d1",
  },
  {
    id: "code-1.3",
    version: "1.3",
    title: "Prototypes: usability round 2 fixes",
    medium: "Code",
    at: "2026-09-27T15:48:00-04:00",
    links: prototypes("1.3"),
    changes: [
      "Work survives a reload; ⌘K → Reset demo starts over.",
      "One vocabulary: Send to Daniel, then Submit to Daniel, then “Submitted · waiting on Daniel”.",
      "Ember's find becomes the item's suggestion, not a second card in the thread.",
      "Timing items come first, so the difference closes toward $0.00 as she works.",
    ],
    commit: "607aca0",
  },
  {
    id: "code-1.2",
    version: "1.2",
    title: "Prototypes: usability round 1 fixes",
    medium: "Code",
    at: "2026-09-27T15:28:00-04:00",
    links: prototypes("1.2"),
    changes: [
      "The why leads with facts (“Payee · alias seen 11×”); the formula becomes a footnote.",
      "Each suggestion shows what it does to the difference.",
      "Undo brings back the restored item; the composer never steals the A key.",
    ],
    commit: "7caae13",
  },
  {
    id: "code-1.1",
    version: "1.1",
    title: "Prototypes: first test fixes",
    medium: "Code",
    at: "2026-09-27T15:10:00-04:00",
    links: prototypes("1.1"),
    changes: [
      "Ember's changes stay on screen with their Revert when it resolves an item.",
      "v1 rows gain triage phrases (Match, Create JE, In transit).",
      "v2's connectors go quiet; v3's toast no longer covers the thumb-reach Accept.",
    ],
    commit: "40c7aee",
  },
  {
    id: "code-1.0",
    version: "1.0",
    title: "Prototypes: three UX bets on one core",
    medium: "Code",
    at: "2026-09-27T15:00:00-04:00",
    links: prototypes("1.0"),
    changes: [
      "v1 Workbench: a queue plus a side sheet. v2 Paired ledger: books and bank aligned. v3 Flow: one decision at a time.",
      "Shared core: suggestions with confidence and why, evidence, per-transaction threads with Ember, keyboard-first.",
    ],
    commit: "e5b3dc0",
  },
  {
    id: "story-1.0",
    version: "1.0",
    title: "Maya's close: storyboard",
    medium: "Story",
    at: "2026-09-27T14:53:00-04:00",
    links: [{ label: "Open the deck", href: "/story/" }],
    changes: [
      "Twelve illustrated frames: how Maya should feel before, during and after the close.",
      "Written from the voice notes; illustrations generated with Codex.",
    ],
    commit: "8033934",
  },
  {
    id: "a-1.1",
    version: "A 1.1",
    title: "Concept A: Workpaper, restraint pass",
    medium: "Brilliant",
    at: "2026-09-27T16:30:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/a-workpaper/#r2" }],
    changes: [
      "About two-thirds fewer words; routine items signed in one batch; the bridge carries the numbers.",
    ],
  },
  {
    id: "b-1.1",
    version: "B 1.1",
    title: "Concept B: Balance bridge, restraint pass",
    medium: "Brilliant",
    at: "2026-09-27T15:52:00-04:00",
    links: [
      { label: "Open the canvas", href: "/concepts/b-balance-bridge/#r2" },
    ],
    changes: [
      "54% fewer words; confidence only on the open suggestion; the keystone holds the difference.",
    ],
  },
  {
    id: "d-1.1",
    version: "D 1.1",
    title: "Concept D: Timeline, restraint pass",
    medium: "Paper",
    at: "2026-09-27T14:55:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/d-timeline/#r2" }],
    changes: [
      "Labels only on the selected mark; the difference becomes the headline; timing called out once at the cutoff.",
    ],
  },
  {
    id: "c-1.1",
    version: "C 1.1",
    title: "Concept C: Thread inbox, restraint pass",
    medium: "Paper",
    at: "2026-09-27T14:51:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/c-thread-inbox/#r2" }],
    changes: [
      "Half the text; one-line inbox rows; the proposal's ledger lines behind a “3 lines” disclosure.",
    ],
  },
  {
    id: "a-1.0",
    version: "A 1.0",
    title: "Concept A: Workpaper",
    medium: "Brilliant",
    at: "2026-09-27T14:55:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/a-workpaper/" }],
    changes: [
      "Ember drafts the reconciliation as a workpaper; Maya signs by exception; the signed workpaper is the audit trail.",
    ],
  },
  {
    id: "d-1.0",
    version: "D 1.0",
    title: "Concept D: Timeline",
    medium: "Paper",
    at: "2026-09-27T14:48:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/d-timeline/" }],
    changes: [
      "September as a time axis: bank above, books below, the cutoff as a hard line; lag and cutoff crossings visible at a glance.",
    ],
  },
  {
    id: "b-1.0",
    version: "B 1.0",
    title: "Concept B: Balance bridge",
    medium: "Brilliant",
    at: "2026-09-27T14:41:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/b-balance-bridge/" }],
    changes: [
      "The difference is the interface: each exception is a plank on a bank-to-book bridge that closes at $0.00.",
    ],
  },
  {
    id: "c-1.0",
    version: "C 1.0",
    title: "Concept C: Thread inbox",
    medium: "Paper",
    at: "2026-09-27T14:29:00-04:00",
    links: [{ label: "Open the canvas", href: "/concepts/c-thread-inbox/" }],
    changes: [
      "The reconciliation as an inbox of 14 threads that each open with Ember's proposal; done means inbox zero.",
    ],
  },
  {
    id: "references-1.0",
    version: "1.0",
    title: "References",
    medium: "References",
    at: "2026-09-27T13:05:00-04:00",
    links: [{ label: "Browse", href: "/references" }],
    changes: [
      "Campfire's reconciliation today, plus how Rillet and Numeric approach matching: the context behind the choices.",
    ],
  },
]
