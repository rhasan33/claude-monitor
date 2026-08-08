import { test } from 'node:test'
import assert from 'node:assert/strict'
import { overviewToCsv, overviewToJson } from './exportOverview'
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
    model: 'claude-sonnet-4-6',
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

test('overviewToCsv emits a header plus one row per day, sessionCount from sessionIds', () => {
  const overview = buildOverview([
    makeEvent({ sessionId: 'sess-1', timestampMs: Date.parse('2026-08-01T10:00:00.000Z') }),
    makeEvent({ sessionId: 'sess-2', timestampMs: Date.parse('2026-08-01T11:00:00.000Z') }),
    makeEvent({ sessionId: 'sess-3', timestampMs: Date.parse('2026-08-02T10:00:00.000Z') })
  ])

  const csv = overviewToCsv(overview)
  const lines = csv.trim().split('\n')

  assert.equal(lines[0], 'date,inputTokens,outputTokens,cacheCreationInputTokens,cacheReadInputTokens,costUsd,messageCount,sessionCount')
  assert.equal(lines.length, 3) // header + 2 days
  assert.equal(lines[1], '2026-08-01,2000000,0,0,0,6,2,2')
  assert.equal(lines[2], '2026-08-02,1000000,0,0,0,3,1,1')
})

test('overviewToCsv on empty daily data emits only the header', () => {
  const overview = buildOverview([])
  const csv = overviewToCsv(overview)
  assert.equal(csv.trim(), 'date,inputTokens,outputTokens,cacheCreationInputTokens,cacheReadInputTokens,costUsd,messageCount,sessionCount')
})

test('overviewToJson round-trips totals through JSON.parse', () => {
  const overview = buildOverview([makeEvent()])
  const parsed = JSON.parse(overviewToJson(overview))
  assert.equal(parsed.totals.messageCount, 1)
  assert.equal(parsed.totals.costUsd, 3)
})
