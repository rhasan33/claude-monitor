import { useMemo, useState } from 'react'
import type { DailyUsage } from '../../../shared/types'
import { useApp } from '../state/store'
import { formatUsd } from '../lib/format'

/**
 * Sums this calendar month's cost from `daily`, independent of whatever
 * project/model/date filters are active — a budget tracks real spend, not
 * a filtered slice of it.
 */
function currentMonthCost(daily: DailyUsage[]): number {
  const prefix = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  return daily.filter((d) => d.date.startsWith(prefix)).reduce((sum, d) => sum + d.costUsd, 0)
}

export function BudgetPanel() {
  const { state, setBudget } = useApp()
  const [input, setInput] = useState(
    state.budget.monthlyLimitUsd != null ? String(state.budget.monthlyLimitUsd) : ''
  )
  const [saving, setSaving] = useState(false)

  const spent = useMemo(() => currentMonthCost(state.overview?.daily ?? []), [state.overview])
  const limit = state.budget.monthlyLimitUsd
  const pct = limit ? Math.min((spent / limit) * 100, 100) : 0
  const overBudget = limit != null && spent > limit

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
    </div>
  )
}
