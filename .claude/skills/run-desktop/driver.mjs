// REPL driver for Claude Monitor (Electron). Wraps Playwright's Electron
// launcher so an agent can drive the app by sending lines of text over
// stdin. This app only ships macOS builds, so no xvfb is needed here —
// just a real (or CI) display.
// Designed for agents: wrap in tmux, send-keys commands, capture-pane output.
import { _electron as electron } from 'playwright-core'
import * as readline from 'node:readline'
import * as fs from 'node:fs'
import * as path from 'node:path'

const APP_DIR = path.resolve(import.meta.dirname, '../../..')
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/shots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

let app = null
let page = null

const electronBin = path.join(
  APP_DIR,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
)

const COMMANDS = {
  async launch() {
    if (app) return console.log('already launched')
    if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
      console.log('ERROR: out/main/index.js missing — run `npm run build` first')
      return
    }
    app = await electron.launch({
      executablePath: electronBin,
      args: [APP_DIR],
      // If ELECTRON_RUN_AS_NODE=1 leaks in from the parent shell (common in
      // agent sandboxes), Electron runs as plain Node — `electron.app` is
      // then undefined and main/index.ts crashes on `.whenReady()`. Force
      // it off regardless of what the parent process set.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
      timeout: 30_000
    })
    // main/index.ts shows the window on 'ready-to-show', so wait for the
    // real content window rather than a fixed sleep.
    page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    console.log('launched.', app.windows().length, 'window(s):')
    for (const w of app.windows()) console.log(' ', w.url())
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first')
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png')
    await page.screenshot({ path: f })
    console.log('screenshot:', f)
  },

  async click(sel) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK'
    }, sel)
    console.log('click', sel, '→', r)
  },

  async 'click-text'(text) {
    if (!page) return console.log('ERROR: launch first')
    const r = await page.evaluate((t) => {
      const els = [...document.querySelectorAll('button, a, [role="button"]')]
      const el = els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t))
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK: ' + el.tagName
    }, text)
    console.log('click-text', JSON.stringify(text), '→', r)
  },

  async type(text) {
    if (page) await page.keyboard.type(text, { delay: 30 })
  },

  // For React-controlled inputs: a DOM click() doesn't always leave the
  // element with real browser focus, so a follow-up keyboard.type() can
  // land nowhere. This explicitly focuses (and selects existing text, so
  // typing replaces rather than appends) via evaluate, then types with
  // real synthetic key events — which is what React's onChange listens
  // for, unlike a scripted .value assignment.
  async fill(argLine) {
    if (!page) return console.log('ERROR: launch first')
    const [sel, ...rest] = argLine.split(' ')
    const text = rest.join(' ')
    const found = await page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.focus()
      el.select?.()
      return true
    }, sel)
    if (!found) return console.log('fill', sel, '→ NOT_FOUND')
    await page.keyboard.type(text, { delay: 30 })
    console.log('fill', sel, JSON.stringify(text), '→ OK')
  },
  async press(key) {
    if (page) await page.keyboard.press(key)
  },

  async wait(sel) {
    if (!page) return console.log('ERROR: launch first')
    try {
      await page.waitForSelector(sel, { timeout: 10_000 })
      console.log('found:', sel)
    } catch {
      console.log('TIMEOUT:', sel)
    }
  },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first')
    try {
      console.log(JSON.stringify(await page.evaluate(expr)))
    } catch (e) {
      console.log('ERROR:', e.message)
    }
  },

  async text(sel) {
    if (!page) return console.log('ERROR: launch first')
    console.log(
      await page.evaluate((s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null)
    )
  },

  async windows() {
    if (!app) return console.log('ERROR: launch first')
    for (const w of app.windows()) console.log(' ', w.url())
  },

  async quit() {
    if (app) await app.close().catch(() => {})
    app = null
    page = null
  },
  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '))
  }
}

// Stop Electron from stealing stdin — use the raw fd.
const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') })
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' })

rl.on('line', async (line) => {
  const [cmd, ...rest] = line.trim().split(/\s+/)
  if (!cmd) return rl.prompt()
  const fn = COMMANDS[cmd]
  if (!fn) {
    console.log('unknown:', cmd, '— try: help')
    return rl.prompt()
  }
  try {
    await fn(rest.join(' '))
  } catch (e) {
    console.log('ERROR:', e.message)
  }
  if (cmd === 'quit') {
    rl.close()
    process.exit(0)
  }
  rl.prompt()
})
rl.on('close', async () => {
  await COMMANDS.quit()
  process.exit(0)
})

console.log('claude-monitor driver — "help" for commands, "launch" to start')
rl.prompt()
