import { useMemo, useState } from 'react'
import { currentMonthCost, projectMonthEndCost } from '../../../shared/monthToDate'
import { useApp } from '../state/store'
import { formatUsd } from '../lib/format'

export function BudgetPanel() {
  const { state, setBudget } = useApp()
  const [input, setInput] = useState(
    state.budget.monthlyLimitUsd != null ? String(state.budget.monthlyLimitUsd) : ''
  )
  const [saving, setSaving] = useState(false)

  const spent = useMemo(() => currentMonthCost(state.overview?.daily ?? []), [state.overview])
  const projection = useMemo(() => projectMonthEndCost(state.overview?.daily ?? []), [state.overview])
  const limit = state.budget.monthlyLimitUsd
  const pct = limit ? Math.min((spent / limit) * 100, 100) : 0
  const overBudget = limit != null && spent > limit
  const projectedOverBudget = limit != null && projection != null && projection.projectedTotal > limit

  const handleSave = async (): Promise<void> => {
    const parsed = Number(input)
    setSaving(true)
    try {
      await setBudget({ monthlyLimitUsd: Number.isFinite(parsed) && parsed > 0 ? parsed : null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel budget-panel">
      <div className="budget-header">
        <div className="stat-label">Monthly budget</div>
        <div className="budget-input-row">
          <input
            id="budget-limit-input"
            type="number"
            min="0"
            step="1"
            placeholder="No limit set"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="refresh-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {limit != null && (
        <>
          <div className="budget-bar">
            <div
              className={overBudget ? 'budget-bar-fill budget-bar-fill--over' : 'budget-bar-fill'}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-muted budget-summary">
            {formatUsd(spent)} of {formatUsd(limit)} spent this month
            {overBudget ? ' — over budget' : ''}
          </div>
        </>
      )}
      {projection && (
        <div className={projectedOverBudget ? 'budget-projection budget-projection--over' : 'budget-projection'}>
          At this rate, projected {formatUsd(projection.projectedTotal)} by day {projection.daysInMonth}
          {projectedOverBudget ? ' — on track to exceed budget' : ''}
        </div>
      )}
    </div>
  )
}
