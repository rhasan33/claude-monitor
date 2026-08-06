import { app, Menu, nativeImage, Tray } from 'electron'
import { join } from 'path'
import type { AggregatedOverview } from '../../shared/types'

// Deliberately not importing the renderer's formatUsd — main shouldn't
// depend on renderer code across the process boundary (see CLAUDE.md).
function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function todayCostUsd(overview: AggregatedOverview): number {
  const todayKey = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD', local time
  return overview.daily.find((d) => d.date === todayKey)?.costUsd ?? 0
}

export interface TrayHooks {
  getOverview: () => AggregatedOverview
  refresh: () => Promise<void>
  showWindow: () => void
}

/** Creates the menu-bar icon. macOS only — this app doesn't ship a Windows/Linux tray. */
export function createTray(hooks: TrayHooks): Tray {
  // Packaged: build/icon.png is copied to Resources/icon.png via extraResources
  // (the `files` allowlist in electron-builder.yml excludes build/ otherwise).
  // Dev: __dirname is <repo>/out/main, so build/ is two levels up.
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  icon.setTemplateImage(true)

  const tray = new Tray(icon)
  tray.setToolTip('Claude Monitor')

  const refreshNow = async (): Promise<void> => {
    await hooks.refresh()
    updateTitle()
  }

  const updateTitle = (): void => {
    tray.setTitle(formatUsd(todayCostUsd(hooks.getOverview())))
  }

  const menu = Menu.buildFromTemplate([
    { label: 'Show Claude Monitor', click: () => hooks.showWindow() },
    { label: 'Refresh now', click: () => void refreshNow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => hooks.showWindow())

  updateTitle()

  return tray
}
