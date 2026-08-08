import { useState } from 'react'
import type { SkillDetail } from '../../../../shared/types'
import { useClaudeConfig } from '../../state/claudeConfigStore'
import { ConfirmDialog } from '../ConfirmDialog'

const SKILL_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

interface SkillEditorProps {
  skill: SkillDetail | null // null = creating a new skill
  onClose: () => void
}

export function SkillEditor({ skill, onClose }: SkillEditorProps) {
  const { saveSkill, deleteSkill } = useClaudeConfig()
  const [id, setId] = useState(skill?.id ?? '')
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [body, setBody] = useState(skill?.instructionsBody ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const idValid = SKILL_ID_PATTERN.test(id)

  const handleSave = async (): Promise<void> => {
    if (!idValid) return
    setSaving(true)
    try {
      await saveSkill({ id, name, description, instructionsBody: body })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!skill) return
    await deleteSkill(skill.id)
    onClose()
  }

  return (
    <div className="panel">
      <h2>{skill ? `Edit skill: ${skill.id}` : 'New skill'}</h2>
      <div className="config-form">
        <label>
          Id (directory name)
          <input
            value={id}
            disabled={skill !== null}
            placeholder="my-skill"
            onChange={(e) => setId(e.target.value)}
          />
          {!idValid && id.length > 0 && (
            <span className="text-muted config-form-hint">Lowercase letters, numbers, and hyphens only.</span>
          )}
        </label>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Instructions
          <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
      </div>
      <div className="config-form-actions">
        <button className="refresh-button" onClick={onClose}>
          Cancel
        </button>
        {skill && (
          <button className="refresh-button confirm-dialog-danger" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        )}
        <button className="refresh-button" onClick={handleSave} disabled={saving || !idValid}>
          {saving ? 'Saving…' : 'Save skill'}
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete skill"
          message={`This permanently removes the "${skill?.id}" skill directory from disk.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
