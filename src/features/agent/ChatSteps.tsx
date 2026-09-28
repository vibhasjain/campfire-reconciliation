import { ActionTooltip } from "@/components/ui/tooltip"
// Tool-call list under the assistant label (agent §2.1 steps 3–8, §2.3): shimmering live status, icon rail with
// connectors, nested code/data/subagent details, grid-rows collapse (150ms), past-tense summary when done.
import { useState, type ReactNode } from "react"
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CodeXml,
  Copy,
  FileText,
  Globe,
  Lightbulb,
  ScanSearch,
  Search,
  Table2,
} from "lucide-react"
import type { MessagePart, ToolStep, ToolStepKind } from "@/data/types"
import { cn } from "@/lib/utils"
import { toast } from "@/components/common/toast"
import { EntityChip } from "@/components/common/EntityChip"
import { SkeletonBar } from "@/components/common/Skeleton"
import { ChatMarkdown } from "./ChatMarkdown"

type StepsPart = Extract<MessagePart, { type: "steps" }>

const ICON: Record<ToolStepKind, typeof Check> = {
  thought: Lightbulb,
  data: Table2,
  code: CodeXml,
  search: Search,
  web: Globe,
  calendar: Calendar,
  subagent: ScanSearch,
  file: FileText,
  done: Check,
}

/** Radix-free grid-rows collapse: 0fr ↔ 1fr + opacity, 150ms ease-in-out. */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-150 ease-in-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className
      )}
      inert={!open || undefined}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

export function ChatSteps({
  part,
  thinking,
}: {
  part: StepsPart
  thinking?: boolean
}) {
  const [open, setOpen] = useState(part.open)
  const [prev, setPrev] = useState(part.open)
  if (prev !== part.open) {
    setPrev(part.open)
    setOpen(part.open)
  }
  const steps = mergeSubagents(part.steps)
  return (
    <div data-slot="collapsible" className="flex flex-col">
      <button
        type="button"
        onClick={() => !part.live && setOpen((o) => !o)}
        className={cn(
          "group/trigger flex h-[18px] w-full items-center gap-1 text-left text-sm text-fg-4 transition-colors duration-150",
          !part.live && "hover:text-fg"
        )}
      >
        <span className={cn("break-words", part.live && "text-shimmer")}>
          {part.status}
        </span>
        {!part.live &&
          (open ? (
            <ChevronDown className="size-3.5 opacity-0 group-hover/trigger:opacity-100" />
          ) : (
            <ChevronRight className="size-3.5 opacity-0 group-hover/trigger:opacity-100" />
          ))}
      </button>
      <Collapse open={open}>
        <div
          className={cn(
            "flex flex-col pt-1.5",
            !part.live && "[&_[data-done-row]]:pointer-events-none"
          )}
        >
          {steps.map((s, i) => (
            <ToolStepRow
              key={s.step.id}
              step={s.step}
              extra={s.extra}
              live={part.live}
              last={i === steps.length - 1 && !(part.live && thinking)}
            />
          ))}
          {part.live && thinking && (
            <ToolStepRow
              step={{
                id: "thinking",
                kind: "thought",
                label: "Thinking...",
                state: "running",
              }}
              live
              last
            />
          )}
        </div>
      </Collapse>
    </div>
  )
}

/** Empty-label subagent steps stack into the preceding subagent card (parallel analyses). */
function mergeSubagents(steps: ToolStep[]) {
  const out: { step: ToolStep; extra: ToolStep[] }[] = []
  for (const s of steps) {
    const prev = out[out.length - 1]
    if (s.kind === "subagent" && !s.label && prev?.step.kind === "subagent")
      prev.extra.push(s)
    else out.push({ step: s, extra: [] })
  }
  return out
}

/** One step: 16px icon rail + 0.5px connector, 12px label, expandable details. */
export function ToolStepRow({
  step,
  extra = [],
  live,
  last,
}: {
  step: ToolStep
  extra?: ToolStep[]
  live?: boolean
  last?: boolean
}) {
  const Icon = ICON[step.kind]
  const hasDetail = !!(
    step.code !== undefined ||
    step.output ||
    step.error ||
    step.rows ||
    step.subagent ||
    step.file ||
    (step.sub && step.kind !== "done")
  )
  const running = step.state === "running"
  const [manual, setManual] = useState<boolean | null>(null)
  const open = manual ?? (live && running && hasDetail)
  const isDone = step.kind === "done"
  return (
    <div className="flex gap-1.5" data-done-row={isDone || undefined}>
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className="flex h-4 items-center">
          <Icon className="size-3.5 text-fg-4" strokeWidth={1.75} />
        </span>
        {!last && (
          <span className="my-1 min-h-2 w-0 flex-1 border-l-hair border-line-strong" />
        )}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col", !last && "pb-2")}>
        <button
          type="button"
          disabled={!hasDetail || isDone}
          onClick={() => setManual(!open)}
          className="flex h-4 min-w-0 items-center text-left text-xs text-fg-4 enabled:hover:text-fg-2"
        >
          <span
            className={cn(
              "break-words",
              running && step.id === "thinking" && "text-shimmer"
            )}
          >
            {step.label}
          </span>
        </button>
        {hasDetail && (
          <Collapse open={!!open}>
            <div className="flex flex-col gap-2 pt-2">
              {step.sub && <div className="text-xs text-fg-4">{step.sub}</div>}
              {step.file && <FileDetail step={step} />}
              {step.rows && !step.file && (
                <MiniTable rows={step.rows} loading={running} />
              )}
              {!step.rows && step.kind === "search" && running && (
                <MiniTable rows={[]} loading />
              )}
              {step.code !== undefined && <CodeCard step={step} />}
              {step.code === undefined && step.error && (
                <ErrorBlock text={step.error} />
              )}
              {step.subagent && <SubagentCard steps={[step, ...extra]} />}
            </div>
          </Collapse>
        )}
      </div>
    </div>
  )
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text).catch(() => {})
  toast("Copied to clipboard", { tone: "info" })
}

