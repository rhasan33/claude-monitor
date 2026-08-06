import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ModelUsage } from '../../../shared/types'
import { colorForSeries } from '../lib/colors'
import { formatUsd } from '../lib/format'

export function ModelBreakdownChart({ byModel }: { byModel: ModelUsage[] }) {
  return (
    <div className="panel">
      <h2>Cost by model</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={byModel} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 0 }}>
          <XAxis
            type="number"
            tickFormatter={formatUsd}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="model"
            width={140}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => formatUsd(value)}
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <Bar dataKey="costUsd" radius={[0, 4, 4, 0]}>
            {byModel.map((model) => (
              <Cell key={model.model} fill={colorForSeries(model.model)} />
            ))}
            <LabelList
              dataKey="costUsd"
              position="right"
              formatter={(value) => formatUsd(value)}
              fill="var(--text-secondary)"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
