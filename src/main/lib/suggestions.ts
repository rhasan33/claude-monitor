import type { AggregatedOverview, ProjectInsights, Suggestion, UsageSourceEvent } from '../../shared/types'
import { buildOverview } from './aggregator'
import { MODEL_PRICING_TABLE, type PricingRow } from './pricing'

// Below these floors, a project's numbers are too small for a ratio/share to
// mean anything — a couple of events shouldn't be enough to flag a project.
const MIN_CACHE_CREATION_TOKENS_FOR_SIGNAL = 100_000
const LOW_READ_TO_CREATION_RATIO = 1
const MIN_COST_FOR_MODEL_SIGNAL_USD = 1
const MODEL_COST_CONCENTRATION_THRESHOLD = 0.7
const MIN_MESSAGES_FOR_VERBOSITY_SIGNAL = 20
const VERBOSITY_MULTIPLIER_THRESHOLD = 1.5

function avgInputTokensPerMessage(overview: AggregatedOverview): number {
  return overview.totals.messageCount > 0 ? overview.totals.inputTokens / overview.totals.messageCount : 0
}

function lowCacheReuseSuggestion(project: AggregatedOverview): Suggestion | null {
  const { cacheEfficiency } = project
  if (cacheEfficiency.cacheCreationTokens < MIN_CACHE_CREATION_TOKENS_FOR_SIGNAL) return null
  if (cacheEfficiency.readToCreationRatio >= LOW_READ_TO_CREATION_RATIO) return null

  return {
    id: 'low-cache-reuse',
    severity: 'warning',
    title: 'Low cache reuse',
    detail:
      `This project creates more prompt cache than it reads back ` +
      `(read/creation ratio ${cacheEfficiency.readToCreationRatio.toFixed(2)}), meaning context keeps getting ` +
      `re-primed instead of reused. Continuing an existing session rather than starting a fresh one lets Claude ` +
      `reuse cached context and cuts input-token cost.`,
    estimatedSavingsUsd: cacheEfficiency.estimatedSavingsUsd
  }
}

function modelCostConcentrationSuggestion(project: AggregatedOverview): Suggestion | null {
  const totalCost = project.totals.costUsd
  if (totalCost < MIN_COST_FOR_MODEL_SIGNAL_USD || project.byModel.length === 0) return null

  // byModel is sorted cost-descending by buildOverview.
  const top = project.byModel[0]
  const share = top.costUsd / totalCost
  if (share < MODEL_COST_CONCENTRATION_THRESHOLD) return null

  return {
    id: 'model-cost-concentration',
    severity: 'info',
    title: 'One model dominates this project’s cost',
    detail:
      `${top.model} accounts for ${(share * 100).toFixed(0)}% of this project’s spend ` +
      `($${top.costUsd.toFixed(2)} of $${totalCost.toFixed(2)}). If some of these tasks don’t need its full ` +
      `reasoning power, a lighter model costs meaningfully less per token.`
  }
}

function verbositySuggestion(project: AggregatedOverview, baseline: AggregatedOverview): Suggestion | null {
  if (project.totals.messageCount < MIN_MESSAGES_FOR_VERBOSITY_SIGNAL) return null

  const baselineAvg = avgInputTokensPerMessage(baseline)
  if (baselineAvg <= 0) return null

  const projectAvg = avgInputTokensPerMessage(project)
  if (projectAvg < baselineAvg * VERBOSITY_MULTIPLIER_THRESHOLD) return null

  return {
    id: 'high-tokens-per-message',
    severity: 'info',
    title: 'Higher input tokens per message than usual',
    detail:
      `This project averages ${Math.round(projectAvg).toLocaleString()} input tokens per message, vs. ` +
      `${Math.round(baselineAvg).toLocaleString()} across all your projects. Large pasted content or big file ` +
      `reads are a common cause — referencing files by path instead of pasting them, or trimming context, can ` +
      `bring this down.`
  }
}

/**
 * Deterministic, locally-computed tips for cutting one project's token spend.
 * Reuses `buildOverview`'s existing per-project scoping (via `projectFilter`)
 * rather than duplicating aggregation logic — the rules just read the same
 * shape `usage:getOverview` already returns, scoped to one project and to
 * the whole dataset for baseline comparisons.
 */
export function buildProjectInsights(
  events: UsageSourceEvent[],
  projectPath: string,
  pricingTable: PricingRow[] = MODEL_PRICING_TABLE
): ProjectInsights {
  const project = buildOverview(events, { projectFilter: projectPath }, pricingTable)
  const baseline = buildOverview(events, undefined, pricingTable)

  const suggestions = [
    lowCacheReuseSuggestion(project),
    modelCostConcentrationSuggestion(project),
    verbositySuggestion(project, baseline)
  ].filter((suggestion): suggestion is Suggestion => suggestion !== null)

  return {
    projectPath,
    totals: project.totals,
    cacheEfficiency: project.cacheEfficiency,
    byModel: project.byModel,
    toolUsage: project.toolUsage,
    baselineAvgInputTokensPerMessage: avgInputTokensPerMessage(baseline),
    suggestions
  }
}
