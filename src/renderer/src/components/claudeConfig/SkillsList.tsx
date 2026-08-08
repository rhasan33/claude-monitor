import { useState } from 'react'
import type { SkillDetail } from '../../../../shared/types'
import { useClaudeConfig } from '../../state/claudeConfigStore'
import { SkillEditor } from './SkillEditor'

export function SkillsList() {
  const { state } = useClaudeConfig()
  const [editing, setEditing] = useState<SkillDetail | 'new' | null>(null)

  const openForEdit = async (id: string): Promise<void> => {
    const detail = await window.api.getSkill(state.scope, id)
    setEditing(detail)
  }

  if (editing === 'new') {
    return <SkillEditor skill={null} onClose={() => setEditing(null)} />
  }
  if (editing) {
    return <SkillEditor skill={editing} onClose={() => setEditing(null)} />
  }

  return (
    <div className="panel">
      <h2>Skills</h2>
      {state.loading ? (
        <p className="text-muted">Loading…</p>
      ) : state.error ? (
        <p className="text-muted">Couldn&rsquo;t load skills: {state.error}</p>
      ) : state.skills.length === 0 ? (
        <p className="text-muted">No skills found in this scope yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {state.skills.map((skill) => (
                <tr key={skill.id} className="config-list-row" onClick={() => openForEdit(skill.id)}>
                  <td>{skill.name}</td>
                  <td>{skill.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="refresh-button" onClick={() => setEditing('new')}>
        New skill
      </button>
    </div>
  )
}
