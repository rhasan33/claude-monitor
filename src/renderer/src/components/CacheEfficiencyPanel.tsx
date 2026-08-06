import type { CacheEfficiency } from '../../../shared/types'
import { TOKEN_TYPE_COLORS } from '../lib/colors'
import { formatTokens, formatUsd } from '../lib/format'

export function CacheEfficiencyPanel({ cacheEfficiency }: { cacheEfficiency: CacheEfficiency }) {
  const { cacheReadTokens, cacheCreationTokens, estimatedSavingsUsd, readToCreationRatio } = cacheEfficiency
  const total = cacheReadTokens + cacheCreationTokens
  const readPct = total > 0 ? (cacheReadTokens / total) * 100 : 0

  return (
    <div className="panel">
      <h2>Cache efficiency</h2>
      <div
        className="cache-bar"
        role="img"
        aria-label={`${readPct.toFixed(0)}% cache reads, ${(100 - readPct).toFixed(0)}% cache writes`}
      >
        <div
          className="cache-bar-segment"
          style={{ width: `${readPct}%`, background: TOKEN_TYPE_COLORS.cacheReadInputTokens }}
        />
        <div
          className="cache-bar-segment"
          style={{ width: `${100 - readPct}%`, background: TOKEN_TYPE_COLORS.cacheCreationInputTokens }}
        />
      </div>
      <div className="cache-legend">
        <span>
          <i style={{ background: TOKEN_TYPE_COLORS.cacheReadInputTokens }} /> Read {formatTokens(cacheReadTokens)}
        </span>
        <span>
          <i style={{ background: TOKEN_TYPE_COLORS.cacheCreationInputTokens }} /> Write{' '}
          {formatTokens(cacheCreationTokens)}
        </span>
      </div>
      <div className="cache-stats">
        <div>
          <div className="stat-label">Read : write ratio</div>
          <div className="stat-value">{readToCreationRatio.toFixed(1)}x</div>
        </div>
        <div>
          <div className="stat-label">Estimated savings</div>
          <div className="stat-value">{formatUsd(estimatedSavingsUsd)}</div>
        </div>
      </div>
    </div>
  )
}
