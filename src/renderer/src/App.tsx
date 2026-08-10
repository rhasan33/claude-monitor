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
import { ProjectInsightsPanel } from './components/ProjectInsightsPanel'
import { CacheEfficiencyPanel } from './components/CacheEfficiencyPanel'
import { CacheEfficiencyTrendChart } from './components/CacheEfficiencyTrendChart'
import { ActivityTimeline } from './components/ActivityTimeline'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { RecentActivityFeed } from './components/RecentActivityFeed'
import { ToolUsageChart } from './components/ToolUsageChart'
import { RefreshButton } from './components/RefreshButton'
import { ExportButton } from './components/ExportButton'
import { BudgetPanel } from './components/BudgetPanel'
import { PricingSettings } from './components/PricingSettings'
import { EmptyState } from './components/EmptyState'
import { WarningBanner } from './components/WarningBanner'
import { ClaudeConfigPanel } from './components/claudeConfig/ClaudeConfigPanel'

export default function App() {
  const { state } = useApp()
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null)
  const [activeView, setActiveView] = useState<'analytics' | 'config'>('analytics')

  const handleSelectProject = (project: ProjectSummary): void => {
    setSelectedProject((prev) => (prev?.projectPath === project.projectPath ? null : project))
  }

  return (
    <div className="app">
      <header className="app-header">
        <ProfileHeader profile={state.profile} />
        <div className="header-actions">
          <div className="view-tabs">
            <button
              className={`view-tab ${activeView === 'analytics' ? 'view-tab-active' : ''}`}
              onClick={() => setActiveView('analytics')}
            >
              Analytics
            </button>
            <button
              className={`view-tab ${activeView === 'config' ? 'view-tab-active' : ''}`}
              onClick={() => setActiveView('config')}
            >
              Claude Code Config
            </button>
          </div>
          {activeView === 'analytics' && (
            <>
              <ExportButton />
              <RefreshButton />
            </>
          )}
        </div>
      </header>

      {activeView === 'config' && <ClaudeConfigPanel />}

      {activeView === 'analytics' && (
        <>
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
              <PricingSettings />
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
              <ProjectBreakdownTable projects={state.overview.byProject} onSelectProject={handleSelectProject} />
              {selectedProject && (
                <>
                  <ProjectInsightsPanel key={`insights-${selectedProject.projectPath}`} project={selectedProject} />
                  <SessionList
                    key={`sessions-${selectedProject.projectPath}`}
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                  />
                </>
              )}
              <div className="grid grid-2">
                <ToolUsageChart toolUsage={state.overview.toolUsage} />
                <RecentActivityFeed activity={state.activity} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
