import type { DailyUsage } from './types'

function monthPrefix(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Sums cost for the calendar month containing `now`, independent of active filters. */
export function currentMonthCost(daily: DailyUsage[], now: Date = new Date()): number {
  const prefix = monthPrefix(now)
  return daily.filter((d) => d.date.startsWith(prefix)).reduce((sum, d) => sum + d.costUsd, 0)
}

export interface MonthEndProjection {
  spentSoFar: number
  projectedTotal: number
  daysElapsed: number
  daysInMonth: number
}

/**
 * Projects month-end spend by extrapolating the average daily rate so far
 * this month across the rest of the month. Returns null when there's no
 * spend recorded yet this month — nothing to extrapolate from.
 */
export function projectMonthEndCost(daily: DailyUsage[], now: Date = new Date()): MonthEndProjection | null {
  const spentSoFar = currentMonthCost(daily, now)
  if (spentSoFar === 0) return null

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const dailyRate = spentSoFar / daysElapsed

  return {
    spentSoFar,
    projectedTotal: dailyRate * daysInMonth,
    daysElapsed,
    daysInMonth
  }
}
