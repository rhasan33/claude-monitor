import { readFile, readdir, rm } from 'fs/promises'
import { join } from 'path'
import type { ConfigScope, SkillDetail, SkillInput, SkillSummary } from '../../../shared/types'
import { paths, projectClaudePaths } from '../paths'
import { atomicWriteFile } from '../atomicWrite'

const SKILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/** Rejects ids that could escape the skills directory (path traversal) when used as a folder name. */
function assertSafeSkillId(id: string): void {
  if (!SKILL_ID_PATTERN.test(id)) {
    throw new Error(`Invalid skill id: ${id}`)
  }
}

function resolveSkillsDir(scope: ConfigScope, skillsDirOverride?: string): string {
  if (skillsDirOverride) return skillsDirOverride
  return scope === 'global' ? paths.skillsDir : projectClaudePaths(scope.project).skillsDir
}

function resolveScopeLabel(scope: ConfigScope): 'global' | 'project' {
  return scope === 'global' ? 'global' : 'project'
}

/** Splits a SKILL.md file into its frontmatter (name/description) and body. Never throws on malformed input. */
function parseSkillMd(content: string): { name: string; description: string; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { name: '', description: '', body: content }

  const [, frontmatter, body] = match
  let name = ''
  let description = ''
  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (key === 'name') name = value
    else if (key === 'description') description = value
  }
  return { name, description, body: body.replace(/^\n/, '') }
}

function formatSkillMd(name: string, description: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`
}

/** Lists skills in the given scope's skills directory. Missing directory -> empty list, not an error. */
export async function listSkills(scope: ConfigScope, skillsDirOverride?: string): Promise<SkillSummary[]> {
  const skillsDir = resolveSkillsDir(scope, skillsDirOverride)
  let entries: string[]
  try {
    entries = (await readdir(skillsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }

  const summaries: SkillSummary[] = []
  for (const id of entries) {
    const skillMdPath = join(skillsDir, id, 'SKILL.md')
    let content: string
    try {
      content = await readFile(skillMdPath, 'utf-8')
    } catch {
      continue
    }
    const { name, description } = parseSkillMd(content)
    summaries.push({
      id,
      name: name || id,
      description,
      scope: resolveScopeLabel(scope),
      path: join(skillsDir, id)
    })
  }
  return summaries
}

/** Reads one skill's full detail. Returns null if the skill or its SKILL.md doesn't exist. */
export async function getSkill(
  scope: ConfigScope,
  id: string,
  skillsDirOverride?: string
): Promise<SkillDetail | null> {
  assertSafeSkillId(id)
  const skillsDir = resolveSkillsDir(scope, skillsDirOverride)
  const skillDir = join(skillsDir, id)
  const skillMdPath = join(skillDir, 'SKILL.md')

  let content: string
  try {
    content = await readFile(skillMdPath, 'utf-8')
  } catch {
    return null
  }

  let supportingFiles: string[] = []
  try {
    supportingFiles = (await readdir(skillDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name !== 'SKILL.md')
      .map((entry) => entry.name)
  } catch {
    supportingFiles = []
  }

  const { name, description, body } = parseSkillMd(content)
  return {
    id,
    name: name || id,
    description,
    scope: resolveScopeLabel(scope),
    path: skillDir,
    instructionsBody: body,
    supportingFiles
  }
}

/** Creates or overwrites a skill's SKILL.md. */
export async function saveSkill(
  scope: ConfigScope,
  input: SkillInput,
  skillsDirOverride?: string
): Promise<void> {
  assertSafeSkillId(input.id)
  const skillsDir = resolveSkillsDir(scope, skillsDirOverride)
  const skillMdPath = join(skillsDir, input.id, 'SKILL.md')
  await atomicWriteFile(skillMdPath, formatSkillMd(input.name, input.description, input.instructionsBody))
}

/** Removes a skill's entire directory. Missing skill is a no-op, not an error. */
export async function deleteSkill(scope: ConfigScope, id: string, skillsDirOverride?: string): Promise<void> {
  assertSafeSkillId(id)
  const skillsDir = resolveSkillsDir(scope, skillsDirOverride)
  await rm(join(skillsDir, id), { recursive: true, force: true })
}
