import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { atomicWriteFile } from './atomicWrite'

test('writes the given content to the target path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    const filePath = join(dir, 'file.json')
    await atomicWriteFile(filePath, '{"a":1}')
    assert.equal(await readFile(filePath, 'utf-8'), '{"a":1}')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('creates parent directories as needed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    const filePath = join(dir, 'nested', 'deeper', 'file.json')
    await atomicWriteFile(filePath, 'hello')
    assert.equal(await readFile(filePath, 'utf-8'), 'hello')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('leaves no leftover temp file after a successful write', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    const filePath = join(dir, 'file.json')
    await atomicWriteFile(filePath, 'hello')
    const entries = await readdir(dir)
    assert.deepEqual(entries, ['file.json'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('overwrites an existing file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    const filePath = join(dir, 'file.json')
    await atomicWriteFile(filePath, 'first')
    await atomicWriteFile(filePath, 'second')
    assert.equal(await readFile(filePath, 'utf-8'), 'second')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
