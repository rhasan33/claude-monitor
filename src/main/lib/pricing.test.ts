import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyPricingOverrides, calculateCost, estimateCacheSavingsUsd, type PricingRow } from './pricing'

const testTable: PricingRow[] = [
  {
    modelId: 'test-model',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    inputPerMtok: 10,
    outputPerMtok: 20,
    cacheWrite5mPerMtok: 12.5,
    cacheWrite1hPerMtok: 20,
    cacheReadPerMtok: 1
  }
]

const ts = Date.parse('2026-01-01T00:00:00.000Z')

test('calculates cost across input, output, and cache tiers', () => {
  const { costUsd, matched } = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheCreationInputTokens: 1_000_000,
      cacheReadInputTokens: 1_000_000,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 1_000_000,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'test-model',
    ts,
    testTable
  )
  assert.equal(matched, true)
  // 10 (input) + 20 (output) + 12.5 (5m cache write) + 1 (cache read) = 43.5
  assert.equal(costUsd, 43.5)
})

test('treats unbucketed cache-creation tokens as 5m-tier', () => {
  const { costUsd } = calculateCost(
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 1_000_000,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'test-model',
    ts,
    testTable
  )
  assert.equal(costUsd, 12.5)
})

test('returns matched=false and cost=0 for an unknown model', () => {
  const { costUsd, matched } = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'some-unlisted-model',
    ts,
    testTable
  )
  assert.equal(matched, false)
  assert.equal(costUsd, 0)
})

test('respects effectiveTo date boundaries', () => {
  const bounded: PricingRow[] = [
    { ...testTable[0], effectiveTo: '2025-06-01' },
    { ...testTable[0], effectiveFrom: '2025-06-01', effectiveTo: null, inputPerMtok: 99 }
  ]
  const before = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'test-model',
    Date.parse('2025-03-01T00:00:00.000Z'),
    bounded
  )
  assert.equal(before.costUsd, 10)

  const after = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'test-model',
    Date.parse('2025-07-01T00:00:00.000Z'),
    bounded
  )
  assert.equal(after.costUsd, 99)
})

test('estimates cache savings as input-rate minus cache-read-rate', () => {
  const saved = estimateCacheSavingsUsd(1_000_000, 'test-model', ts, testTable)
  assert.equal(saved, 9) // (10 - 1) per Mtok
})

test('cache savings is zero for unknown model or zero tokens', () => {
  assert.equal(estimateCacheSavingsUsd(1_000_000, 'unknown', ts, testTable), 0)
  assert.equal(estimateCacheSavingsUsd(0, 'test-model', ts, testTable), 0)
})

test('applyPricingOverrides replaces the built-in row(s) for an overridden model entirely', () => {
  const overridden = applyPricingOverrides(testTable, [
    { modelId: 'test-model', inputPerMtok: 100, outputPerMtok: 200 }
  ])
  const { costUsd } = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'test-model',
    ts,
    overridden
  )
  assert.equal(costUsd, 100)
  // cache rates re-derived from the new input rate via the standard multipliers
  assert.equal(overridden.find((r) => r.modelId === 'test-model')?.cacheReadPerMtok, 10)
})

test('applyPricingOverrides adds a new row for a model the built-in table has never heard of', () => {
  const overridden = applyPricingOverrides(testTable, [
    { modelId: 'brand-new-model', inputPerMtok: 5, outputPerMtok: 25 }
  ])
  assert.equal(overridden.length, 2)
  const { costUsd, matched } = calculateCost(
    {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    'brand-new-model',
    ts,
    overridden
  )
  assert.equal(matched, true)
  assert.equal(costUsd, 5)
})

test('applyPricingOverrides is a no-op passthrough when there are no overrides', () => {
  assert.equal(applyPricingOverrides(testTable, []), testTable)
})
