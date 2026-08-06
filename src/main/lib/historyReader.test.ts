import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readRecentActivity } from './historyReader'

async function withTempFile(contents: string, run: (filePath: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, 'history.jsonl')
  try {
    await writeFile(filePath, contents, 'utf-8')
    await run(filePath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('returns items newest-first, respecting the limit', async () => {
  const lines = [
    { display: 'first', project: '/a', sessionId: 's1', timestamp: '2026-08-01T00:00:00.000Z' },
    { display: 'second', project: '/a', sessionId: 's1', timestamp: '2026-08-03T00:00:00.000Z' },
    { display: 'third', project: '/a', sessionId: 's1', timestamp: '2026-08-02T00:00:00.000Z' }
  ]
    .map((l) => JSON.stringify(l))
    .join('\n')

  await withTempFile(lines, async (filePath) => {
    const items = await readRecentActivity(2, filePath)
    assert.equal(items.length, 2)
    assert.deepEqual(items.map((i) => i.display), ['second', 'third'])
  })
})

test('skips malformed and incomplete lines without throwing', async () => {
  const lines = ['{not valid json', JSON.stringify({ display: 'no timestamp' }), ''].join('\n')
  await withTempFile(lines, async (filePath) => {
    const items = await readRecentActivity(10, filePath)
    assert.equal(items.length, 0)
  })
})

test('returns an empty list when the file is missing', async () => {
  const items = await readRecentActivity(10, '/nonexistent/path/history.jsonl')
  assert.deepEqual(items, [])
})
