import { differenceInCalendarDays, format, isSameYear } from 'date-fns'

type DateIn = string | number | Date

const toDate = (d: DateIn) => (d instanceof Date ? d : new Date(d))

/** "just now", "10s ago", "2m ago", "1h ago", "3d ago", "2w ago", "3mo ago", "1y ago"; future → "in 2d". */
export function relTime(d: DateIn, now: DateIn = Date.now()): string {
  const diff = (toDate(now).getTime() - toDate(d).getTime()) / 1000
  const s = Math.abs(diff)
  if (s < 10) return 'just now'
  const units: [number, string][] = [[60, 's'], [60, 'm'], [24, 'h'], [7, 'd'], [52 / 12, 'w'], [12, 'mo'], [Infinity, 'y']]
  let v = s
  let label = 's'
  for (const [size, u] of units) {
    label = u
    if (v < size) break
    v /= size
  }
  // weeks overflow into months at ~4.3w; show whole numbers only
  const n = Math.max(1, Math.floor(v))
  return diff >= 0 ? `${n}${label} ago` : `in ${n}${label}`
}

export function isOverdue(d: DateIn | undefined, now: DateIn = Date.now()): boolean {
  return !!d && differenceInCalendarDays(toDate(d), toDate(now)) < 0
}

/** "Today", "Tomorrow", "Sep 30" ("Sep 30, 2027" other year); past → "20d ago" (render red via `isOverdue`). */
export function dueLabel(d: DateIn | undefined, now: DateIn = Date.now()): string {
  if (!d) return 'No due date'
  const date = toDate(d)
  const days = differenceInCalendarDays(date, toDate(now))
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${-days}d ago`
  return isSameYear(date, toDate(now)) ? format(date, 'MMM d') : format(date, 'MMM d, yyyy')
}

/** "Sep 26, 2026" */
export const fmtDate = (d: DateIn) => format(toDate(d), 'MMM d, yyyy')

/** "Dec 8, 2026 · 12:00pm" */
export const fmtDateTime = (d: DateIn) => format(toDate(d), "MMM d, yyyy '·' h:mmaaa")

/** "2:00 - 3:00 PM"; spans noon → "11:00 AM - 12:00 PM" */
export function fmtTimeRange(start: DateIn, end: DateIn): string {
  const a = toDate(start)
  const b = toDate(end)
  const same = format(a, 'a') === format(b, 'a')
  return `${format(a, same ? 'h:mm' : 'h:mm a')} - ${format(b, 'h:mm a')}`
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
/** "$36,000.00" */
export const fmtCurrency = (n: number) => usd.format(n)

/** "$16.7M", "$36K", "$4800" */
export function fmtCompactCurrency(n: number): string {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  const trim = (v: number) => (Math.round(v * 10) / 10).toString()
  if (a >= 1e9) return `${sign}$${trim(a / 1e9)}B`
  if (a >= 1e6) return `${sign}$${trim(a / 1e6)}M`
  if (a >= 1e4) return `${sign}$${trim(a / 1e3)}K`
  return `${sign}$${Math.round(a)}`
}

/** "(415) 555-0199"; with country code "+1 (617) 555-0142"; anything else unchanged. */
export function fmtPhone(p: string): string {
  const d = p.replace(/\D/g, '')
  const us = (x: string) => `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6)}`
  if (d.length === 10) return us(d)
  if (d.length === 11 && d[0] === '1') return `+1 ${us(d.slice(1))}`
  return p
}

/** "Avery Chen" → "AC", "v j" → "VJ", "Northbeam" → "N" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
