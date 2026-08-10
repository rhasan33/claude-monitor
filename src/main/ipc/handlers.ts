import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'fs/promises'
import { IPC_CHANNELS } from '../../shared/types'
import type {
  AggregatedOverview,
  BudgetSettings,
  ClaudeSettings,
  ConfigScope,
  ExportOverviewRequest,
  ExportResult,
  ExportSkillsRequest,
  ExportSkillsResult,
  McpServerConfig,
  OverviewParams,
  PricingOverride,
  RefreshResult,
  SkillInput,
  UsageSourceEvent
} from '../../shared/types'
import { claudeCodeLocalSource } from '../sources/claude-code-local'
import { buildOverview, buildSessionSummaries } from '../lib/aggregator'
import { buildProjectInsights } from '../lib/suggestions'
import { overviewToCsv, overviewToJson } from '../lib/exportOverview'
import { readBudget, writeBudget } from '../lib/budgetStore'
import { applyPricingOverrides, MODEL_PRICING_TABLE, type PricingRow } from '../lib/pricing'
import { readPricingOverrides, writePricingOverrides } from '../lib/pricingOverridesStore'
import { readProfile } from '../lib/claudeJson'
import { readRecentActivity } from '../lib/historyReader'
import { listSkills, getSkill, saveSkill, deleteSkill, exportSkills as exportSkillsToDir } from '../lib/claudeConfig/skillsStore'
import {
  readGlobalMcpServers,
  writeGlobalMcpServers,
  readProjectMcpServers,
  writeProjectMcpServers
} from '../lib/claudeConfig/mcpServersStore'
import { readSettings, writeSettings } from '../lib/claudeConfig/settingsStore'

// The one piece of "persistence" in v1: the last full scan, held in memory
// for the process lifetime. Re-parsing the source files is a manual
// `refresh()` away, not a background job — see README for why.
let cachedEvents: UsageSourceEvent[] = []

// Loaded once at startup (see registerIpcHandlers), updated in memory on
// every setPricingOverrides call so getOverview/getSessions/etc. don't need
// to hit disk per call.
let pricingOverrides: PricingOverride[] = []

function currentPricingTable(): PricingRow[] {
  return applyPricingOverrides(MODEL_PRICING_TABLE, pricingOverrides)
}

// Set once by index.ts so setPricingOverrides can push a live update without
// a full re-scan (costs change, but the underlying events don't).
let notifyDataChanged: () => void = () => {}
export function setDataChangedNotifier(fn: () => void): void {
  notifyDataChanged = fn
}

export async function refresh(): Promise<RefreshResult> {
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

/** Snapshot of the last refresh, for callers outside the IPC layer (e.g. the tray). */
export function getCurrentOverview(): AggregatedOverview {
  return buildOverview(cachedEvents, undefined, currentPricingTable())
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

  const overview = buildOverview(cachedEvents, request.params, currentPricingTable())
  const content = request.format === 'csv' ? overviewToCsv(overview) : overviewToJson(overview)
  await writeFile(filePath, content, 'utf8')

  return { filePath }
}

async function exportSkills(request: ExportSkillsRequest): Promise<ExportSkillsResult> {
  const focusedWindow = BrowserWindow.getFocusedWindow() ?? undefined
  const dialogOptions: Electron.OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] }
  const { canceled, filePaths } = focusedWindow
    ? await dialog.showOpenDialog(focusedWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)
  if (canceled || !filePaths[0]) return { destDir: null }

  const destDir = filePaths[0]
  await exportSkillsToDir(request.scope, request.ids, destDir)
  return { destDir }
}

async function exportSandboxConfig(scope: ConfigScope): Promise<ExportResult> {
  const focusedWindow = BrowserWindow.getFocusedWindow() ?? undefined
  const dialogOptions = {
    defaultPath: `sandbox-config-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }
  const { canceled, filePath } = focusedWindow
    ? await dialog.showSaveDialog(focusedWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)
  if (canceled || !filePath) return { filePath: null }

  const settings = await readSettings(scope)
  await writeFile(filePath, JSON.stringify(settings.sandbox ?? {}, null, 2), 'utf8')

  return { filePath }
}

export async function registerIpcHandlers(): Promise<void> {
  pricingOverrides = await readPricingOverrides()

  ipcMain.handle(IPC_CHANNELS.refresh, () => refresh())

  ipcMain.handle(IPC_CHANNELS.getOverview, (_event, params?: OverviewParams) =>
    buildOverview(cachedEvents, params, currentPricingTable())
  )

  ipcMain.handle(IPC_CHANNELS.getProjects, () => buildOverview(cachedEvents, undefined, currentPricingTable()).byProject)

  ipcMain.handle(IPC_CHANNELS.getRecentActivity, (_event, limit?: number) =>
    readRecentActivity(limit ?? 50)
  )

  ipcMain.handle(IPC_CHANNELS.getProfile, () => readProfile())

  ipcMain.handle(IPC_CHANNELS.exportOverview, (_event, request: ExportOverviewRequest) =>
    exportOverview(request)
  )

  ipcMain.handle(IPC_CHANNELS.getBudget, () => readBudget())

  ipcMain.handle(IPC_CHANNELS.setBudget, (_event, budget: BudgetSettings) => writeBudget(budget))

  ipcMain.handle(IPC_CHANNELS.getSessions, (_event, projectPath: string) =>
    buildSessionSummaries(cachedEvents, projectPath, currentPricingTable())
  )

  ipcMain.handle(IPC_CHANNELS.getProjectInsights, (_event, projectPath: string) =>
    buildProjectInsights(cachedEvents, projectPath, currentPricingTable())
  )

  ipcMain.handle(IPC_CHANNELS.getPricingOverrides, () => pricingOverrides)

  ipcMain.handle(IPC_CHANNELS.setPricingOverrides, async (_event, overrides: PricingOverride[]) => {
    await writePricingOverrides(overrides)
    pricingOverrides = overrides
    notifyDataChanged()
  })

  ipcMain.handle(IPC_CHANNELS.listSkills, (_event, scope: ConfigScope) => listSkills(scope))

  ipcMain.handle(IPC_CHANNELS.getSkill, (_event, scope: ConfigScope, id: string) => getSkill(scope, id))

  ipcMain.handle(IPC_CHANNELS.saveSkill, (_event, scope: ConfigScope, input: SkillInput) => saveSkill(scope, input))

  ipcMain.handle(IPC_CHANNELS.deleteSkill, (_event, scope: ConfigScope, id: string) => deleteSkill(scope, id))

  ipcMain.handle(IPC_CHANNELS.exportSkills, (_event, request: ExportSkillsRequest) => exportSkills(request))

  ipcMain.handle(IPC_CHANNELS.getMcpServers, (_event, scope: ConfigScope) =>
    scope === 'global' ? readGlobalMcpServers() : readProjectMcpServers(scope)
  )

  ipcMain.handle(IPC_CHANNELS.saveMcpServers, (_event, scope: ConfigScope, servers: McpServerConfig[]) =>
    scope === 'global' ? writeGlobalMcpServers(servers) : writeProjectMcpServers(scope, servers)
  )

  ipcMain.handle(IPC_CHANNELS.getSettings, (_event, scope: ConfigScope) => readSettings(scope))

  ipcMain.handle(IPC_CHANNELS.saveSettings, (_event, scope: ConfigScope, settings: ClaudeSettings) =>
    writeSettings(scope, settings)
  )

  ipcMain.handle(IPC_CHANNELS.exportSandboxConfig, (_event, scope: ConfigScope) => exportSandboxConfig(scope))
}
