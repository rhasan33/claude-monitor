import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { listSkills, getSkill, saveSkill, deleteSkill, exportSkills } from './skillsStore'

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'claude-monitor-test-'))
  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('listSkills returns an empty list when the skills directory is missing', async () => {
  await withTempDir(async (dir) => {
    assert.deepEqual(await listSkills('global', join(dir, 'skills')), [])
  })
})

test('listSkills skips directories without a readable SKILL.md', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await mkdir(join(skillsDir, 'no-skill-md'), { recursive: true })
    assert.deepEqual(await listSkills('global', skillsDir), [])
  })
})

test('listSkills parses name/description from frontmatter', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await mkdir(join(skillsDir, 'my-skill'), { recursive: true })
    await writeFile(
      join(skillsDir, 'my-skill', 'SKILL.md'),
      '---\nname: My Skill\ndescription: Does a thing\n---\n\nInstructions body.'
    )
    const skills = await listSkills('global', skillsDir)
    assert.deepEqual(skills, [
      { id: 'my-skill', name: 'My Skill', description: 'Does a thing', scope: 'global', path: join(skillsDir, 'my-skill') }
    ])
  })
})

test('saveSkill rejects an id containing path traversal segments', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await assert.rejects(() =>
      saveSkill('global', { id: '../escape', name: 'x', description: 'x', instructionsBody: 'x' }, skillsDir)
    )
    await assert.rejects(() =>
      saveSkill('global', { id: 'a/b', name: 'x', description: 'x', instructionsBody: 'x' }, skillsDir)
    )
  })
})

test('saveSkill then getSkill round-trips name, description, and body', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await saveSkill(
      'global',
      { id: 'my-skill', name: 'My Skill', description: 'Does a thing', instructionsBody: 'Body text.' },
      skillsDir
    )
    const detail = await getSkill('global', 'my-skill', skillsDir)
    assert.deepEqual(detail, {
      id: 'my-skill',
      name: 'My Skill',
      description: 'Does a thing',
      scope: 'global',
      path: join(skillsDir, 'my-skill'),
      instructionsBody: 'Body text.',
      supportingFiles: []
    })
  })
})

test('getSkill returns null for a nonexistent skill', async () => {
  await withTempDir(async (dir) => {
    assert.equal(await getSkill('global', 'nonexistent', join(dir, 'skills')), null)
  })
})

test('deleteSkill removes the skill directory', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await saveSkill('global', { id: 'my-skill', name: 'x', description: 'x', instructionsBody: 'x' }, skillsDir)
    await deleteSkill('global', 'my-skill', skillsDir)
    assert.equal(await getSkill('global', 'my-skill', skillsDir), null)
  })
})

test('deleteSkill on a nonexistent skill is a no-op, not an error', async () => {
  await withTempDir(async (dir) => {
    await assert.doesNotReject(() => deleteSkill('global', 'nonexistent', join(dir, 'skills')))
  })
})

test('exportSkills copies each skill folder, including supporting files, into destDir', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    const destDir = join(dir, 'export-dest')
    await saveSkill('global', { id: 'my-skill', name: 'My Skill', description: 'x', instructionsBody: 'x' }, skillsDir)
    await writeFile(join(skillsDir, 'my-skill', 'reference.md'), 'extra reference')

    await exportSkills('global', ['my-skill'], destDir, skillsDir)

    const exportedSkillMd = await readFile(join(destDir, 'my-skill', 'SKILL.md'), 'utf-8')
    assert.match(exportedSkillMd, /name: My Skill/)
    const exportedReference = await readFile(join(destDir, 'my-skill', 'reference.md'), 'utf-8')
    assert.equal(exportedReference, 'extra reference')
  })
})

test('exportSkills rejects an unsafe id', async () => {
  await withTempDir(async (dir) => {
    const skillsDir = join(dir, 'skills')
    await assert.rejects(() => exportSkills('global', ['../escape'], join(dir, 'export-dest'), skillsDir))
  })
})
