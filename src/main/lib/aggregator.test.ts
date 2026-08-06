import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOverview } from './aggregator'
import type { UsageSourceEvent } from '../../shared/types'

function makeEvent(overrides: Partial<UsageSourceEvent> = {}): UsageSourceEvent {
  return {
    sourceId: 'claude_code_local',
    eventUuid: `evt-${Math.random()}`,
    sessionId: 'sess-1',
    projectPath: '/Users/dev/project-a',
    timestampMs: Date.parse('2026-08-01T10:00:00.000Z'),
    role: 'assistant',
    model: 'claude-sonnet-5',
    usage: {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationEphemeral1hTokens: 0,
      cacheCreationEphemeral5mTokens: 0,
      webSearchRequests: 0,
      webFetchRequests: 0
    },
    toolUseNames: [],
    ...overrides
  }
}

test('sums totals, distinct sessions, and distinct projects across events', () => {
  const overview = buildOverview([
    makeEvent({ sessionId: 'sess-1', projectPath: '/a' }),
    makeEvent({ sessionId: 'sess-1', projectPath: '/a' }),
    makeEvent({ sessionId: 'sess-2', projectPath: '/b' })
  ])
  assert.equal(overview.totals.messageCount, 3)
  assert.equal(overview.totals.sessionCount, 2)
  assert.equal(overview.totals.projectCount, 2)
  assert.equal(overview.totals.inputTokens, 3_000_000)
  // claude-sonnet-5 input rate is $3/Mtok -> 3 events * 1Mtok each = $9
  assert.equal(overview.totals.costUsd, 9)
})

test('buckets by local date, sorted ascending', () => {
  const overview = buildOverview([
    makeEvent({ timestampMs: Date.parse('2026-08-02T10:00:00.000Z') }),
    makeEvent({ timestampMs: Date.parse('2026-08-01T10:00:00.000Z') })
  ])
  assert.deepEqual(
    overview.daily.map((d) => d.date),
    ['2026-08-01', '2026-08-02']
  )
})

test('groups by model and by project, sorted by cost descending', () => {
  const overview = buildOverview([
    makeEvent({ model: 'claude-haiku-4-5', projectPath: '/small' }),
    makeEvent({ model: 'claude-opus-5', projectPath: '/big' })
  ])
  assert.equal(overview.byModel[0].model, 'claude-opus-5')
  assert.equal(overview.byProject[0].projectPath, '/big')
})

test('filters by dateRange, projectFilter, and modelFilter', () => {
  const events = [
    makeEvent({ timestampMs: Date.parse('2026-08-01T00:00:00.000Z'), projectPath: '/a', model: 'm1' }),
    makeEvent({ timestampMs: Date.parse('2026-08-05T00:00:00.000Z'), projectPath: '/b', model: 'm2' })
  ]
  assert.equal(
    buildOverview(events, { dateRange: { from: '2026-08-01', to: '2026-08-01' } }).totals.messageCount,
    1
  )
  assert.equal(buildOverview(events, { projectFilter: '/b' }).totals.projectCount, 1)
  assert.equal(buildOverview(events, { modelFilter: 'm1' }).totals.messageCount, 1)
})

test('computes cache efficiency and warns on unmatched models without dropping other events', () => {
  const overview = buildOverview([
    makeEvent({
      model: 'claude-sonnet-5',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationInputTokens: 1_000_000,
        cacheReadInputTokens: 1_000_000,
        cacheCreationEphemeral1hTokens: 0,
        cacheCreationEphemeral5mTokens: 1_000_000,
        webSearchRequests: 0,
        webFetchRequests: 0
      }
    }),
    makeEvent({ model: 'totally-unknown-model' })
  ])
  assert.equal(overview.cacheEfficiency.cacheReadTokens, 1_000_000)
  assert.equal(overview.cacheEfficiency.cacheCreationTokens, 1_000_000)
  assert.equal(overview.cacheEfficiency.readToCreationRatio, 1)
  // sonnet-5: (3 - 0.3) per Mtok saved on 1Mtok of cache reads = $2.70
  assert.equal(overview.cacheEfficiency.estimatedSavingsUsd, 2.7)
  assert.equal(overview.totals.messageCount, 2)
  assert.ok(overview.warnings.some((w) => w.includes('totally-unknown-model')))
})

test('counts tool usage across events', () => {
  const overview = buildOverview([
    makeEvent({ toolUseNames: ['Bash', 'Read'] }),
    makeEvent({ toolUseNames: ['Bash'] })
  ])
  assert.deepEqual(overview.toolUsage[0], { toolName: 'Bash', count: 2 })
})
