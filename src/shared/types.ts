// Domain types shared across main, preload, and renderer.
// Keep these source-agnostic: nothing here should assume the data came from
// Claude Code's local JSONL logs specifically, so a future usage source
// (Anthropic Admin API, self-instrumented API calls) can populate the same
// shapes without changing aggregation or UI code.

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  cacheCreationEphemeral1hTokens: number
  cacheCreationEphemeral5mTokens: number
  webSearchRequests: number
  webFetchRequests: number
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'other'

/** One normalized usage-bearing event, independent of where it came from. */
export interface UsageSourceEvent {
  sourceId: string
  eventUuid: string
  sessionId: string
  projectPath: string
  timestampMs: number
  role: MessageRole
  model?: string
  usage?: TokenUsage
  toolUseNames: string[]
}

export interface DailyUsage {
  date: string // 'YYYY-MM-DD', local time
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  messageCount: number
  sessionIds: string[]
}

export interface ModelUsage {
  model: string
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  messageCount: number
}

export interface ProjectSummary {
  projectPath: string
  displayName: string
  sessionCount: number
  messageCount: number
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  firstSeenAt: string | null
  lastSeenAt: string | null
}

export interface ToolUsageCount {
  toolName: string
  count: number
}

export interface CacheEfficiency {
  cacheReadTokens: number
  cacheCreationTokens: number
  estimatedSavingsUsd: number
  /** cacheReadTokens / cacheCreationTokens, 0 when there's no cache creation yet. */
  readToCreationRatio: number
}

export interface OverviewTotals {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  sessionCount: number
  messageCount: number
  projectCount: number
}

export interface AggregatedOverview {
  totals: OverviewTotals
  daily: DailyUsage[]
  byModel: ModelUsage[]
  byProject: ProjectSummary[]
  cacheEfficiency: CacheEfficiency
  toolUsage: ToolUsageCount[]
  warnings: string[]
  generatedAt: string
}

export interface OverviewParams {
  dateRange?: { from: string; to: string }
  projectFilter?: string
  modelFilter?: string
}

export interface ActivityItem {
  timestamp: string
  display: string
  project: string
  sessionId: string
}

export interface Profile {
  email: string | null
  orgName: string | null
  billingType: string | null
  seatTier: string | null
}

export interface RefreshResult {
  filesScanned: number
  eventsIngested: number
  durationMs: number
  warnings: string[]
}

export interface BudgetSettings {
  /** Null means no budget is configured. */
  monthlyLimitUsd: number | null
}

export type ExportFormat = 'csv' | 'json'

export interface ExportOverviewRequest {
  format: ExportFormat
  params?: OverviewParams
}

export interface ExportResult {
  /** Null when the user canceled the save dialog. */
  filePath: string | null
}

export const IPC_CHANNELS = {
  refresh: 'usage:refresh',
  getOverview: 'usage:getOverview',
  getProjects: 'usage:getProjects',
  getRecentActivity: 'usage:getRecentActivity',
  getProfile: 'usage:getProfile',
  exportOverview: 'usage:exportOverview',
  getBudget: 'usage:getBudget',
  setBudget: 'usage:setBudget'
} as const
