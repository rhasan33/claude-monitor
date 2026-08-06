import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import type { OverviewParams, RefreshResult, UsageSourceEvent } from '../../shared/types'
import { claudeCodeLocalSource } from '../sources/claude-code-local'
import { buildOverview } from '../lib/aggregator'
import { readProfile } from '../lib/claudeJson'
import { readRecentActivity } from '../lib/historyReader'

// The one piece of "persistence" in v1: the last full scan, held in memory
// for the process lifetime. Re-parsing the source files is a manual
// `refresh()` away, not a background job — see README for why.
let cachedEvents: UsageSourceEvent[] = []

async function refresh(): Promise<RefreshResult> {
  const startedAt = Date.now()
  const warnings: string[] = []
  const events: UsageSourceEvent[] = []

  const targets = await claudeCodeLocalSource.discover()
  for (const target of targets) {
    try {
      events.push(...(await claudeCodeLocalSource.read(target)))
    } catch (error) {
      warnings.push(`Failed to read ${target.id}: ${(error as Error).message}`)
    }
  }

  cachedEvents = events

  return {
    filesScanned: targets.length,
    eventsIngested: events.length,
    durationMs: Date.now() - startedAt,
    warnings
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.refresh, () => refresh())

  ipcMain.handle(IPC_CHANNELS.getOverview, (_event, params?: OverviewParams) =>
    buildOverview(cachedEvents, params)
  )

  ipcMain.handle(IPC_CHANNELS.getProjects, () => buildOverview(cachedEvents).byProject)

  ipcMain.handle(IPC_CHANNELS.getRecentActivity, (_event, limit?: number) =>
    readRecentActivity(limit ?? 50)
  )

  ipcMain.handle(IPC_CHANNELS.getProfile, () => readProfile())
}
