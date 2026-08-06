import { useState } from 'react'
import { useApp } from './state/store'
import type { ProjectSummary } from '../../shared/types'
import { ProfileHeader } from './components/ProfileHeader'
import { SummaryCards } from './components/SummaryCards'
import { FilterBar } from './components/FilterBar'
import { TokenUsageChart } from './components/TokenUsageChart'
import { ModelBreakdownChart } from './components/ModelBreakdownChart'
import { ProjectBreakdownTable } from './components/ProjectBreakdownTable'
import { SessionList } from './components/SessionList'
import { CacheEfficiencyPanel } from './components/CacheEfficiencyPanel'
import { CacheEfficiencyTrendChart } from './components/CacheEfficiencyTrendChart'
import { ActivityTimeline } from './components/ActivityTimeline'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { RecentActivityFeed } from './components/RecentActivityFeed'
import { ToolUsageChart } from './components/ToolUsageChart'
import { RefreshButton } from './components/RefreshButton'
import { ExportButton } from './components/ExportButton'
import { BudgetPanel } from './components/BudgetPanel'
import { EmptyState } from './components/EmptyState'
import { WarningBanner } from './components/WarningBanner'

export default function App() {
  const { state } = useApp()
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <ProfileHeader profile={state.profile} />
        <div className="header-actions">
          <ExportButton />
          <RefreshButton />
        </div>
      </header>

      <WarningBanner warnings={[...(state.lastRefresh?.warnings ?? []), ...(state.overview?.warnings ?? [])]} />

      {state.loading ? (
        <div className="centered">Loading your Claude usage…</div>
      ) : state.error ? (
        <div className="centered">Couldn&rsquo;t load usage data: {state.error}</div>
      ) : !state.overview || state.overview.totals.messageCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          <FilterBar projects={state.projects} models={state.overview.byModel} />
          <SummaryCards
            totals={state.overview.totals}
            cacheEfficiency={state.overview.cacheEfficiency}
            daily={state.overview.daily}
          />
          <BudgetPanel />
          <div className="grid grid-2">
            <TokenUsageChart daily={state.overview.daily} />
            <ActivityTimeline daily={state.overview.daily} />
          </div>
          <div className="grid grid-2">
            <ModelBreakdownChart byModel={state.overview.byModel} />
            <CacheEfficiencyPanel cacheEfficiency={state.overview.cacheEfficiency} />
          </div>
          <CacheEfficiencyTrendChart daily={state.overview.daily} />
          <ActivityHeatmap cells={state.overview.activityHeatmap} />
          <ProjectBreakdownTable projects={state.overview.byProject} onSelectProject={setSelectedProject} />
          {selectedProject && (
            <SessionList
              key={selectedProject.projectPath}
              project={selectedProject}
              onClose={() => setSelectedProject(null)}
            />
          )}
          <div className="grid grid-2">
            <ToolUsageChart toolUsage={state.overview.toolUsage} />
            <RecentActivityFeed activity={state.activity} />
          </div>
        </>
      )}
    </div>
  )
}
