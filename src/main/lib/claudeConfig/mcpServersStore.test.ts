import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  readGlobalMcpServers,
  writeGlobalMcpServers,
  readProjectMcpServers,
  writeProjectMcpServers
} from './mcpServersStore'

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('readGlobalMcpServers returns an empty list when the file is missing', async () => {
  assert.deepEqual(await readGlobalMcpServers('/nonexistent/claude.json'), [])
})

test('readGlobalMcpServers returns an empty list for malformed JSON', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'claude.json')
    await writeFile(filePath, '{not valid json')
    assert.deepEqual(await readGlobalMcpServers(filePath), [])
  })
})

test('readGlobalMcpServers parses stdio and http server entries', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'claude.json')
    await writeFile(
      filePath,
      JSON.stringify({
        mcpServers: {
          local: { command: 'node', args: ['server.js'], env: { KEY: 'value' } },
          remote: { type: 'sse', url: 'https://example.com/mcp' }
        }
      })
    )
    const servers = await readGlobalMcpServers(filePath)
    assert.deepEqual(servers, [
      { name: 'local', transport: 'stdio', command: 'node', args: ['server.js'], env: { KEY: 'value' } },
      { name: 'remote', transport: 'sse', url: 'https://example.com/mcp' }
    ])
  })
})

test('writeGlobalMcpServers preserves unrelated keys in ~/.claude.json (merge safety)', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'claude.json')
    const original = {
      oauthAccount: { emailAddress: 'user@example.com' },
      mcpServers: { old: { command: 'old-cmd' } },
      otherUnknownKey: 'x'
    }
    await writeFile(filePath, JSON.stringify(original))

    await writeGlobalMcpServers([{ name: 'new', transport: 'stdio', command: 'new-cmd' }], filePath)

    const updated = JSON.parse(await readFile(filePath, 'utf-8'))
    assert.deepEqual(updated.oauthAccount, original.oauthAccount)
    assert.equal(updated.otherUnknownKey, 'x')
    assert.deepEqual(updated.mcpServers, { new: { command: 'new-cmd' } })
  })
})

test('writeGlobalMcpServers throws and leaves the file untouched if existing JSON is malformed', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'claude.json')
    await writeFile(filePath, '{not valid json')

    await assert.rejects(() => writeGlobalMcpServers([{ name: 'x', transport: 'stdio', command: 'x' }], filePath))
    assert.equal(await readFile(filePath, 'utf-8'), '{not valid json')
  })
})

test('writeGlobalMcpServers creates a new file when none exists', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, 'claude.json')
    await writeGlobalMcpServers([{ name: 'x', transport: 'stdio', command: 'x' }], filePath)
    const servers = await readGlobalMcpServers(filePath)
    assert.equal(servers.length, 1)
    assert.equal(servers[0].name, 'x')
  })
})

test('readProjectMcpServers returns an empty list when .mcp.json is missing', async () => {
  await withTempDir(async (dir) => {
    assert.deepEqual(await readProjectMcpServers('global', join(dir, '.mcp.json')), [])
  })
})

test('writeProjectMcpServers then readProjectMcpServers round-trips', async () => {
  await withTempDir(async (dir) => {
    const filePath = join(dir, '.mcp.json')
    const servers = [{ name: 'local', transport: 'stdio' as const, command: 'node', args: ['x.js'] }]
    await writeProjectMcpServers('global', servers, filePath)
    const read = await readProjectMcpServers('global', filePath)
    assert.deepEqual(read, [{ name: 'local', transport: 'stdio', command: 'node', args: ['x.js'], env: undefined }])
  })
})
