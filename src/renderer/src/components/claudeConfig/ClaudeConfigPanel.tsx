import { useState } from 'react'
import { useApp } from '../../state/store'
import { ClaudeConfigProvider, useClaudeConfig } from '../../state/claudeConfigStore'
import { SkillsList } from './SkillsList'

type ConfigTab = 'skills'

function ClaudeConfigInner() {
  const { state: appState } = useApp()
  const { state, setScope } = useClaudeConfig()
  const [tab] = useState<ConfigTab>('skills')

  const scopeValue = state.scope === 'global' ? 'global' : state.scope.project

  return (
    <div className="claude-config">
      <div className="claude-config-scope">
        <label>
          Scope
          <select
            value={scopeValue}
            onChange={(e) => setScope(e.target.value === 'global' ? 'global' : { project: e.target.value })}
          >
            <option value="global">Global (~/.claude)</option>
            {appState.projects.map((project) => (
              <option key={project.projectPath} value={project.projectPath}>
                {project.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="claude-config-tabs">
        <button className="claude-config-tab claude-config-tab-active">Skills</button>
      </div>

      {tab === 'skills' && <SkillsList />}
    </div>
  )
}

export function ClaudeConfigPanel() {
  return (
    <ClaudeConfigProvider>
      <ClaudeConfigInner />
    </ClaudeConfigProvider>
  )
}
