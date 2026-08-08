import { useState } from 'react'
import type { ClaudeSettings } from '../../../../shared/types'
import { useClaudeConfig } from '../../state/claudeConfigStore'

function StringListEditor({
  label,
  values,
  onChange
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = (): void => {
    if (!draft.trim()) return
    onChange([...values, draft.trim()])
    setDraft('')
  }

  return (
    <div className="config-form-list">
      <span className="text-muted config-form-list-label">{label}</span>
      <div className="config-form-chips">
        {values.map((value, index) => (
          <span key={`${value}-${index}`} className="config-form-chip">
            {value}
            <button onClick={() => onChange(values.filter((_, i) => i !== index))}>&times;</button>
          </span>
        ))}
      </div>
      <div className="config-form-chip-input">
        <input
          value={draft}
          placeholder={`Add to ${label.toLowerCase()}…`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button className="refresh-button" onClick={add}>
          Add
        </button>
      </div>
    </div>
  )
}

export function SettingsEditor() {
  const { state, saveSettings } = useClaudeConfig()
  const [allow, setAllow] = useState<string[]>(state.settings.permissions?.allow ?? [])
  const [deny, setDeny] = useState<string[]>(state.settings.permissions?.deny ?? [])
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState(() => JSON.stringify(state.settings, null, 2))
  const [rawError, setRawError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const settingsKey = JSON.stringify(state.settings)
  const [seededFor, setSeededFor] = useState(settingsKey)
  if (settingsKey !== seededFor) {
    setAllow(state.settings.permissions?.allow ?? [])
    setDeny(state.settings.permissions?.deny ?? [])
    setRawText(JSON.stringify(state.settings, null, 2))
    setSeededFor(settingsKey)
  }

  const handleSaveStructured = async (): Promise<void> => {
    const updated: ClaudeSettings = {
      ...state.settings,
      permissions: { ...state.settings.permissions, allow, deny }
    }
    setSaving(true)
    try {
      await saveSettings(updated)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRaw = async (): Promise<void> => {
    let parsed: ClaudeSettings
    try {
      parsed = JSON.parse(rawText)
    } catch (error) {
      setRawError(error instanceof Error ? error.message : String(error))
      return
    }
    setRawError(null)
    setSaving(true)
    try {
      await saveSettings(parsed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel">
      <h2>Settings</h2>
      {state.loading ? (
        <p className="text-muted">Loading…</p>
      ) : state.error ? (
        <p className="text-muted">Couldn&rsquo;t load settings: {state.error}</p>
      ) : (
        <>
          <button className="refresh-button config-form-mode-toggle" onClick={() => setRawMode(!rawMode)}>
            {rawMode ? 'Use structured editor' : 'Edit raw JSON'}
          </button>

          {rawMode ? (
            <div className="config-form">
              <textarea
                rows={16}
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  setRawError(null)
                }}
              />
              {rawError && <span className="config-form-hint confirm-dialog-danger">Invalid JSON: {rawError}</span>}
              <div className="config-form-actions">
                <button className="refresh-button" onClick={handleSaveRaw} disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="config-form">
              <StringListEditor label="Allowed tools" values={allow} onChange={setAllow} />
              <StringListEditor label="Denied tools" values={deny} onChange={setDeny} />
              <div className="config-form-actions">
                <button className="refresh-button" onClick={handleSaveStructured} disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
