import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readBudget, writeBudget } from './budgetStore'

async function withTempFile(contents: string | null, run: (filePath: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, 'budget.json')
  try {
    if (contents !== null) await writeFile(filePath, contents, 'utf-8')
    await run(filePath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('returns no budget when the file is missing', async () => {
  const budget = await readBudget('/nonexistent/path/budget.json')
  assert.deepEqual(budget, { monthlyLimitUsd: null })
})

test('returns no budget for malformed JSON instead of throwing', async () => {
  await withTempFile('{not valid json', async (filePath) => {
    const budget = await readBudget(filePath)
    assert.deepEqual(budget, { monthlyLimitUsd: null })
  })
})

test('rejects non-positive or non-numeric limits as unset', async () => {
  await withTempFile(JSON.stringify({ monthlyLimitUsd: -5 }), async (filePath) => {
    assert.deepEqual(await readBudget(filePath), { monthlyLimitUsd: null })
  })
  await withTempFile(JSON.stringify({ monthlyLimitUsd: 'fifty' }), async (filePath) => {
    assert.deepEqual(await readBudget(filePath), { monthlyLimitUsd: null })
  })
})

test('writeBudget then readBudget round-trips, creating parent directories as needed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, 'nested', 'budget.json')
  try {
    await writeBudget({ monthlyLimitUsd: 25 }, filePath)
    assert.deepEqual(await readBudget(filePath), { monthlyLimitUsd: 25 })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
