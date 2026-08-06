import type { ProjectSummary } from '../../../shared/types'
import { formatTokens, formatUsd } from '../lib/format'

export function ProjectBreakdownTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="panel">
      <h2>By project</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Sessions</th>
              <th>Messages</th>
              <th>Tokens</th>
              <th>Cost</th>
              <th>Last active</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.projectPath}>
                <td title={project.projectPath}>{project.displayName}</td>
                <td>{project.sessionCount}</td>
                <td>{project.messageCount}</td>
                <td>
                  {formatTokens(
                    project.inputTokens +
                      project.outputTokens +
                      project.cacheCreationInputTokens +
                      project.cacheReadInputTokens
                  )}
                </td>
                <td>{formatUsd(project.costUsd)}</td>
                <td>{project.lastSeenAt ? new Date(project.lastSeenAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
