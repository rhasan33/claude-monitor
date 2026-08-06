import type { DailyUsage } from './types'

export interface DailyCacheHitRate {
  date: string
  /** cacheReadInputTokens / (cacheReadInputTokens + cacheCreationInputTokens) * 100, 0 when neither occurred that day. */
  hitRatePct: number
}

/** Per-day cache hit rate — the trend behind the single aggregate ratio in `CacheEfficiency`. */
export function dailyCacheHitRate(daily: DailyUsage[]): DailyCacheHitRate[] {
  return daily.map((day) => {
    const total = day.cacheReadInputTokens + day.cacheCreationInputTokens
    return {
      date: day.date,
      hitRatePct: total > 0 ? (day.cacheReadInputTokens / total) * 100 : 0
    }
  })
}
