import type {
  AggregatedOverview,
  CacheEfficiency,
  DailyUsage,
  ModelUsage,
  OverviewParams,
  OverviewTotals,
  ProjectSummary,
  ToolUsageCount,
  UsageSourceEvent
} from '../../shared/types'
import { calculateCost, estimateCacheSavingsUsd } from './pricing'

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
export function buildOverview(events: UsageSourceEvent[], params?: OverviewParams): AggregatedOverview {
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

  let cacheCreationTokens = 0
  let cacheReadTokens = 0
  let cacheSavingsUsd = 0

  for (const event of events) {
    if (!matchesParams(event, params)) continue

    sessionIds.add(event.sessionId)
    projectPaths.add(event.projectPath)

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

    const { costUsd, matched } = calculateCost(event.usage, event.model, event.timestampMs)
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
      event.timestampMs
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
    warnings,
    generatedAt: new Date().toISOString()
  }
}
