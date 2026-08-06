import { test } from 'node:test'
import assert from 'node:assert/strict'
import { currentMonthCost, projectMonthEndCost } from './monthToDate'
import type { DailyUsage } from './types'

function makeDay(overrides: Partial<DailyUsage> = {}): DailyUsage {
  return {
    date: '2026-08-01',
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd: 0,
    messageCount: 0,
    sessionIds: [],
    ...overrides
  }
}

test('currentMonthCost sums only days within the given month, ignoring other months', () => {
  const daily = [
    makeDay({ date: '2026-07-31', costUsd: 100 }),
    makeDay({ date: '2026-08-01', costUsd: 5 }),
    makeDay({ date: '2026-08-02', costUsd: 5 })
  ]
  assert.equal(currentMonthCost(daily, new Date(2026, 7, 15)), 10)
})

test('projectMonthEndCost returns null when nothing was spent this month yet', () => {
  const daily = [makeDay({ date: '2026-07-15', costUsd: 50 })]
  assert.equal(projectMonthEndCost(daily, new Date(2026, 7, 1)), null)
})

test('projectMonthEndCost extrapolates the average daily rate across the full month', () => {
  // August 2026 has 31 days. $20 spent across the first 4 days -> $5/day average.
  const daily = [
    makeDay({ date: '2026-08-01', costUsd: 5 }),
    makeDay({ date: '2026-08-02', costUsd: 5 }),
    makeDay({ date: '2026-08-03', costUsd: 5 }),
    makeDay({ date: '2026-08-04', costUsd: 5 })
  ]
  const result = projectMonthEndCost(daily, new Date(2026, 7, 4))
  assert.ok(result)
  assert.equal(result.spentSoFar, 20)
  assert.equal(result.daysElapsed, 4)
  assert.equal(result.daysInMonth, 31)
  assert.equal(result.projectedTotal, 5 * 31)
})
