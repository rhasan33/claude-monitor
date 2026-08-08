import { useState } from 'react'
import { useApp } from '../../state/store'
import { ClaudeConfigProvider, useClaudeConfig } from '../../state/claudeConfigStore'
import { SkillsList } from './SkillsList'
import { McpServersPanel } from './McpServersPanel'

type ConfigTab = 'skills' | 'mcp'

function ClaudeConfigInner() {
  const { state: appState } = useApp()
  const { state, setScope } = useClaudeConfig()
  const [tab, setTab] = useState<ConfigTab>('skills')

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
        <button
          className={`claude-config-tab ${tab === 'skills' ? 'claude-config-tab-active' : ''}`}
          onClick={() => setTab('skills')}
        >
          Skills
        </button>
        <button
          className={`claude-config-tab ${tab === 'mcp' ? 'claude-config-tab-active' : ''}`}
          onClick={() => setTab('mcp')}
        >
          MCP servers
        </button>
      </div>

      {tab === 'skills' && <SkillsList />}
      {tab === 'mcp' && <McpServersPanel />}
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