function CodeCard({ step }: { step: ToolStep }) {
  const generating = step.state === "running" && !step.code
  return (
    <div className="relative overflow-hidden rounded-md border-hair border-line bg-surface">
      <ActionTooltip label="Copy code">
        <button
          type="button"
          aria-label="Copy code"
          onClick={() => copy(step.code ?? "")}
          className="absolute top-2 right-2 z-10 text-fg-hint hover:text-fg-3"
        >
          <Copy className="size-3.5" />
        </button>
      </ActionTooltip>
      <pre className="max-h-[200px] overflow-auto px-4 py-3 font-mono text-[11px] leading-[14px] whitespace-pre-wrap text-accent-blue-text">
        {generating ? (
          <span className="text-shimmer">Generating...</span>
        ) : (
          step.code
        )}
      </pre>
      {step.output && (
        <div className="border-t-hair border-line px-3 py-2">
          <div className="pb-1 text-xxs text-fg-4">Output</div>
          <pre className="max-h-[160px] overflow-auto font-mono text-[11px] leading-[14px] whitespace-pre-wrap text-fg-2">
            {step.output}
          </pre>
        </div>
      )}
      {step.error && (
        <div className="border-t-hair border-line px-3 py-2">
          <div className="pb-1 text-xxs text-fg-4">Error</div>
          <ErrorBlock text={step.error} />
        </div>
      )}
    </div>
  )
}

function ErrorBlock({ text }: { text: string }) {
  return (
    <pre className="rounded-sm bg-danger-tint px-2 py-1.5 font-mono text-[11px] leading-[14px] whitespace-pre-wrap text-fg-2">
      {text}
    </pre>
  )
}

function MiniTable({ rows, loading }: { rows: string[][]; loading?: boolean }) {
  const [head = ["Item", "Status", "Details"], ...body] = rows
  return (
    <div className="rounded-md border-hair border-line bg-surface p-3">
      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-md border-hair border-line text-xxs">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="border-b-hair border-line px-4 py-2 text-left font-normal text-fg-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(body.length ? body : loading ? [[], []] : []).map((r, i, a) => (
            <tr key={i}>
              {head.map((_, j) => (
                <td
                  key={j}
                  className={cn(
                    "h-10 px-4 text-fg-2",
                    i < a.length - 1 && "border-b-hair border-line"
                  )}
                >
                  {r[j] ??
                    (j !== 1 && (
                      <span className="flex items-center gap-2">
                        <SkeletonBar width={14} height={14} />
                        <SkeletonBar width={80} height={18} />
                      </span>
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FileDetail({ step }: { step: ToolStep }) {
  const rows = step.rows ?? []
  const csv = rows.map((r) => r.join(",")).join("\n")
  return (
    <>
      <div className="text-xs text-fg-4">{step.file}</div>
      <div className="flex max-h-[200px] flex-col gap-2 overflow-auto rounded-md border-hair border-line bg-surface p-3 text-xxs text-fg-2">
        <div>
          <b className="font-medium">File:</b>{" "}
          <code className="rounded-sm bg-fill-hover px-1 font-mono">
            {step.file}
          </code>
        </div>
        {rows.length > 0 && (
          <>
            <div>
              <b className="font-medium">Rows:</b> {rows.length - 1}
            </div>
            <div>
              <b className="font-medium">Preview:</b>
            </div>
            <pre className="relative rounded-md bg-fill-subtle p-3 font-mono whitespace-pre-wrap text-fg-3">
              {csv.split("\n").slice(0, 8).join("\n")}
            </pre>
          </>
        )}
      </div>
    </>
  )
}

function SubagentCard({ steps }: { steps: ToolStep[] }) {
  return (
    <div className="flex flex-col rounded-md border-hair border-line bg-surface px-3">
      {steps.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "flex flex-col gap-2 py-3",
            i > 0 && "border-t-hair border-line"
          )}
        >
          {s.subagent && (
            <EntityChip
              entity={s.subagent.ref}
              variant="mention"
              className="self-start text-xxs text-fg-3"
            />
          )}
          {s.subagent?.markdown ? (
            <ChatMarkdown
              markdown={s.subagent.markdown}
              streaming={s.state === "running"}
              className="gap-2 text-xxs leading-[14px] font-normal tracking-normal text-fg-4"
            />
          ) : (
            <span className="text-shimmer text-xxs">Loading...</span>
          )}
        </div>
      ))}
    </div>
  )
}
