import { readFile, writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import type { PricingOverride } from '../../shared/types'
import { paths } from './paths'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidOverride(value: unknown): value is PricingOverride {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.modelId === 'string' &&
    v.modelId.length > 0 &&
    isFiniteNumber(v.inputPerMtok) &&
    v.inputPerMtok > 0 &&
    isFiniteNumber(v.outputPerMtok) &&
    v.outputPerMtok > 0
  )
}

/** Reads this app's pricing rate overrides. Missing/unreadable/malformed file -> no overrides, not an error. */
export async function readPricingOverrides(
  filePath: string = paths.pricingOverridesJson
): Promise<PricingOverride[]> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidOverride)
  } catch {
    return []
  }
}

export async function writePricingOverrides(
  overrides: PricingOverride[],
  filePath: string = paths.pricingOverridesJson
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(overrides, null, 2), 'utf-8')
}
