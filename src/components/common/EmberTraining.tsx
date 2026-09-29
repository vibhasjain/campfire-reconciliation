// "Training Ember": the Drive pixel-grid loader in Ember orange beside a shimmering label.
// Reduced motion freezes the grid and the shimmer (index.css).
const CHEVRON = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3)
  const col = i % 3
  return (col + Math.abs(row - 1)) * 90
})

export function EmberTraining({ label = "Training Ember" }: { label?: string }) {
  return (
    <span role="status" className="flex items-center gap-2">
      <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {CHEVRON.map((delay, index) => (
          <span
            key={index}
            className="ember-pixel size-1 rounded-[1px] bg-flame"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="ember-shimmer text-xs font-medium">{label}</span>
    </span>
  )
}
