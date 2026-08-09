import { useLayoutEffect, useRef, useState } from 'react'
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
  const [sandboxEnabled, setSandboxEnabled] = useState(state.settings.sandbox?.enabled ?? false)
  const [autoAllowBash, setAutoAllowBash] = useState(state.settings.sandbox?.autoAllowBashIfSandboxed ?? false)
  const [excludedCommands, setExcludedCommands] = useState<string[]>(
    state.settings.sandbox?.excludedCommands ?? []
  )
  const [fsAllowWrite, setFsAllowWrite] = useState<string[]>(state.settings.sandbox?.filesystem?.allowWrite ?? [])
  const [fsDenyRead, setFsDenyRead] = useState<string[]>(state.settings.sandbox?.filesystem?.denyRead ?? [])
  const [netAllowedDomains, setNetAllowedDomains] = useState<string[]>(
    state.settings.sandbox?.network?.allowedDomains ?? []
  )
  const [netDeniedDomains, setNetDeniedDomains] = useState<string[]>(
    state.settings.sandbox?.network?.deniedDomains ?? []
  )
  const [netAllowUnixSockets, setNetAllowUnixSockets] = useState<string[]>(
    state.settings.sandbox?.network?.allowUnixSockets ?? []
  )
  const [netAllowLocalBinding, setNetAllowLocalBinding] = useState(
    state.settings.sandbox?.network?.allowLocalBinding ?? false
  )
  const [rawMode, setRawMode] = useState(false)
  const [rawText, setRawText] = useState(() => JSON.stringify(state.settings, null, 2))
  const [rawError, setRawError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pendingCaretRef = useRef<number | null>(null)

  const settingsKey = JSON.stringify(state.settings)
  const [seededFor, setSeededFor] = useState(settingsKey)
  if (settingsKey !== seededFor) {
    setAllow(state.settings.permissions?.allow ?? [])
    setDeny(state.settings.permissions?.deny ?? [])
    setSandboxEnabled(state.settings.sandbox?.enabled ?? false)
    setAutoAllowBash(state.settings.sandbox?.autoAllowBashIfSandboxed ?? false)
    setExcludedCommands(state.settings.sandbox?.excludedCommands ?? [])
    setFsAllowWrite(state.settings.sandbox?.filesystem?.allowWrite ?? [])
    setFsDenyRead(state.settings.sandbox?.filesystem?.denyRead ?? [])
    setNetAllowedDomains(state.settings.sandbox?.network?.allowedDomains ?? [])
    setNetDeniedDomains(state.settings.sandbox?.network?.deniedDomains ?? [])
    setNetAllowUnixSockets(state.settings.sandbox?.network?.allowUnixSockets ?? [])
    setNetAllowLocalBinding(state.settings.sandbox?.network?.allowLocalBinding ?? false)
    setRawText(JSON.stringify(state.settings, null, 2))
    setSeededFor(settingsKey)
  }

  const handleSaveStructured = async (): Promise<void> => {
    const updated: ClaudeSettings = {
      ...state.settings,
      permissions: { ...state.settings.permissions, allow, deny },
      sandbox: {
        ...state.settings.sandbox,
        enabled: sandboxEnabled,
        autoAllowBashIfSandboxed: autoAllowBash,
        excludedCommands,
        filesystem: {
          ...state.settings.sandbox?.filesystem,
          allowWrite: fsAllowWrite,
          denyRead: fsDenyRead
        },
        network: {
          ...state.settings.sandbox?.network,
          allowedDomains: netAllowedDomains,
          deniedDomains: netDeniedDomains,
          allowUnixSockets: netAllowUnixSockets,
          allowLocalBinding: netAllowLocalBinding
        }
      }
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

  const handleFormatRaw = (): void => {
    try {
      setRawText(JSON.stringify(JSON.parse(rawText), null, 2))
      setRawError(null)
    } catch (error) {
      setRawError(error instanceof Error ? error.message : String(error))
    }
  }

  // Tab inserts spaces instead of moving focus. The caret position has to be
  // restored after React re-renders the controlled textarea's value, so we
  // stash it and apply it in a layout effect keyed off rawText — only fires
  // when this handler set it, other rawText changes leave it null (no-op).
  const handleRawTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const { selectionStart, selectionEnd, value } = e.currentTarget
    const nextValue = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd)
    pendingCaretRef.current = selectionStart + 2
    setRawText(nextValue)
    setRawError(null)
  }

  useLayoutEffect(() => {
    if (pendingCaretRef.current !== null && rawTextareaRef.current) {
      const pos = pendingCaretRef.current
      rawTextareaRef.current.setSelectionRange(pos, pos)
      pendingCaretRef.current = null
    }
  }, [rawText])

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
                ref={rawTextareaRef}
                rows={16}
                className="config-form-code"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value)
                  setRawError(null)
                }}
                onKeyDown={handleRawTabKey}
              />
              {rawError && <span className="config-form-hint confirm-dialog-danger">Invalid JSON: {rawError}</span>}
              <div className="config-form-actions">
                <button className="refresh-button" onClick={handleFormatRaw} disabled={saving}>
                  Format
                </button>
                <button className="refresh-button" onClick={handleSaveRaw} disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="config-form">
              <StringListEditor label="Allowed tools" values={allow} onChange={setAllow} />
              <StringListEditor label="Denied tools" values={deny} onChange={setDeny} />

              <h3 className="config-form-section-title">Sandbox</h3>
              <label className="config-form-checkbox">
                <input
                  type="checkbox"
                  checked={sandboxEnabled}
                  onChange={(e) => setSandboxEnabled(e.target.checked)}
                />
                Enabled
              </label>
              <label className="config-form-checkbox">
                <input
                  type="checkbox"
                  checked={autoAllowBash}
                  onChange={(e) => setAutoAllowBash(e.target.checked)}
                />
                Auto-allow Bash if sandboxed
              </label>
              <StringListEditor label="Excluded commands" values={excludedCommands} onChange={setExcludedCommands} />

              <h4 className="config-form-section-title">Filesystem</h4>
              <StringListEditor label="Allow write paths" values={fsAllowWrite} onChange={setFsAllowWrite} />
              <StringListEditor label="Deny read paths" values={fsDenyRead} onChange={setFsDenyRead} />

              <h4 className="config-form-section-title">Network</h4>
              <StringListEditor label="Allowed domains" values={netAllowedDomains} onChange={setNetAllowedDomains} />
              <StringListEditor label="Denied domains" values={netDeniedDomains} onChange={setNetDeniedDomains} />
              <StringListEditor
                label="Allow Unix sockets"
                values={netAllowUnixSockets}
                onChange={setNetAllowUnixSockets}
              />
              <label className="config-form-checkbox">
                <input
                  type="checkbox"
                  checked={netAllowLocalBinding}
                  onChange={(e) => setNetAllowLocalBinding(e.target.checked)}
                />
                Allow local binding
              </label>

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
