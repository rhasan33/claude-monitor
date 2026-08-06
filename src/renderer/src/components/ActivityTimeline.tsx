import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyUsage } from '../../../shared/types'
import { formatDateLabel } from '../lib/format'

export function ActivityTimeline({ daily }: { daily: DailyUsage[] }) {
  const data = daily.map((day) => ({ date: day.date, sessions: day.sessionIds.length }))

  return (
    <div className="panel">
      <h2>Sessions per day</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            width={32}
          />
          <Tooltip
            labelFormatter={(label) => formatDateLabel(label)}
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <Bar dataKey="sessions" name="Sessions" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
