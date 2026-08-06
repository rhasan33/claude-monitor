import { useMemo, useState } from 'react'
import type { HeatmapCell } from '../../../shared/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Sparse hour labels along the top — every 3 hours keeps the axis legible.
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21]

// Sequential, one hue (var(--series-1)), light→dark via alpha steps — magnitude
// encoding per the dataviz palette rules. Index 0 is reserved for zero-activity
// cells and rendered as a neutral surface, not the palest hue step.
const INTENSITY_STEPS = [0.16, 0.34, 0.52, 0.7, 0.88, 1]

function intensityAlpha(count: number, max: number): number {
  if (count === 0 || max === 0) return 0
  const ratio = count / max
  const stepIndex = Math.min(INTENSITY_STEPS.length - 1, Math.ceil(ratio * (INTENSITY_STEPS.length - 1)))
  return INTENSITY_STEPS[stepIndex]
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am'
  if (hour === 12) return '12pm'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

export function ActivityHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null)

  const grid = useMemo(() => {
    const byKey = new Map(cells.map((c) => [`${c.dayOfWeek}-${c.hour}`, c]))
    const max = cells.reduce((m, c) => Math.max(m, c.messageCount), 0)
    return { byKey, max }
  }, [cells])

  return (
    <div className="panel">
      <h2>Activity by day and hour</h2>
      <div className="heatmap">
        <div className="heatmap-hour-row">
          <div className="heatmap-day-label" />
          {HOUR_TICKS.map((hour) => (
            <div key={hour} className="heatmap-hour-label" style={{ gridColumn: `${hour + 2} / span 3` }}>
              {formatHour(hour)}
            </div>
          ))}
        </div>
        {DAY_LABELS.map((label, dayOfWeek) => (
          <div className="heatmap-row" key={dayOfWeek}>
            <div className="heatmap-day-label">{label}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = grid.byKey.get(`${dayOfWeek}-${hour}`) ?? { dayOfWeek, hour, messageCount: 0 }
              const alpha = intensityAlpha(cell.messageCount, grid.max)
              return (
                <div
                  key={hour}
                  className="heatmap-cell"
                  style={{
                    background: alpha === 0 ? 'var(--gridline)' : `color-mix(in srgb, var(--series-1) ${alpha * 100}%, var(--surface-1))`
                  }}
                  onMouseEnter={() => setHovered(cell)}
                  onMouseLeave={() => setHovered((current) => (current === cell ? null : current))}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-footer">
        <div className="heatmap-legend">
          <span className="text-muted">Fewer</span>
          {INTENSITY_STEPS.map((alpha) => (
            <span
              key={alpha}
              className="heatmap-legend-swatch"
              style={{ background: `color-mix(in srgb, var(--series-1) ${alpha * 100}%, var(--surface-1))` }}
            />
          ))}
          <span className="text-muted">More</span>
        </div>
        <div className="text-muted heatmap-tooltip">
          {hovered
            ? `${DAY_LABELS[hovered.dayOfWeek]} ${formatHour(hovered.hour)} — ${hovered.messageCount} message${hovered.messageCount === 1 ? '' : 's'}`
            : 'Hover a cell for details'}
        </div>
      </div>
    </div>
  )
}
