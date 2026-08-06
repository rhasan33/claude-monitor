import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC_CHANNELS } from '../../shared/types'
import type {
  BudgetSettings,
  ExportOverviewRequest,
  ExportResult,
  OverviewParams,
  RefreshResult,
  UsageSourceEvent
} from '../../shared/types'
import { claudeCodeLocalSource } from '../sources/claude-code-local'
import { buildOverview } from '../lib/aggregator'
import { overviewToCsv, overviewToJson } from '../lib/exportOverview'
import { readBudget, writeBudget } from '../lib/budgetStore'
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

async function exportOverview(request: ExportOverviewRequest): Promise<ExportResult> {
  const extension = request.format === 'csv' ? 'csv' : 'json'
  const focusedWindow = BrowserWindow.getFocusedWindow() ?? undefined
  const dialogOptions = {
    defaultPath: `claude-monitor-overview-${new Date().toISOString().slice(0, 10)}.${extension}`,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
  }
  const { canceled, filePath } = focusedWindow
    ? await dialog.showSaveDialog(focusedWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  if (canceled || !filePath) return { filePath: null }

  const overview = buildOverview(cachedEvents, request.params)
  const content = request.format === 'csv' ? overviewToCsv(overview) : overviewToJson(overview)
  await writeFile(filePath, content, 'utf8')

  return { filePath }
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

  ipcMain.handle(IPC_CHANNELS.exportOverview, (_event, request: ExportOverviewRequest) =>
    exportOverview(request)
  )

  ipcMain.handle(IPC_CHANNELS.getBudget, () => readBudget())

  ipcMain.handle(IPC_CHANNELS.setBudget, (_event, budget: BudgetSettings) => writeBudget(budget))
}
