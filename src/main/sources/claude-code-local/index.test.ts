import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { claudeCodeLocalSource } from './index'

function line(overrides: Record<string, unknown> = {}): string {
  return (
    JSON.stringify({
      uuid: 'evt-1',
      sessionId: 'sess-1',
      cwd: '/Users/dev/project-a',
      timestamp: '2026-08-01T10:00:00.000Z',
      type: 'assistant',
      message: {
        model: 'claude-opus-4-8',
        usage: { input_tokens: 100, output_tokens: 50 }
      },
      ...overrides
    }) + '\n'
  )
}

/** A projects dir with one session file plus a nested subagent transcript. */
async function makeFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'claude-monitor-src-'))
  const project = join(root, '-Users-dev-project-a')
  const subagents = join(project, 'sess-1', 'subagents')
  await mkdir(subagents, { recursive: true })
  await writeFile(join(project, 'sess-1.jsonl'), line({ uuid: 'main-1' }))
  await writeFile(join(subagents, 'agent-abc.jsonl'), line({ uuid: 'sub-1' }))
  return root
}

test('discovers subagent transcripts nested under the session directory', async () => {
  const root = await makeFixture()
  try {
    const targets = await claudeCodeLocalSource.discover(root)
    const ids = targets.map((t) => t.id).sort()
    assert.equal(ids.length, 2)
    assert.ok(ids.some((id) => id.endsWith('sess-1.jsonl')))
    assert.ok(ids.some((id) => id.endsWith(join('subagents', 'agent-abc.jsonl'))))
    // projectPath stays the top-level project dir even for nested files
    assert.deepEqual([...new Set(targets.map((t) => t.projectPath))], ['-Users-dev-project-a'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('reads events from a nested subagent transcript', async () => {
  const root = await makeFixture()
  try {
    const targets = await claudeCodeLocalSource.discover(root)
    const events = []
    for (const target of targets) events.push(...(await claudeCodeLocalSource.read(target)))

    assert.deepEqual(
      events.map((e) => e.eventUuid).sort(),
      ['main-1', 'sub-1']
    )
    // Subagent lines carry the parent's sessionId, so their usage rolls up into
    // the session that spawned them rather than becoming a separate session.
    assert.deepEqual([...new Set(events.map((e) => e.sessionId))], ['sess-1'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('discover returns no targets when the projects dir does not exist', async () => {
  const targets = await claudeCodeLocalSource.discover(join(tmpdir(), 'claude-monitor-does-not-exist'))
  assert.deepEqual(targets, [])
})
