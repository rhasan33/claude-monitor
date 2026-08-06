import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyUsage } from '../../../shared/types'
import { TOKEN_TYPE_COLORS } from '../lib/colors'
import { formatDateLabel, formatTokens } from '../lib/format'

const SERIES = [
  { key: 'inputTokens', name: 'Input', color: TOKEN_TYPE_COLORS.inputTokens },
  { key: 'outputTokens', name: 'Output', color: TOKEN_TYPE_COLORS.outputTokens },
  { key: 'cacheCreationInputTokens', name: 'Cache write', color: TOKEN_TYPE_COLORS.cacheCreationInputTokens },
  { key: 'cacheReadInputTokens', name: 'Cache read', color: TOKEN_TYPE_COLORS.cacheReadInputTokens }
] as const

export function TokenUsageChart({ daily }: { daily: DailyUsage[] }) {
  return (
    <div className="panel">
      <h2>Token usage over time</h2>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatTokens}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatTokens(value)}
            labelFormatter={(label) => formatDateLabel(label)}
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <Legend wrapperStyle={{ color: 'var(--text-secondary)', fontSize: 12 }} />
          {SERIES.map((series) => (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stackId="tokens"
              stroke={series.color}
              fill={series.color}
              fillOpacity={0.75}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
