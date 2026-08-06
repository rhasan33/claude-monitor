import { createReadStream } from 'fs'
import { readdir } from 'fs/promises'
import { createInterface } from 'readline'
import { join } from 'path'
import type { UsageSourceEvent } from '../../../shared/types'
import type { SourceTarget, UsageSource } from '../types'
import { paths } from '../../lib/paths'
import { parseJsonlLine } from './parseJsonlLine'

async function listJsonlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl')).map((e) => e.name)
  } catch {
    return []
  }
}

export const claudeCodeLocalSource: UsageSource = {
  id: 'claude_code_local',
  displayName: 'Claude Code (local logs)',

  async discover(): Promise<SourceTarget[]> {
    const targets: SourceTarget[] = []
    let projectDirs: string[]
    try {
      projectDirs = (await readdir(paths.projectsDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    } catch {
      return targets
    }

    for (const projectDir of projectDirs) {
      const dirPath = join(paths.projectsDir, projectDir)
      const files = await listJsonlFiles(dirPath)
      for (const file of files) {
        targets.push({
          id: join(dirPath, file),
          sessionId: file.replace(/\.jsonl$/, ''),
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
