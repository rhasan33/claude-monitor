import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyUsage } from '../../../shared/types'
import { dailyCacheHitRate } from '../../../shared/cacheTrend'
import { TOKEN_TYPE_COLORS } from '../lib/colors'
import { formatDateLabel, formatPct } from '../lib/format'

export function CacheEfficiencyTrendChart({ daily }: { daily: DailyUsage[] }) {
  const data = useMemo(() => dailyCacheHitRate(daily), [daily])

  return (
    <div className="panel">
      <h2>Cache hit rate over time</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={formatPct}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            width={40}
          />
          <Tooltip
            formatter={(value) => formatPct(value)}
            labelFormatter={(label) => formatDateLabel(label)}
            contentStyle={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
          />
          <Line
            type="monotone"
            dataKey="hitRatePct"
            name="Cache hit rate"
            stroke={TOKEN_TYPE_COLORS.cacheReadInputTokens}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
