import { useState } from 'react'
import type { McpServerConfig, McpTransport } from '../../../../shared/types'
import { useClaudeConfig } from '../../state/claudeConfigStore'
import { ConfirmDialog } from '../ConfirmDialog'

interface ServerFormState {
  name: string
  transport: McpTransport
  command: string
  args: string
  url: string
}

const EMPTY_FORM: ServerFormState = { name: '', transport: 'stdio', command: '', args: '', url: '' }

function formToServer(form: ServerFormState): McpServerConfig {
  if (form.transport === 'stdio') {
    return {
      name: form.name,
      transport: 'stdio',
      command: form.command,
      args: form.args.trim() ? form.args.trim().split(/\s+/) : undefined
    }
  }
  return { name: form.name, transport: form.transport, url: form.url }
}

export function McpServersPanel() {
  const { state, saveMcpServers } = useClaudeConfig()
  const [form, setForm] = useState<ServerFormState | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAdd = async (): Promise<void> => {
    if (!form || !form.name.trim()) return
    setSaving(true)
    try {
      await saveMcpServers([...state.mcpServers.filter((s) => s.name !== form.name), formToServer(form)])
      setForm(null)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (name: string): Promise<void> => {
    await saveMcpServers(state.mcpServers.filter((s) => s.name !== name))
    setRemoving(null)
  }

  return (
    <div className="panel">
      <h2>MCP servers</h2>
      {state.loading ? (
        <p className="text-muted">Loading…</p>
      ) : state.error ? (
        <p className="text-muted">Couldn&rsquo;t load MCP servers: {state.error}</p>
      ) : state.mcpServers.length === 0 ? (
        <p className="text-muted">No MCP servers configured in this scope yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Transport</th>
                <th>Command / URL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.mcpServers.map((server) => (
                <tr key={server.name}>
                  <td>{server.name}</td>
                  <td>{server.transport}</td>
                  <td>{server.transport === 'stdio' ? [server.command, ...(server.args ?? [])].join(' ') : server.url}</td>
                  <td>
                    <button className="refresh-button confirm-dialog-danger" onClick={() => setRemoving(server.name)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form ? (
        <div className="config-form">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Transport
            <select
              value={form.transport}
              onChange={(e) => setForm({ ...form, transport: e.target.value as McpTransport })}
            >
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </select>
          </label>
          {form.transport === 'stdio' ? (
            <>
              <label>
                Command
                <input value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} />
              </label>
              <label>
                Args (space-separated)
                <input value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} />
              </label>
            </>
          ) : (
            <label>
              URL
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </label>
          )}
          <div className="config-form-actions">
            <button className="refresh-button" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button className="refresh-button" onClick={handleAdd} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : 'Save server'}
            </button>
          </div>
        </div>
      ) : (
        <button className="refresh-button" onClick={() => setForm(EMPTY_FORM)}>
          Add server
        </button>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove MCP server"
          message={`This removes "${removing}" from the config file on disk.`}
          confirmLabel="Remove"
          onConfirm={() => handleRemove(removing)}
          onCancel={() => setRemoving(null)}
        />
      )}
    </div>
  )
}
