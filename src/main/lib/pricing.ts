import type { PricingOverride, TokenUsage } from '../../shared/types'

export interface PricingRow {
  modelId: string
  effectiveFrom: string // ISO date, inclusive
  effectiveTo: string | null // ISO date, exclusive; null = still current
  inputPerMtok: number
  outputPerMtok: number
  cacheWrite5mPerMtok: number
  cacheWrite1hPerMtok: number
  cacheReadPerMtok: number
}

/**
 * VERIFY BEFORE TRUSTING COST NUMBERS: Claude Code's logs don't record a
 * cost field, so every dollar figure in this app is derived from this table.
 * The cache-write/read multipliers below (1.25x / 2x / 0.1x of the input
 * rate) are Anthropic's documented standard, but the base $/Mtok rates are a
 * best-effort seed — check https://www.anthropic.com/pricing and correct
 * this file (it's the only place cost numbers come from) before relying on
 * totals for anything beyond a rough estimate.
 *
 * Rows are matched by exact modelId + effective date range, so a rate
 * change over time is a new row, not an edit to history.
 */
export const MODEL_PRICING_TABLE: PricingRow[] = [
  row('claude-opus-5', 15, 75),
  row('claude-opus-4-5', 15, 75),
  row('claude-sonnet-5', 3, 15),
  row('claude-sonnet-4-5', 3, 15),
  row('claude-sonnet-4-6', 3, 15),
  row('claude-haiku-4-5', 1, 5),
  row('claude-fable-5', 15, 75)
]

/** Anthropic's documented standard cache multipliers, relative to the input rate. */
function deriveCacheRates(inputPerMtok: number): Pick<PricingRow, 'cacheWrite5mPerMtok' | 'cacheWrite1hPerMtok' | 'cacheReadPerMtok'> {
  return {
    cacheWrite5mPerMtok: inputPerMtok * 1.25,
    cacheWrite1hPerMtok: inputPerMtok * 2,
    cacheReadPerMtok: inputPerMtok * 0.1
  }
}

function row(modelId: string, inputPerMtok: number, outputPerMtok: number): PricingRow {
  return {
    modelId,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    inputPerMtok,
    outputPerMtok,
    ...deriveCacheRates(inputPerMtok)
  }
}

/**
 * Applies user-supplied rate overrides on top of the built-in table, for
 * models the built-in table doesn't have yet or has wrong. An override
 * replaces every row for that modelId with a single always-effective row —
 * overrides aren't trying to model historical rate changes, just "use this
 * rate instead." Cache rates are re-derived from the same standard
 * multipliers as the built-in table.
 */
export function applyPricingOverrides(table: PricingRow[], overrides: PricingOverride[]): PricingRow[] {
  if (overrides.length === 0) return table
  const overriddenIds = new Set(overrides.map((o) => o.modelId))
  const kept = table.filter((r) => !overriddenIds.has(r.modelId))
  const replaced = overrides.map((o) => row(o.modelId, o.inputPerMtok, o.outputPerMtok))
  return [...kept, ...replaced]
}

function findPricingRow(
  table: PricingRow[],
  modelId: string,
  timestampMs: number
): PricingRow | undefined {
  const iso = new Date(timestampMs).toISOString()
  return table.find(
    (r) => r.modelId === modelId && iso >= r.effectiveFrom && (r.effectiveTo === null || iso < r.effectiveTo)
  )
}

export interface CostResult {
  costUsd: number
  /** false when no pricing row matched — the caller should surface this as a warning, not silently show $0. */
  matched: boolean
}

export function calculateCost(
  usage: TokenUsage,
  model: string | undefined,
  timestampMs: number,
  table: PricingRow[] = MODEL_PRICING_TABLE
): CostResult {
  if (!model) return { costUsd: 0, matched: false }
  const pricingRow = findPricingRow(table, model, timestampMs)
  if (!pricingRow) return { costUsd: 0, matched: false }

  // Older log lines may carry cache_creation_input_tokens without the
  // ephemeral_1h/5m breakdown; treat that remainder as 5m-tier (the default TTL).
  const unbucketedCacheCreation = Math.max(
    usage.cacheCreationInputTokens -
      usage.cacheCreationEphemeral1hTokens -
      usage.cacheCreationEphemeral5mTokens,
    0
  )

  const costUsd =
    (usage.inputTokens / 1_000_000) * pricingRow.inputPerMtok +
    (usage.outputTokens / 1_000_000) * pricingRow.outputPerMtok +
    (usage.cacheCreationEphemeral1hTokens / 1_000_000) * pricingRow.cacheWrite1hPerMtok +
    ((usage.cacheCreationEphemeral5mTokens + unbucketedCacheCreation) / 1_000_000) *
      pricingRow.cacheWrite5mPerMtok +
    (usage.cacheReadInputTokens / 1_000_000) * pricingRow.cacheReadPerMtok

  return { costUsd, matched: true }
}

/** What those cache-read tokens would have cost as fresh input, minus what they actually cost. */
export function estimateCacheSavingsUsd(
  cacheReadTokens: number,
  model: string | undefined,
  timestampMs: number,
  table: PricingRow[] = MODEL_PRICING_TABLE
): number {
  if (!model || cacheReadTokens <= 0) return 0
  const pricingRow = findPricingRow(table, model, timestampMs)
  if (!pricingRow) return 0
  return (cacheReadTokens / 1_000_000) * (pricingRow.inputPerMtok - pricingRow.cacheReadPerMtok)
}
