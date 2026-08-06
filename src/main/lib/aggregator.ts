import type {
  AggregatedOverview,
  CacheEfficiency,
  DailyUsage,
  HeatmapCell,
  ModelUsage,
  OverviewParams,
  OverviewTotals,
  ProjectSummary,
  SessionSummary,
  ToolUsageCount,
  UsageSourceEvent
} from '../../shared/types'
import { calculateCost, estimateCacheSavingsUsd, MODEL_PRICING_TABLE, type PricingRow } from './pricing'

function localDateKey(timestampMs: number): string {
  const d = new Date(timestampMs)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayNameForProject(projectPath: string): string {
  const segments = projectPath.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? projectPath
}

function matchesParams(event: UsageSourceEvent, params?: OverviewParams): boolean {
  if (!params) return true
  if (params.projectFilter && event.projectPath !== params.projectFilter) return false
  if (params.modelFilter && event.model !== params.modelFilter) return false
  if (params.dateRange) {
    const dateKey = localDateKey(event.timestampMs)
    if (dateKey < params.dateRange.from || dateKey > params.dateRange.to) return false
  }
  return true
}

interface Accumulator {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  costUsd: number
  messageCount: number
}

function emptyAccumulator(): Accumulator {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    costUsd: 0,
    messageCount: 0
  }
}

function addUsage(acc: Accumulator, event: UsageSourceEvent, costUsd: number): void {
  if (!event.usage) return
  acc.inputTokens += event.usage.inputTokens
  acc.outputTokens += event.usage.outputTokens
  acc.cacheCreationInputTokens += event.usage.cacheCreationInputTokens
  acc.cacheReadInputTokens += event.usage.cacheReadInputTokens
  acc.costUsd += costUsd
  acc.messageCount += 1
}

/**
 * Folds a flat list of usage events into the dashboard's aggregated shape.
 * Pure and synchronous by design — this is the highest-value place for
 * correctness bugs to hide, so it stays free of fs/IPC concerns and is
 * fully unit-testable. At today's data scale (tens of thousands of events,
 * not millions) holding the parsed event list in memory and re-folding it
 * per query is simpler and fast enough; see README for the v2 path if that
 * ever stops being true.
 */
