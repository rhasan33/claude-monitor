import { useEffect, useState } from 'react'
import type { ProjectInsights, ProjectSummary } from '../../../shared/types'
import { formatTokens, formatUsd } from '../lib/format'

const SUGGESTION_VISIBLE_MS = 10_000
const SUGGESTION_FADE_MS = 300

function avgInputTokensPerMessage(insights: ProjectInsights): number {
  return insights.totals.messageCount > 0 ? insights.totals.inputTokens / insights.totals.messageCount : 0
}

export function ProjectInsightsPanel({ project }: { project: ProjectSummary }) {
  const [insights, setInsights] = useState<ProjectInsights | null>(null)
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    window.api.getProjectInsights(project.projectPath).then((result) => {
      if (!cancelled) setInsights(result)
    })
    return () => {
      cancelled = true
    }
    // See SessionList.tsx: `key`-driven remount on projectPath change already
    // resets `insights`/`leavingIds`/`dismissedIds` to their initial values, so
    // no manual reset is needed here.
  }, [project.projectPath])

  useEffect(() => {
    if (!insights || insights.suggestions.length === 0) return
    const timers = insights.suggestions.flatMap((suggestion) => [
      setTimeout(() => setLeavingIds((prev) => new Set(prev).add(suggestion.id)), SUGGESTION_VISIBLE_MS),
      setTimeout(
        () => setDismissedIds((prev) => new Set(prev).add(suggestion.id)),
        SUGGESTION_VISIBLE_MS + SUGGESTION_FADE_MS
      )
    ])
    return () => timers.forEach(clearTimeout)
  }, [insights])

  if (insights === null) {
    return (
      <div className="panel">
        <h2>Efficiency suggestions for {project.displayName}</h2>
        <div className="text-muted">Loading suggestions…</div>
      </div>
    )
  }

  const topModel = insights.byModel[0]
  const topModelShare = topModel && insights.totals.costUsd > 0 ? topModel.costUsd / insights.totals.costUsd : null
  const visibleSuggestions = insights.suggestions.filter((s) => !dismissedIds.has(s.id))

  return (
    <div className="panel">
      <h2>Efficiency suggestions for {project.displayName}</h2>
      <div className="suggestion-stats">
        <div className="suggestion-stat">
          <span className="stat-label">Cache reuse ratio</span>
          <span>{insights.cacheEfficiency.readToCreationRatio.toFixed(2)}</span>
        </div>
        <div className="suggestion-stat">
          <span className="stat-label">Top model share</span>
          <span>{topModel && topModelShare != null ? `${topModel.model} — ${(topModelShare * 100).toFixed(0)}%` : '—'}</span>
        </div>
        <div className="suggestion-stat">
          <span className="stat-label">Avg input tokens/message</span>
          <span>
            {formatTokens(Math.round(avgInputTokensPerMessage(insights)))} (baseline{' '}
            {formatTokens(Math.round(insights.baselineAvgInputTokensPerMessage))})
          </span>
        </div>
      </div>
      {insights.suggestions.length === 0 ? (
        <div className="text-muted">This project looks efficient — no suggestions right now.</div>
      ) : (
        <div className="suggestion-list">
          {visibleSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`suggestion-card suggestion-card--${suggestion.severity}${
                leavingIds.has(suggestion.id) ? ' suggestion-card--leaving' : ''
              }`}
            >
              <div className="suggestion-title">{suggestion.title}</div>
              <div className="suggestion-detail">{suggestion.detail}</div>
              {suggestion.estimatedSavingsUsd != null && suggestion.estimatedSavingsUsd > 0 && (
                <div className="suggestion-savings">~{formatUsd(suggestion.estimatedSavingsUsd)} estimated savings</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
