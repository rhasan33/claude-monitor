import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dailyCacheHitRate } from './cacheTrend'
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

test('computes per-day cache hit rate as read / (read + creation)', () => {
  const result = dailyCacheHitRate([
    makeDay({ date: '2026-08-01', cacheReadInputTokens: 90, cacheCreationInputTokens: 10 }),
    makeDay({ date: '2026-08-02', cacheReadInputTokens: 0, cacheCreationInputTokens: 100 })
  ])
  assert.deepEqual(result, [
    { date: '2026-08-01', hitRatePct: 90 },
    { date: '2026-08-02', hitRatePct: 0 }
  ])
})

test('returns 0 for a day with no cache activity at all, not NaN', () => {
  const result = dailyCacheHitRate([makeDay({ date: '2026-08-01' })])
  assert.deepEqual(result, [{ date: '2026-08-01', hitRatePct: 0 }])
})

test('preserves input order and length, empty input yields empty output', () => {
  assert.deepEqual(dailyCacheHitRate([]), [])
})
