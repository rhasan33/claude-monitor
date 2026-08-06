import { useMemo, useState } from 'react'
import type { PricingOverride } from '../../../shared/types'
import { useApp } from '../state/store'

interface RateInputs {
  input: string
  output: string
}

function initialRates(modelIds: string[], overrides: PricingOverride[]): Record<string, RateInputs> {
  const byModel = new Map(overrides.map((o) => [o.modelId, o]))
  const rates: Record<string, RateInputs> = {}
  for (const modelId of modelIds) {
    const existing = byModel.get(modelId)
    rates[modelId] = { input: existing ? String(existing.inputPerMtok) : '', output: existing ? String(existing.outputPerMtok) : '' }
  }
  return rates
}

export function PricingSettings() {
  const { state, setPricingOverrides } = useApp()
  const modelIds = useMemo(
    () => (state.overview?.byModel ?? []).map((m) => m.model).sort(),
    [state.overview]
  )
  const [rates, setRates] = useState<Record<string, RateInputs>>(() => initialRates(modelIds, state.pricingOverrides))
  const [saving, setSaving] = useState(false)

  // Re-seed if the set of models we've seen changes (e.g. after a refresh
  // surfaces a new model) — but don't clobber in-progress edits otherwise.
  const modelKey = modelIds.join(',')
  const [seededFor, setSeededFor] = useState(modelKey)
  if (modelKey !== seededFor) {
    setRates(initialRates(modelIds, state.pricingOverrides))
    setSeededFor(modelKey)
  }

  const updateRate = (modelId: string, field: keyof RateInputs, value: string): void => {
    setRates((prev) => ({ ...prev, [modelId]: { ...prev[modelId], [field]: value } }))
  }

  const handleSave = async (): Promise<void> => {
    const overrides: PricingOverride[] = []
    for (const modelId of modelIds) {
      const { input, output } = rates[modelId] ?? { input: '', output: '' }
      const inputPerMtok = Number(input)
      const outputPerMtok = Number(output)
      if (input.trim() && output.trim() && Number.isFinite(inputPerMtok) && Number.isFinite(outputPerMtok) && inputPerMtok > 0 && outputPerMtok > 0) {
        overrides.push({ modelId, inputPerMtok, outputPerMtok })
      }
    }
    setSaving(true)
    try {
      await setPricingOverrides(overrides)
    } finally {
      setSaving(false)
    }
  }

  if (modelIds.length === 0) {
    return null
  }

  return (
    <div className="panel">
      <h2>Pricing overrides</h2>
      <p className="text-muted pricing-hint">
        Leave a rate blank to use the built-in table. Overriding corrects a stale or missing rate without a code
        change — see <code>src/main/lib/pricing.ts</code> for the built-in values.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Input $/Mtok</th>
              <th>Output $/Mtok</th>
            </tr>
          </thead>
          <tbody>
            {modelIds.map((modelId) => (
              <tr key={modelId}>
                <td>{modelId}</td>
                <td>
                  <input
                    id={`pricing-input-${modelId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="built-in"
                    value={rates[modelId]?.input ?? ''}
                    onChange={(e) => updateRate(modelId, 'input', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    id={`pricing-output-${modelId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="built-in"
                    value={rates[modelId]?.output ?? ''}
                    onChange={(e) => updateRate(modelId, 'output', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="refresh-button pricing-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save pricing overrides'}
      </button>
    </div>
  )
}
