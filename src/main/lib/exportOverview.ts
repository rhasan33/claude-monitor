import type { AggregatedOverview } from '../../shared/types'

const CSV_COLUMNS = [
  'date',
  'inputTokens',
  'outputTokens',
  'cacheCreationInputTokens',
  'cacheReadInputTokens',
  'costUsd',
  'messageCount',
  'sessionCount'
] as const

function csvEscape(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Serializes the per-day rows of an overview to CSV — `daily` is the one
 * flat, spreadsheet-friendly table in `AggregatedOverview`; by/model and
 * by/project breakdowns stay in the JSON export instead of forcing a second
 * CSV shape on the user.
 */
export function overviewToCsv(overview: AggregatedOverview): string {
  const header = CSV_COLUMNS.join(',')
  const rows = overview.daily.map((day) =>
    [
      day.date,
      day.inputTokens,
      day.outputTokens,
      day.cacheCreationInputTokens,
      day.cacheReadInputTokens,
      day.costUsd,
      day.messageCount,
      day.sessionIds.length
    ]
      .map(csvEscape)
      .join(',')
  )
  return [header, ...rows].join('\n') + '\n'
}

export function overviewToJson(overview: AggregatedOverview): string {
  return JSON.stringify(overview, null, 2)
}
