import { useState, type ChangeEvent } from 'react'
import type { ModelUsage, OverviewParams, ProjectSummary } from '../../../shared/types'
import { useApp } from '../state/store'

export function FilterBar({ projects, models }: { projects: ProjectSummary[]; models: ModelUsage[] }) {
  const { setFilters, state } = useApp()
  const [from, setFrom] = useState(state.filters.dateRange?.from ?? '')
  const [to, setTo] = useState(state.filters.dateRange?.to ?? '')

  const apply = (next: Partial<OverviewParams>): void => {
    void setFilters({ ...state.filters, ...next })
  }

  const handleProjectChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    apply({ projectFilter: e.target.value || undefined })
  }

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    apply({ modelFilter: e.target.value || undefined })
  }

  const handleFromChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setFrom(value)
    apply({ dateRange: value && to ? { from: value, to } : undefined })
  }

  const handleToChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setTo(value)
    apply({ dateRange: from && value ? { from, to: value } : undefined })
  }

  return (
    <div className="filter-bar">
      <label>
        Project
        <select value={state.filters.projectFilter ?? ''} onChange={handleProjectChange}>
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.projectPath} value={project.projectPath}>
              {project.displayName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Model
        <select value={state.filters.modelFilter ?? ''} onChange={handleModelChange}>
          <option value="">All models</option>
          {models.map((model) => (
            <option key={model.model} value={model.model}>
              {model.model}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input type="date" value={from} onChange={handleFromChange} />
      </label>
      <label>
        To
        <input type="date" value={to} onChange={handleToChange} />
      </label>
      {state.filtering && <span className="text-muted">Filtering…</span>}
    </div>
  )
}
