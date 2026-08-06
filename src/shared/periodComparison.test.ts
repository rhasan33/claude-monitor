import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeTrailingWindowComparison } from './periodComparison'
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

test('returns null when there is fewer than one full previous window', () => {
  const daily = [makeDay({ date: '2026-08-01', costUsd: 10 })]
  assert.equal(computeTrailingWindowComparison(daily, 7), null)
})

test('compares the trailing window against the one before it', () => {
  const daily = [
    makeDay({ date: '2026-07-25', costUsd: 5, inputTokens: 100 }),
    makeDay({ date: '2026-07-26', costUsd: 5, inputTokens: 100 }),
    makeDay({ date: '2026-08-01', costUsd: 10, inputTokens: 200 }),
    makeDay({ date: '2026-08-02', costUsd: 10, inputTokens: 200 })
  ]
  const result = computeTrailingWindowComparison(daily, 2)
  assert.ok(result)
  assert.equal(result.current.costUsd, 20)
  assert.equal(result.previous.costUsd, 10)
  assert.equal(result.costDeltaPct, 100)
  assert.equal(result.current.totalTokens, 400)
  assert.equal(result.previous.totalTokens, 200)
  assert.equal(result.totalTokensDeltaPct, 100)
})

test('returns null delta when the previous window has zero for that metric', () => {
  const daily = [
    makeDay({ date: '2026-08-01', costUsd: 0 }),
    makeDay({ date: '2026-08-02', costUsd: 5 })
  ]
  const result = computeTrailingWindowComparison(daily, 1)
  assert.ok(result)
  assert.equal(result.previous.costUsd, 0)
  assert.equal(result.costDeltaPct, null)
})
