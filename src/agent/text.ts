// Streaming helpers shared by the engine and the renderer.

/**
 * Splits markdown into stream tokens: words (with trailing whitespace) for prose, whole lines for tables
 * (header + separator arrive together, then one row per token).
 */
export function tokenize(md: string): string[] {
  const out: string[] = []
  const lines = md.split(/(?<=\n)/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line.trimStart().startsWith('|')) {
      const next = lines[i + 1]
      if (next && /^\s*\|[\s:|-]+\|?\s*$/.test(next) && !/^\s*\|[\s:|-]+\|?\s*$/.test(line)) {
        out.push(line + next)
        i++
      } else out.push(line)
      continue
    }
    out.push(...(line.match(/\s*\S+\s*|\s+/g) ?? []))
  }
  return out
}

/** Closes a dangling `**` so a half-streamed bold doesn't flash raw asterisks. */
export function closeDangling(md: string): string {
  const n = (md.match(/\*\*/g) ?? []).length
  return n % 2 ? `${md}**` : md
}

const PAST: [RegExp, string][] = [
  [/^Retrieving and analyzing/, 'Retrieved and analyzed'],
  [/^Analyzing data and running/, 'Analyzed data and ran'],
  [/^Retrieving/, 'Retrieved'], [/^Executing/, 'Executed'], [/^Searching/, 'Searched'], [/^Analyzing/, 'Analyzed'],
  [/^Reading/, 'Read'], [/^Writing/, 'Wrote'], [/^Fetching/, 'Fetched'], [/^Creating/, 'Created'], [/^Drafting/, 'Drafted'],
  [/^Running/, 'Ran'], [/^Updating/, 'Updated'], [/^Saving/, 'Saved'], [/^Mapping/, 'Mapped'], [/^Checking/, 'Checked'],
  [/^Designing/, 'Designed'], [/^Researching/, 'Researched'], [/^Building/, 'Built'], [/^Looking up/, 'Looked up'],
]

/** "Retrieving reconciliation data" → "Retrieved reconciliation data"; "Thinking..." → "Thought". */
export function pastTense(label: string): string {
  if (/^Thinking/.test(label)) return 'Thought'
  for (const [re, to] of PAST) if (re.test(label)) return label.replace(re, to).replace(/\.\.\.$|…$/, '')
  return label
}
