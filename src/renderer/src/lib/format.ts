function toFiniteNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function formatTokens(value: unknown): string {
  const n = toFiniteNumber(value)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatUsd(value: unknown): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toFiniteNumber(value))
}

export function formatPct(value: unknown): string {
  return `${toFiniteNumber(value).toFixed(0)}%`
}

export function formatDateLabel(dateKey: unknown): string {
  if (typeof dateKey !== 'string') return ''
  const [, month, day] = dateKey.split('-')
  return `${month}/${day}`
}
