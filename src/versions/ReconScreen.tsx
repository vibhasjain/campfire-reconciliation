import { SkeletonRows } from "@/components/common/Skeleton"

export default function ReconScreen({ version }: { version: 1 | 2 | 3 }) {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-5 py-8 lg:px-9" data-version={version}>
      <h1 className="text-2xl font-semibold tracking-tight">Chase Operating ••4821</h1>
      <p className="mt-1.5 text-fg-3">September 2026 · Business day 3</p>
      <div className="mt-7 overflow-hidden rounded-lg border border-line bg-surface py-3" aria-label="Reconciliation placeholder">
        <SkeletonRows rows={6} rowHeight={56} />
      </div>
    </section>
  )
}
