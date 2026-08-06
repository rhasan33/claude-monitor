// Fixed categorical order (see styles/global.css) — colors are assigned by
// entity identity, never by rank, so a filtered-out series never repaints
// the ones that remain.
const CATEGORICAL_SLOTS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)'
] as const

export const TOKEN_TYPE_COLORS = {
  inputTokens: CATEGORICAL_SLOTS[0],
  outputTokens: CATEGORICAL_SLOTS[1],
  cacheCreationInputTokens: CATEGORICAL_SLOTS[2],
  cacheReadInputTokens: CATEGORICAL_SLOTS[3]
} as const

const seriesSlotCache = new Map<string, string>()

/** Stable color per series key (model name, tool name, ...): first-seen order claims the next free slot, then holds it. */
export function colorForSeries(key: string): string {
  const cached = seriesSlotCache.get(key)
  if (cached) return cached
  const nextSlot = CATEGORICAL_SLOTS[seriesSlotCache.size % CATEGORICAL_SLOTS.length]
  seriesSlotCache.set(key, nextSlot)
  return nextSlot
}
