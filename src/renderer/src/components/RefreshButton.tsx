import { useState } from 'react'
import { useApp } from '../state/store'

export function RefreshButton() {
  const { refresh, state } = useApp()
  const [busy, setBusy] = useState(false)

  const handleClick = async (): Promise<void> => {
    setBusy(true)
    try {
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || state.loading

  return (
    <button className="refresh-button" onClick={handleClick} disabled={disabled}>
      {disabled ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
