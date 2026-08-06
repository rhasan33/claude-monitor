import { useMemo } from 'react'
import type { CacheEfficiency, DailyUsage, OverviewTotals } from '../../../shared/types'
import { computeTrailingWindowComparison } from '../../../shared/periodComparison'
import { formatTokens, formatUsd } from '../lib/format'

function formatDelta(pct: number | null): string | null {
  if (pct === null) return null
  const rounded = Math.round(pct)
  if (rounded === 0) return 'flat vs prior 7 days'
  const arrow = rounded > 0 ? '▲' : '▼'
  return `${arrow} ${Math.abs(rounded)}% vs prior 7 days`
}

export function SummaryCards({
  totals,
  cacheEfficiency,
  daily
}: {
  totals: OverviewTotals
  cacheEfficiency: CacheEfficiency
  daily: DailyUsage[]
}) {
  const totalTokens =
    totals.inputTokens + totals.outputTokens + totals.cacheCreationInputTokens + totals.cacheReadInputTokens

  const comparison = useMemo(() => computeTrailingWindowComparison(daily, 7), [daily])

  const cards = [
    {
      label: 'Estimated cost',
      value: formatUsd(totals.costUsd),
      delta: comparison ? formatDelta(comparison.costDeltaPct) : null
    },
    {
      label: 'Total tokens',
      value: formatTokens(totalTokens),
      delta: comparison ? formatDelta(comparison.totalTokensDeltaPct) : null
    },
    { label: 'Sessions', value: String(totals.sessionCount), delta: null },
    { label: 'Cache savings', value: formatUsd(cacheEfficiency.estimatedSavingsUsd), delta: null }
  ]

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div className="stat-tile" key={card.label}>
          <div className="stat-label">{card.label}</div>
          <div className="stat-value">{card.value}</div>
          {card.delta && <div className="stat-delta">{card.delta}</div>}
        </div>
      ))}
    </div>
  )
}
