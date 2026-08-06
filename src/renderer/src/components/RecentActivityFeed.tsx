import type { ActivityItem } from '../../../shared/types'

export function RecentActivityFeed({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="panel">
        <h2>Recent activity</h2>
        <p className="text-muted">No history recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>Recent activity</h2>
      <ul className="activity-feed">
        {activity.map((item, index) => (
          <li key={`${item.sessionId}-${item.timestamp}-${index}`}>
            <span className="activity-time">{new Date(item.timestamp).toLocaleString()}</span>
            <span className="activity-display">{item.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
