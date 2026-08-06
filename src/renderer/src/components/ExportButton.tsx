import { useState } from 'react'
import type { ExportFormat, OverviewParams } from '../../../shared/types'
import { useApp } from '../state/store'

export function ExportButton() {
  const { state } = useApp()
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat): Promise<void> => {
    setBusyFormat(format)
    try {
      await window.api.exportOverview({ format, params: state.filters as OverviewParams })
    } finally {
      setBusyFormat(null)
    }
  }

  const disabled = busyFormat !== null || state.loading

  return (
    <div className="export-buttons">
      <button className="refresh-button" onClick={() => handleExport('csv')} disabled={disabled}>
        {busyFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>
      <button className="refresh-button" onClick={() => handleExport('json')} disabled={disabled}>
        {busyFormat === 'json' ? 'Exporting…' : 'Export JSON'}
      </button>
    </div>
  )
}
