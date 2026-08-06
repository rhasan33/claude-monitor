import type { DailyUsage } from './types'

export interface PeriodTotals {
  costUsd: number
  totalTokens: number
}

export interface PeriodComparison {
  current: PeriodTotals
  previous: PeriodTotals
  /** null when the previous window has no data to compare against (division by zero). */
  costDeltaPct: number | null
  totalTokensDeltaPct: number | null
}

function sumWindow(days: DailyUsage[]): PeriodTotals {
  return days.reduce(
    (acc, day) => ({
      costUsd: acc.costUsd + day.costUsd,
      totalTokens:
        acc.totalTokens +
        day.inputTokens +
        day.outputTokens +
        day.cacheCreationInputTokens +
        day.cacheReadInputTokens
    }),
    { costUsd: 0, totalTokens: 0 }
  )
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Compares the most recent `windowDays` of daily usage against the
 * `windowDays` immediately before it. `daily` is expected pre-sorted
 * ascending by date (as `buildOverview` produces it) and reflects whatever
 * project/model/date filters are already active — this is a trailing-window
 * comparison over whatever days are present, not a calendar-week comparison.
 */
export function computeTrailingWindowComparison(daily: DailyUsage[], windowDays = 7): PeriodComparison | null {
  if (daily.length < 2) return null

  const currentWindow = daily.slice(-windowDays)
  const previousWindow = daily.slice(-windowDays * 2, -windowDays)
  if (previousWindow.length === 0) return null

  const current = sumWindow(currentWindow)
  const previous = sumWindow(previousWindow)

  return {
    current,
    previous,
    costDeltaPct: deltaPct(current.costUsd, previous.costUsd),
    totalTokensDeltaPct: deltaPct(current.totalTokens, previous.totalTokens)
  }
}
