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

export interface HeatmapCell {
  /** 0 = Sunday .. 6 = Saturday, local time. */
  dayOfWeek: number
  /** 0-23, local time. */
  hour: number
  messageCount: number
}

export interface AggregatedOverview {
  totals: OverviewTotals
  daily: DailyUsage[]
  byModel: ModelUsage[]
  byProject: ProjectSummary[]
  cacheEfficiency: CacheEfficiency
  toolUsage: ToolUsageCount[]
  /** Always 168 cells (7 days x 24 hours), in dayOfWeek-then-hour order, zero-filled. */
  activityHeatmap: HeatmapCell[]
  warnings: string[]
  generatedAt: string
}

export interface OverviewParams {
  dateRange?: { from: string; to: string }
  projectFilter?: string
  modelFilter?: string
}

export interface SessionSummary {
  sessionId: string
  projectPath: string
  models: string[]
  messageCount: number
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  toolUsage: ToolUsageCount[]
  startedAt: string
  endedAt: string
}

/** A single, deterministically-computed tip for cutting token spend on one project. */
export interface Suggestion {
  /** Stable rule key, e.g. 'low-cache-reuse' — not shown to the user, safe to key/test on. */
  id: string
  severity: 'info' | 'warning'
  title: string
  detail: string
  estimatedSavingsUsd?: number
}

/** Per-project efficiency breakdown plus the suggestions derived from it. */
export interface ProjectInsights {
  projectPath: string
  cacheEfficiency: CacheEfficiency
  byModel: ModelUsage[]
  toolUsage: ToolUsageCount[]
  suggestions: Suggestion[]
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

export interface PricingOverride {
  modelId: string
  inputPerMtok: number
  outputPerMtok: number
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

/** Which Claude Code config location a claudeConfig read/write applies to. */
export type ConfigScope = 'global' | { project: string }

export interface SkillFrontmatter {
  name: string
  description: string
}

export interface SkillSummary {
  /** Directory name under skills/, also the skill's slug/id. */
  id: string
  name: string
  description: string
  scope: 'global' | 'project'
  path: string
}

export interface SkillDetail extends SkillSummary {
  /** SKILL.md content after the frontmatter block. */
  instructionsBody: string
  /** Relative paths of other files in the skill's directory, besides SKILL.md. */
  supportingFiles: string[]
}

export interface SkillInput {
  /** Directory name; must be a safe slug (validated in skillsStore). */
  id: string
  name: string
  description: string
  instructionsBody: string
}

export type McpTransport = 'stdio' | 'http' | 'sse'

export interface McpServerConfig {
  name: string
  transport: McpTransport
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
}

export interface ClaudeSettings {
  permissions?: {
    allow?: string[]
    deny?: string[]
    [key: string]: unknown
  }
  sandbox?: {
    enabled?: boolean
    autoAllowBashIfSandboxed?: boolean
    excludedCommands?: string[]
    filesystem?: {
      allowWrite?: string[]
      denyRead?: string[]
      [key: string]: unknown
    }
    network?: {
      allowedDomains?: string[]
      deniedDomains?: string[]
      allowUnixSockets?: string[]
      allowLocalBinding?: boolean
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  hooks?: Record<string, unknown>
  /** Raw passthrough for any fields this app's UI doesn't model explicitly. */
  [key: string]: unknown
}

export const IPC_CHANNELS = {
  refresh: 'usage:refresh',
  getOverview: 'usage:getOverview',
  getProjects: 'usage:getProjects',
  getRecentActivity: 'usage:getRecentActivity',
  getProfile: 'usage:getProfile',
  exportOverview: 'usage:exportOverview',
  getBudget: 'usage:getBudget',
  setBudget: 'usage:setBudget',
  getSessions: 'usage:getSessions',
  getPricingOverrides: 'usage:getPricingOverrides',
  setPricingOverrides: 'usage:setPricingOverrides',
  /** Push-only: main -> renderer, sent after an auto-refresh. No ipcMain.handle for this one. */
  dataChanged: 'usage:dataChanged',

  listSkills: 'skills:list',
  getSkill: 'skills:get',
  saveSkill: 'skills:save',
  deleteSkill: 'skills:delete',

  getMcpServers: 'mcp:list',
  saveMcpServers: 'mcp:save',

  getSettings: 'settings:get',
  saveSettings: 'settings:save'
} as const
