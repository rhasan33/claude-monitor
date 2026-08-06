import { createReadStream } from 'fs'
import { access } from 'fs/promises'
import { createInterface } from 'readline'
import type { ActivityItem } from '../../shared/types'
import { paths } from './paths'

interface RawHistoryLine {
  display?: string
  project?: string
  sessionId?: string
  timestamp?: string
}

function parseHistoryLine(line: string): ActivityItem | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let raw: RawHistoryLine
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return null
  }

  if (!raw.timestamp || !raw.display) return null

  return {
    timestamp: raw.timestamp,
    display: raw.display,
    project: raw.project ?? '',
    sessionId: raw.sessionId ?? ''
  }
}

/** Reads ~/.claude/history.jsonl, newest first. Missing/unreadable file -> empty list, not an error. */
export async function readRecentActivity(
  limit: number,
  filePath: string = paths.historyJsonl
): Promise<ActivityItem[]> {
  try {
    await access(filePath)
  } catch {
    return []
  }

  const items: ActivityItem[] = []
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  try {
    for await (const line of rl) {
      const item = parseHistoryLine(line)
      if (item) items.push(item)
    }
  } catch {
    // Return whatever was read before the stream errored, rather than nothing.
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items.slice(0, limit)
}
