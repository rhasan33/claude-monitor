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
  SessionSummary
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
