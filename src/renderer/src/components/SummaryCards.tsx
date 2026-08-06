import type { CacheEfficiency, OverviewTotals } from '../../../shared/types'
import { formatTokens, formatUsd } from '../lib/format'

export function SummaryCards({
  totals,
  cacheEfficiency
}: {
  totals: OverviewTotals
  cacheEfficiency: CacheEfficiency
}) {
  const totalTokens =
    totals.inputTokens + totals.outputTokens + totals.cacheCreationInputTokens + totals.cacheReadInputTokens

  const cards = [
    { label: 'Estimated cost', value: formatUsd(totals.costUsd) },
    { label: 'Total tokens', value: formatTokens(totalTokens) },
    { label: 'Sessions', value: String(totals.sessionCount) },
    { label: 'Cache savings', value: formatUsd(cacheEfficiency.estimatedSavingsUsd) }
  ]

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div className="stat-tile" key={card.label}>
          <div className="stat-label">{card.label}</div>
          <div className="stat-value">{card.value}</div>
        </div>
      ))}
    </div>
  )
}
