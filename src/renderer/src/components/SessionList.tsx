import { Fragment, useEffect, useState } from 'react'
import type { ProjectSummary, SessionSummary } from '../../../shared/types'
import { formatTokens, formatUsd } from '../lib/format'

function totalTokens(session: SessionSummary): number {
  return (
    session.inputTokens + session.outputTokens + session.cacheCreationInputTokens + session.cacheReadInputTokens
  )
}

export function SessionList({ project, onClose }: { project: ProjectSummary; onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.getSessions(project.projectPath).then((result) => {
      if (!cancelled) setSessions(result)
    })
    return () => {
      cancelled = true
    }
    // `project.projectPath` only changes via a `key`-driven remount (see App.tsx),
    // which already resets `sessions`/`expandedSessionId` to their initial
    // values — no manual reset needed here.
  }, [project.projectPath])

  return (
    <div className="panel">
      <div className="session-list-header">
        <h2>Sessions in {project.displayName}</h2>
        <button className="refresh-button" onClick={onClose}>
          Close
        </button>
      </div>
      {sessions === null ? (
        <div className="text-muted">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="text-muted">No sessions found for this project.</div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>Started</th>
                <th>Messages</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Models</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const expanded = expandedSessionId === session.sessionId
                return (
                  <Fragment key={session.sessionId}>
                    <tr
                      className="clickable-row"
                      onClick={() => setExpandedSessionId(expanded ? null : session.sessionId)}
                    >
                      <td title={session.sessionId}>{session.sessionId.slice(0, 8)}</td>
                      <td>{new Date(session.startedAt).toLocaleString()}</td>
                      <td>{session.messageCount}</td>
                      <td>{formatTokens(totalTokens(session))}</td>
                      <td>{formatUsd(session.costUsd)}</td>
                      <td>{session.models.join(', ') || '—'}</td>
                    </tr>
                    {expanded && (
                      <tr className="session-detail-row">
                        <td colSpan={6}>
                          {session.toolUsage.length === 0 ? (
                            <span className="text-muted">No tool calls in this session.</span>
                          ) : (
                            <div className="session-tool-usage">
                              {session.toolUsage.map((tool) => (
                                <span key={tool.toolName} className="session-tool-chip">
                                  {tool.toolName} × {tool.count}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
