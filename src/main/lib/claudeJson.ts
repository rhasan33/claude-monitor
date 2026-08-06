import { readFile } from 'fs/promises'
import type { Profile } from '../../shared/types'
import { paths } from './paths'

interface RawClaudeJson {
  oauthAccount?: {
    emailAddress?: string
    organizationName?: string
    billingType?: string
    seatTier?: string
  }
}

const EMPTY_PROFILE: Profile = { email: null, orgName: null, billingType: null, seatTier: null }

/** Reads the account/profile section of ~/.claude.json. Missing/unreadable file -> empty profile, not an error. */
export async function readProfile(filePath: string = paths.claudeJson): Promise<Profile> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return EMPTY_PROFILE
  }

  let parsed: RawClaudeJson
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY_PROFILE
  }

  const account = parsed.oauthAccount
  if (!account) return EMPTY_PROFILE

  return {
    email: account.emailAddress ?? null,
    orgName: account.organizationName ?? null,
    billingType: account.billingType ?? null,
    seatTier: account.seatTier ?? null
  }
}
