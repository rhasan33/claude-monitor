import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readProfile } from './claudeJson'

async function withTempFile(contents: string | null, run: (filePath: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  const filePath = join(dir, '.claude.json')
  try {
    if (contents !== null) await writeFile(filePath, contents, 'utf-8')
    await run(filePath)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('extracts profile fields from oauthAccount', async () => {
  await withTempFile(
    JSON.stringify({
      oauthAccount: {
        emailAddress: 'dev@example.com',
        organizationName: 'Acme',
        billingType: 'seat',
        seatTier: 'pro'
      }
    }),
    async (filePath) => {
      const profile = await readProfile(filePath)
      assert.deepEqual(profile, {
        email: 'dev@example.com',
        orgName: 'Acme',
        billingType: 'seat',
        seatTier: 'pro'
      })
    }
  )
})

test('returns an empty profile when the file is missing', async () => {
  const profile = await readProfile('/nonexistent/path/.claude.json')
  assert.deepEqual(profile, { email: null, orgName: null, billingType: null, seatTier: null })
})

test('returns an empty profile for malformed JSON instead of throwing', async () => {
  await withTempFile('{not valid json', async (filePath) => {
    const profile = await readProfile(filePath)
    assert.deepEqual(profile, { email: null, orgName: null, billingType: null, seatTier: null })
  })
})

test('returns an empty profile when oauthAccount is absent', async () => {
  await withTempFile(JSON.stringify({ projects: {} }), async (filePath) => {
    const profile = await readProfile(filePath)
    assert.deepEqual(profile, { email: null, orgName: null, billingType: null, seatTier: null })
  })
})