export function buildOverview(
  events: UsageSourceEvent[],
  params?: OverviewParams,
  pricingTable: PricingRow[] = MODEL_PRICING_TABLE
): AggregatedOverview {
  const warnings: string[] = []
  const unmatchedModels = new Set<string>()

  const totals = emptyAccumulator()
  const sessionIds = new Set<string>()
  const projectPaths = new Set<string>()

  const daily = new Map<string, Accumulator & { sessionIds: Set<string> }>()
  const byModel = new Map<string, Accumulator>()
  const byProject = new Map<
    string,
    Accumulator & { sessionIds: Set<string>; firstSeenMs: number; lastSeenMs: number }
  >()
  const toolUsage = new Map<string, number>()
  // [dayOfWeek][hour], both local time — dense grid, always 7x24.
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))

  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let cacheSavingsUsd = 0

  for (const event of events) {
    if (!matchesParams(event, params)) continue

    sessionIds.add(event.sessionId)
    projectPaths.add(event.projectPath)

    const eventDate = new Date(event.timestampMs)
    heatmap[eventDate.getDay()][eventDate.getHours()] += 1

    for (const toolName of event.toolUseNames) {
      toolUsage.set(toolName, (toolUsage.get(toolName) ?? 0) + 1)
    }

    const project = byProject.get(event.projectPath) ?? {
      ...emptyAccumulator(),
      sessionIds: new Set<string>(),
      firstSeenMs: event.timestampMs,
      lastSeenMs: event.timestampMs
    }
    project.sessionIds.add(event.sessionId)
    project.firstSeenMs = Math.min(project.firstSeenMs, event.timestampMs)
    project.lastSeenMs = Math.max(project.lastSeenMs, event.timestampMs)
    byProject.set(event.projectPath, project)

    if (!event.usage) continue

    const { costUsd, matched } = calculateCost(event.usage, event.model, event.timestampMs, pricingTable)
    if (!matched && event.model) unmatchedModels.add(event.model)

    addUsage(totals, event, costUsd)
    addUsage(project, event, costUsd)

    const dateKey = localDateKey(event.timestampMs)
    const dayAcc = daily.get(dateKey) ?? { ...emptyAccumulator(), sessionIds: new Set<string>() }
    dayAcc.sessionIds.add(event.sessionId)
    addUsage(dayAcc, event, costUsd)
    daily.set(dateKey, dayAcc)

    const modelKey = event.model ?? 'unknown'
    const modelAcc = byModel.get(modelKey) ?? emptyAccumulator()
    addUsage(modelAcc, event, costUsd)
    byModel.set(modelKey, modelAcc)

    cacheCreationTokens += event.usage.cacheCreationInputTokens
    cacheReadTokens += event.usage.cacheReadInputTokens
    cacheSavingsUsd += estimateCacheSavingsUsd(
      event.usage.cacheReadInputTokens,
      event.model,
      event.timestampMs,
      pricingTable
    )
  }

  if (unmatchedModels.size > 0) {
    warnings.push(
      `No pricing entry for model(s): ${Array.from(unmatchedModels).join(', ')} — their cost is shown as $0.`
    )
  }

  const dailyUsage: DailyUsage[] = Array.from(daily.entries())
    .map(([date, acc]) => ({
      date,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens,
      costUsd: acc.costUsd,
      messageCount: acc.messageCount,
      sessionIds: Array.from(acc.sessionIds)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const modelUsage: ModelUsage[] = Array.from(byModel.entries())
    .map(([model, acc]) => ({
      model,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens,
      costUsd: acc.costUsd,
      messageCount: acc.messageCount
    }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const projectSummaries: ProjectSummary[] = Array.from(byProject.entries())
    .map(([projectPath, acc]) => ({
      projectPath,
      displayName: displayNameForProject(projectPath),
      sessionCount: acc.sessionIds.size,
      messageCount: acc.messageCount,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens,
      costUsd: acc.costUsd,
      firstSeenAt: new Date(acc.firstSeenMs).toISOString(),
      lastSeenAt: new Date(acc.lastSeenMs).toISOString()
    }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const toolUsageCounts: ToolUsageCount[] = Array.from(toolUsage.entries())
    .map(([toolName, count]) => ({ toolName, count }))
    .sort((a, b) => b.count - a.count)

  const activityHeatmap: HeatmapCell[] = []
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      activityHeatmap.push({ dayOfWeek, hour, messageCount: heatmap[dayOfWeek][hour] })
    }
  }

  const cacheEfficiency: CacheEfficiency = {
    cacheReadTokens,
    cacheCreationTokens,
    estimatedSavingsUsd: cacheSavingsUsd,
    readToCreationRatio: cacheCreationTokens > 0 ? cacheReadTokens / cacheCreationTokens : 0
  }

  const overviewTotals: OverviewTotals = {
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    cacheCreationInputTokens: totals.cacheCreationInputTokens,
    cacheReadInputTokens: totals.cacheReadInputTokens,
    costUsd: totals.costUsd,
    sessionCount: sessionIds.size,
    messageCount: totals.messageCount,
    projectCount: projectPaths.size
  }

  return {
    totals: overviewTotals,
    daily: dailyUsage,
    byModel: modelUsage,
    byProject: projectSummaries,
    cacheEfficiency,
    toolUsage: toolUsageCounts,
    activityHeatmap,
    warnings,
    generatedAt: new Date().toISOString()
  }
}

/** Groups one project's events by session — the drill-down behind `ProjectSummary`. */
export function buildSessionSummaries(
  events: UsageSourceEvent[],
  projectPath: string,
  pricingTable: PricingRow[] = MODEL_PRICING_TABLE
): SessionSummary[] {
  const sessions = new Map<
    string,
    Accumulator & { toolUsage: Map<string, number>; models: Set<string>; firstMs: number; lastMs: number }
  >()

  for (const event of events) {
    if (event.projectPath !== projectPath) continue

    const session = sessions.get(event.sessionId) ?? {
      ...emptyAccumulator(),
      toolUsage: new Map<string, number>(),
      models: new Set<string>(),
      firstMs: event.timestampMs,
      lastMs: event.timestampMs
    }
    session.firstMs = Math.min(session.firstMs, event.timestampMs)
    session.lastMs = Math.max(session.lastMs, event.timestampMs)
    if (event.model) session.models.add(event.model)
    for (const toolName of event.toolUseNames) {
      session.toolUsage.set(toolName, (session.toolUsage.get(toolName) ?? 0) + 1)
    }

    if (event.usage) {
      const { costUsd } = calculateCost(event.usage, event.model, event.timestampMs, pricingTable)
      addUsage(session, event, costUsd)
    }

    sessions.set(event.sessionId, session)
  }

  return Array.from(sessions.entries())
    .map(([sessionId, acc]) => ({
      sessionId,
      projectPath,
      models: Array.from(acc.models),
      messageCount: acc.messageCount,
      inputTokens: acc.inputTokens,
      outputTokens: acc.outputTokens,
      cacheCreationInputTokens: acc.cacheCreationInputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens,
      costUsd: acc.costUsd,
      toolUsage: Array.from(acc.toolUsage.entries())
        .map(([toolName, count]) => ({ toolName, count }))
        .sort((a, b) => b.count - a.count),
      startedAt: new Date(acc.firstMs).toISOString(),
      endedAt: new Date(acc.lastMs).toISOString()
    }))
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
}
