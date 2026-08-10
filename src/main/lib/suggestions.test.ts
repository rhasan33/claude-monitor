import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProjectInsights } from './suggestions'
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
      inputTokens: 1_000,
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

function suggestionIds(events: UsageSourceEvent[], projectPath = '/Users/dev/project-a'): string[] {
  return buildProjectInsights(events, projectPath)
    .suggestions.map((s) => s.id)
    .sort()
}

test('flags low cache reuse when creation is high and reads are low', () => {
  const ids = suggestionIds([
    makeEvent({
      usage: {
        inputTokens: 1_000,
        outputTokens: 0,
        cacheCreationInputTokens: 150_000,
        cacheReadInputTokens: 10_000,
        cacheCreationEphemeral1hTokens: 0,
        cacheCreationEphemeral5mTokens: 0,
        webSearchRequests: 0,
        webFetchRequests: 0
      }
    })
  ])
  assert.ok(ids.includes('low-cache-reuse'))
})

test('does not flag cache reuse when reads keep pace with creation', () => {
  const ids = suggestionIds([
    makeEvent({
      usage: {
        inputTokens: 1_000,
        outputTokens: 0,
        cacheCreationInputTokens: 150_000,
        cacheReadInputTokens: 150_000,
        cacheCreationEphemeral1hTokens: 0,
        cacheCreationEphemeral5mTokens: 0,
        webSearchRequests: 0,
        webFetchRequests: 0
      }
    })
  ])
  assert.ok(!ids.includes('low-cache-reuse'))
})

test('does not flag cache reuse for a project too small to be meaningful', () => {
  const ids = suggestionIds([
    makeEvent({
      usage: {
        inputTokens: 1_000,
        outputTokens: 0,
        cacheCreationInputTokens: 1_000,
        cacheReadInputTokens: 0,
        cacheCreationEphemeral1hTokens: 0,
        cacheCreationEphemeral5mTokens: 0,
        webSearchRequests: 0,
        webFetchRequests: 0
      }
    })
  ])
  assert.ok(!ids.includes('low-cache-reuse'))
})

test('flags model cost concentration when one model dominates spend', () => {
  const ids = suggestionIds([
    // claude-opus-5: $25/Mtok output -> 100k output tokens = $2.50
    makeEvent({ model: 'claude-opus-5', usage: { ...makeEvent().usage!, outputTokens: 100_000 } }),
    // claude-haiku-4-5: $5/Mtok output -> 10k output tokens = $0.05
    makeEvent({ model: 'claude-haiku-4-5', usage: { ...makeEvent().usage!, outputTokens: 10_000 } })
  ])
  assert.ok(ids.includes('model-cost-concentration'))
})

test('does not flag model concentration when spend is balanced across models', () => {
  const ids = suggestionIds([
    // claude-opus-5: $25/Mtok output -> 40k output tokens = $1.00
    makeEvent({ model: 'claude-opus-5', usage: { ...makeEvent().usage!, outputTokens: 40_000 } }),
    // claude-haiku-4-5: $5/Mtok output -> 200k output tokens = $1.00
    makeEvent({ model: 'claude-haiku-4-5', usage: { ...makeEvent().usage!, outputTokens: 200_000 } })
  ])
  assert.ok(!ids.includes('model-cost-concentration'))
})

test('does not flag model concentration for a project too cheap to be meaningful', () => {
  const ids = suggestionIds([makeEvent({ model: 'claude-opus-5' })])
  assert.ok(!ids.includes('model-cost-concentration'))
})

test('flags high tokens-per-message against the all-projects baseline', () => {
  const events: UsageSourceEvent[] = []
  for (let i = 0; i < 20; i++) {
    events.push(
      makeEvent({
        projectPath: '/verbose',
        sessionId: `verbose-${i}`,
        usage: { ...makeEvent().usage!, inputTokens: 100_000 }
      })
    )
  }
  for (let i = 0; i < 20; i++) {
    events.push(
      makeEvent({
        projectPath: '/quiet',
        sessionId: `quiet-${i}`,
        usage: { ...makeEvent().usage!, inputTokens: 10_000 }
      })
    )
  }
  const ids = buildProjectInsights(events, '/verbose')
    .suggestions.map((s) => s.id)
    .sort()
  assert.ok(ids.includes('high-tokens-per-message'))
})

test('does not flag verbosity below the message-count floor', () => {
  const events: UsageSourceEvent[] = []
  for (let i = 0; i < 5; i++) {
    events.push(
      makeEvent({
        projectPath: '/verbose',
        sessionId: `verbose-${i}`,
        usage: { ...makeEvent().usage!, inputTokens: 100_000 }
      })
    )
  }
  for (let i = 0; i < 20; i++) {
    events.push(
      makeEvent({
        projectPath: '/quiet',
        sessionId: `quiet-${i}`,
        usage: { ...makeEvent().usage!, inputTokens: 10_000 }
      })
    )
  }
  const ids = buildProjectInsights(events, '/verbose')
    .suggestions.map((s) => s.id)
    .sort()
  assert.ok(!ids.includes('high-tokens-per-message'))
})

test('returns no suggestions for a project that looks efficient', () => {
  const ids = suggestionIds([makeEvent()])
  assert.deepEqual(ids, [])
})
