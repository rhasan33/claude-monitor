import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import type { BudgetSettings } from '../../shared/types'
import { paths } from './paths'

const EMPTY_BUDGET: BudgetSettings = { monthlyLimitUsd: null }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Reads this app's own budget config. Missing/unreadable/malformed file -> no budget set, not an error. */
export async function readBudget(filePath: string = paths.budgetJson): Promise<BudgetSettings> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return EMPTY_BUDGET
  }

  try {
    const parsed = JSON.parse(raw)
    const limit = parsed?.monthlyLimitUsd
    return { monthlyLimitUsd: isFiniteNumber(limit) && limit > 0 ? limit : null }
  } catch {
    return EMPTY_BUDGET
  }
}

export async function writeBudget(
  budget: BudgetSettings,
  filePath: string = paths.budgetJson
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(budget, null, 2), 'utf-8')
}
