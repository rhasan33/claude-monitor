import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/types'
import { registerIpcHandlers, refresh, getCurrentOverview } from './ipc/handlers'
import { watchProjectsDir } from './lib/watcher'
import { createTray } from './lib/tray'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/** Focuses the existing window, or creates one if the user closed it all the way (e.g. via the tray on a fresh launch). */
function showOrCreateWindow(): void {
  const [existing] = BrowserWindow.getAllWindows()
  if (existing) {
    existing.show()
    existing.focus()
  } else {
    createWindow()
  }
}

async function refreshAndNotify(): Promise<void> {
  await refresh()
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC_CHANNELS.dataChanged)
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  createTray({
    getOverview: getCurrentOverview,
    refresh: refreshAndNotify,
    showWindow: showOrCreateWindow
  })

  watchProjectsDir(() => void refreshAndNotify())

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
