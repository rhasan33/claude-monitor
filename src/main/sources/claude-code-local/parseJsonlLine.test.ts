import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseJsonlLine } from './parseJsonlLine'

test('parses an assistant line with usage into a UsageSourceEvent', () => {
  const line = JSON.stringify({
    uuid: 'evt-1',
    sessionId: 'sess-1',
    cwd: '/Users/dev/project-a',
    timestamp: '2026-08-01T10:00:00.000Z',
    type: 'assistant',
    message: {
      model: 'claude-sonnet-5',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 200,
        cache_creation: { ephemeral_1h_input_tokens: 5, ephemeral_5m_input_tokens: 5 },
        server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 }
      },
      content: [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', name: 'Bash' }
      ]
    }
  })

  const event = parseJsonlLine(line)
  assert.ok(event)
  assert.equal(event?.eventUuid, 'evt-1')
  assert.equal(event?.sessionId, 'sess-1')
  assert.equal(event?.projectPath, '/Users/dev/project-a')
  assert.equal(event?.role, 'assistant')
  assert.equal(event?.model, 'claude-sonnet-5')
  assert.deepEqual(event?.usage, {
    inputTokens: 100,
    outputTokens: 50,
    cacheCreationInputTokens: 10,
    cacheReadInputTokens: 200,
    cacheCreationEphemeral1hTokens: 5,
    cacheCreationEphemeral5mTokens: 5,
    webSearchRequests: 1,
    webFetchRequests: 0
  })
  assert.deepEqual(event?.toolUseNames, ['Bash'])
})

test('returns null for a blank line', () => {
  assert.equal(parseJsonlLine(''), null)
  assert.equal(parseJsonlLine('   \n'), null)
})

test('returns null for malformed JSON instead of throwing', () => {
  assert.equal(parseJsonlLine('{not valid json'), null)
})

test('returns null when required fields are missing', () => {
  assert.equal(parseJsonlLine(JSON.stringify({ uuid: 'evt-2' })), null)
})

test('handles message.content being a plain string instead of a block array', () => {
  const line = JSON.stringify({
    uuid: 'evt-4',
    sessionId: 'sess-1',
    cwd: '/Users/dev/project-a',
    timestamp: '2026-08-01T10:00:02.000Z',
    type: 'assistant',
    message: { model: 'claude-sonnet-5', content: 'just a plain string, not blocks' }
  })
  const event = parseJsonlLine(line)
  assert.ok(event)
  assert.deepEqual(event?.toolUseNames, [])
})

test('parses a user line with no usage field', () => {
  const line = JSON.stringify({
    uuid: 'evt-3',
    sessionId: 'sess-1',
    cwd: '/Users/dev/project-a',
    timestamp: '2026-08-01T10:00:01.000Z',
    type: 'user',
    message: { content: [{ type: 'text', text: 'hi' }] }
  })
  const event = parseJsonlLine(line)
  assert.ok(event)
  assert.equal(event?.role, 'user')
  assert.equal(event?.usage, undefined)
  assert.deepEqual(event?.toolUseNames, [])
})
