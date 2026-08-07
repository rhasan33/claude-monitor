import { createReadStream } from 'fs'
import { readdir } from 'fs/promises'
import { createInterface } from 'readline'
import { basename, join } from 'path'
import type { UsageSourceEvent } from '../../../shared/types'
import type { SourceTarget, UsageSource } from '../types'
import { paths } from '../../lib/paths'
import { parseJsonlLine } from './parseJsonlLine'

/**
 * Every `.jsonl` under `dir`, at any depth, as absolute paths.
 *
 * The recursion is what picks up subagent (Task tool) transcripts, which sit a
 * level down at `<session-id>/subagents/agent-*.jsonl` rather than beside the
 * main session file. Their lines carry the *parent* session's `sessionId` and
 * `cwd`, so reading them folds subagent tokens into the session that spawned
 * them — no aggregation changes needed. A flat scan silently omits them, and
 * because nothing downstream knows a file was skipped, the missing usage
 * surfaces as no warning at all.
 */
async function listJsonlFiles(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    const entryPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listJsonlFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(entryPath)
    }
  }
  return files
}

export const claudeCodeLocalSource: UsageSource = {
  id: 'claude_code_local',
  displayName: 'Claude Code (local logs)',

  // projectsDir is a parameter so tests can point at a fixture tree; production
  // callers use the default.
  async discover(projectsDir: string = paths.projectsDir): Promise<SourceTarget[]> {
    const targets: SourceTarget[] = []
    let projectDirs: string[]
    try {
      projectDirs = (await readdir(projectsDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    } catch {
      return targets
    }

    for (const projectDir of projectDirs) {
      const files = await listJsonlFiles(join(projectsDir, projectDir))
      for (const file of files) {
        targets.push({
          id: file,
          sessionId: basename(file, '.jsonl'),
          projectPath: projectDir
        })
      }
    }
    return targets
  },

  async read(target: SourceTarget): Promise<UsageSourceEvent[]> {
    const events: UsageSourceEvent[] = []
    const stream = createReadStream(target.id, { encoding: 'utf-8' })
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    for await (const line of rl) {
      const event = parseJsonlLine(line)
      if (event) events.push(event)
    }
    return events
  }
}
