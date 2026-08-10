import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import type {
  OverviewParams,
  ProjectSummary,
  AggregatedOverview,
  ActivityItem,
  Profile,
  RefreshResult,
  ExportOverviewRequest,
  ExportResult,
  BudgetSettings,
  SessionSummary,
  ProjectInsights,
  PricingOverride,
  ConfigScope,
  SkillSummary,
  SkillDetail,
  SkillInput,
  McpServerConfig,
  ClaudeSettings
} from '../shared/types'

const api = {
  refresh: (): Promise<RefreshResult> => ipcRenderer.invoke(IPC_CHANNELS.refresh),
  getOverview: (params?: OverviewParams): Promise<AggregatedOverview> =>
    ipcRenderer.invoke(IPC_CHANNELS.getOverview, params),
  getProjects: (): Promise<ProjectSummary[]> => ipcRenderer.invoke(IPC_CHANNELS.getProjects),
  getRecentActivity: (limit?: number): Promise<ActivityItem[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.getRecentActivity, limit),
  getProfile: (): Promise<Profile> => ipcRenderer.invoke(IPC_CHANNELS.getProfile),
  exportOverview: (request: ExportOverviewRequest): Promise<ExportResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.exportOverview, request),
  getBudget: (): Promise<BudgetSettings> => ipcRenderer.invoke(IPC_CHANNELS.getBudget),
  setBudget: (budget: BudgetSettings): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.setBudget, budget),
  getSessions: (projectPath: string): Promise<SessionSummary[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.getSessions, projectPath),
  getProjectInsights: (projectPath: string): Promise<ProjectInsights> =>
    ipcRenderer.invoke(IPC_CHANNELS.getProjectInsights, projectPath),
  getPricingOverrides: (): Promise<PricingOverride[]> => ipcRenderer.invoke(IPC_CHANNELS.getPricingOverrides),
  setPricingOverrides: (overrides: PricingOverride[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.setPricingOverrides, overrides),
  listSkills: (scope: ConfigScope): Promise<SkillSummary[]> => ipcRenderer.invoke(IPC_CHANNELS.listSkills, scope),
  getSkill: (scope: ConfigScope, id: string): Promise<SkillDetail | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.getSkill, scope, id),
  saveSkill: (scope: ConfigScope, input: SkillInput): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSkill, scope, input),
  deleteSkill: (scope: ConfigScope, id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteSkill, scope, id),
  getMcpServers: (scope: ConfigScope): Promise<McpServerConfig[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.getMcpServers, scope),
  saveMcpServers: (scope: ConfigScope, servers: McpServerConfig[]): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveMcpServers, scope, servers),
  getSettings: (scope: ConfigScope): Promise<ClaudeSettings> => ipcRenderer.invoke(IPC_CHANNELS.getSettings, scope),
  saveSettings: (scope: ConfigScope, settings: ClaudeSettings): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSettings, scope, settings),
  onDataChanged: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.dataChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.dataChanged, listener)
  }
}

export type ClaudeMonitorApi = typeof api

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  throw new Error('contextIsolation must stay enabled — refusing to expose the API on window directly.')
}
