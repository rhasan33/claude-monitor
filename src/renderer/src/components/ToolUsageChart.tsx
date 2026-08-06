import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ToolUsageCount } from '../../../shared/types'
import { colorForSeries } from '../lib/colors'

export function ToolUsageChart({ toolUsage }: { toolUsage: ToolUsageCount[] }) {
  const data = toolUsage.slice(0, 8)

  if (data.length === 0) {
    return (
      <div className="panel">
        <h2>Most-used tools</h2>
        <p className="text-muted">No tool calls recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>Most-used tools</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 0 }}>
          <XAxis
            type="number"
            allowDecimals={false}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="toolName"
            width={100}
            stroke="var(--baseline)"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((tool) => (
              <Cell key={tool.toolName} fill={colorForSeries(tool.toolName)} />
            ))}
            <LabelList dataKey="count" position="right" fill="var(--text-secondary)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
