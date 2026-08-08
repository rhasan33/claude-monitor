import { readFile } from 'fs/promises'
import type { ClaudeSettings, ConfigScope } from '../../../shared/types'
import { paths, projectClaudePaths } from '../paths'
import { atomicWriteFile } from '../atomicWrite'

function resolveSettingsPath(scope: ConfigScope, filePathOverride?: string): string {
  if (filePathOverride) return filePathOverride
  return scope === 'global' ? paths.globalSettingsJson : projectClaudePaths(scope.project).settingsJson
}

/** Reads Claude Code settings.json for the given scope. Missing/malformed file -> {}, not an error. */
export async function readSettings(scope: ConfigScope, filePathOverride?: string): Promise<ClaudeSettings> {
  const filePath = resolveSettingsPath(scope, filePathOverride)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return {}
  }

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** Overwrites Claude Code settings.json in full for the given scope. */
export async function writeSettings(
  scope: ConfigScope,
  settings: ClaudeSettings,
  filePathOverride?: string
): Promise<void> {
  const filePath = resolveSettingsPath(scope, filePathOverride)
  await atomicWriteFile(filePath, JSON.stringify(settings, null, 2))
}
