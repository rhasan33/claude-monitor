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
 * rate) are Anthropic's documented standard. The base $/Mtok rates were last
 * checked against Anthropic's published pricing on 2026-08-07 — re-check
 * https://www.anthropic.com/pricing and correct this file (it's the only
 * place cost numbers come from) when rates move or a new model ships.
 *
 * A model missing from this table costs $0 and raises a warning banner, so
 * adding new models here matters as much as keeping the rates current.
 *
 * Rows are matched by exact modelId + effective date range, so a rate
 * change over time is a new row, not an edit to history.
 */
export const MODEL_PRICING_TABLE: PricingRow[] = [
  row('claude-fable-5', 10, 50),
  row('claude-mythos-5', 10, 50),
  row('claude-opus-5', 5, 25),
  row('claude-opus-4-8', 5, 25),
  row('claude-opus-4-7', 5, 25),
  row('claude-opus-4-6', 5, 25),
  row('claude-opus-4-5', 5, 25),
  // Sonnet 5 ran at an introductory $2/$10 through 2026-08-31, so messages from
  // that window must keep costing the promotional rate after it lapses. The two
  // ranges don't overlap, so row order here doesn't matter.
  row('claude-sonnet-5', 2, 10, '2025-01-01', '2026-09-01'),
  row('claude-sonnet-5', 3, 15, '2026-09-01'),
  row('claude-sonnet-4-6', 3, 15),
  row('claude-sonnet-4-5', 3, 15),
  row('claude-haiku-4-5', 1, 5)
]

/** Anthropic's documented standard cache multipliers, relative to the input rate. */
function deriveCacheRates(inputPerMtok: number): Pick<PricingRow, 'cacheWrite5mPerMtok' | 'cacheWrite1hPerMtok' | 'cacheReadPerMtok'> {
  return {
    cacheWrite5mPerMtok: inputPerMtok * 1.25,
    cacheWrite1hPerMtok: inputPerMtok * 2,
    cacheReadPerMtok: inputPerMtok * 0.1
  }
}

function row(
  modelId: string,
  inputPerMtok: number,
  outputPerMtok: number,
  effectiveFrom = '2025-01-01',
  effectiveTo: string | null = null
): PricingRow {
  return {
    modelId,
    effectiveFrom,
    effectiveTo,
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

/**
 * Logs carry either a bare model alias (`claude-opus-4-8`) or a pinned snapshot
 * with a date suffix (`claude-haiku-4-5-20251001`) — the same model and the
 * same rates either way. Strip a trailing 8-digit date so one table row covers
 * both spellings; anything else is left alone.
 */
function stripDateSuffix(modelId: string): string {
  return modelId.replace(/-\d{8}$/, '')
}

function findPricingRow(
  table: PricingRow[],
  modelId: string,
  timestampMs: number
): PricingRow | undefined {
  const iso = new Date(timestampMs).toISOString()
  const inEffect = (r: PricingRow): boolean =>
    iso >= r.effectiveFrom && (r.effectiveTo === null || iso < r.effectiveTo)

  // Exact match wins, so a table entry for a specific snapshot still beats the
  // alias row it would otherwise fall back to.
  const exact = table.find((r) => r.modelId === modelId && inEffect(r))
  if (exact) return exact

  const undated = stripDateSuffix(modelId)
  if (undated === modelId) return undefined
  return table.find((r) => r.modelId === undated && inEffect(r))
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
