import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readSettings, writeSettings } from './settingsStore'

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('readSettings returns an empty object when the file is missing', async () => {
  assert.deepEqual(await readSettings('global', '/nonexistent/settings.json'), {})
})

test('readSettings returns an empty object for malformed JSON', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'settings.json')
    await writeFile(filePath, '{not valid json')
    assert.deepEqual(await readSettings('global', filePath), {})
  })
})

test('readSettings parses permissions and passes through unknown keys', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'settings.json')
    const settings = { permissions: { allow: ['Bash(npm test)'], deny: [] }, someUnknownKey: 'x' }
    await writeFile(filePath, JSON.stringify(settings))
    assert.deepEqual(await readSettings('global', filePath), settings)
  })
})

test('writeSettings then readSettings round-trips, including unknown top-level keys', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'settings.json')
    const settings = {
      permissions: { allow: ['Bash(npm test)'] },
      hooks: { PostToolUse: [] },
      someUnknownKey: { nested: true }
    }
    await writeSettings('global', settings, filePath)
    assert.deepEqual(await readSettings('global', filePath), settings)
  })
})

test('writeSettings creates parent directories as needed for a project scope path', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'nested', '.claude', 'settings.json')
    await writeSettings('global', { permissions: { allow: [] } }, filePath)
    assert.deepEqual(await readSettings('global', filePath), { permissions: { allow: [] } })
  })
})
