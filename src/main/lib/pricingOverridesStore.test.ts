import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readPricingOverrides, writePricingOverrides } from './pricingOverridesStore'

async function withTempFile(contents: string | null, run: (filePath: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, 'pricing-overrides.json')
  try {
    if (contents !== null) await writeFile(filePath, contents, 'utf-8')
    await run(filePath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('returns an empty list when the file is missing', async () => {
  assert.deepEqual(await readPricingOverrides('/nonexistent/path/pricing-overrides.json'), [])
})

test('returns an empty list for malformed JSON instead of throwing', async () => {
  await withTempFile('{not valid json', async (filePath) => {
    assert.deepEqual(await readPricingOverrides(filePath), [])
  })
})

test('returns an empty list when the top-level shape is not an array', async () => {
  await withTempFile(JSON.stringify({ modelId: 'x' }), async (filePath) => {
    assert.deepEqual(await readPricingOverrides(filePath), [])
  })
})

test('filters out malformed entries but keeps valid ones', async () => {
  await withTempFile(
    JSON.stringify([
      { modelId: 'claude-sonnet-5', inputPerMtok: 3, outputPerMtok: 15 },
      { modelId: '', inputPerMtok: 3, outputPerMtok: 15 },
      { modelId: 'bad-rate', inputPerMtok: -1, outputPerMtok: 15 },
      { modelId: 'missing-output', inputPerMtok: 3 }
    ]),
    async (filePath) => {
      const overrides = await readPricingOverrides(filePath)
      assert.deepEqual(overrides, [{ modelId: 'claude-sonnet-5', inputPerMtok: 3, outputPerMtok: 15 }])
    }
  )
})

test('writePricingOverrides then readPricingOverrides round-trips, creating parent directories as needed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, 'nested', 'pricing-overrides.json')
  try {
    const overrides = [{ modelId: 'claude-opus-5', inputPerMtok: 20, outputPerMtok: 90 }]
    await writePricingOverrides(overrides, filePath)
    assert.deepEqual(await readPricingOverrides(filePath), overrides)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
