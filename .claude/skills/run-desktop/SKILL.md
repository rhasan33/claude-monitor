---
name: run-desktop
description: Build, run, and drive the Claude Monitor Electron desktop app. Use when asked to start the desktop app, take a screenshot of it, build it, or interact with its UI.
---

Claude Monitor is an Electron desktop app. For agent/automated use, drive it via the Playwright REPL at `.claude/skills/run-desktop/driver.mjs`. This app only ships macOS builds, so there's no xvfb step — a real (or CI macOS) display is enough.

All paths below are relative to the repo root.

## Prerequisites

```bash
npm install
npm install --save-dev playwright-core   # already in devDependencies once added once
```

## Build

```bash
npm run build   # produces out/main/index.js, out/preload/index.js, out/renderer/index.html
```

The driver's `launch` command checks for `out/main/index.js` and tells you to build first if it's missing.

## Run (agent path)

```bash
node .claude/skills/run-desktop/driver.mjs
```

Drive it by sending one line at a time (a burst of piped lines races ahead of `launch` before the app is up — space commands out, e.g. via a FIFO with real delays, or tmux `send-keys` with a poll on the previous command's output):

```bash
mkfifo /tmp/driver-in
node .claude/skills/run-desktop/driver.mjs < /tmp/driver-in > /tmp/driver-out.log 2>&1 &
exec 3>/tmp/driver-in
echo 'launch' >&3          # wait for "launched." in /tmp/driver-out.log before sending more
echo 'ss landing' >&3
echo 'quit' >&3
exec 3>&-
```

Screenshots land in `/tmp/shots/` (override with `SCREENSHOT_DIR`).

### Commands

| command | what it does |
|---|---|
| `launch` | launch the app, wait for the main window |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `click <css-sel>` | click element (via DOM, not coordinates) |
| `click-text <text>` | click button/link containing text |
| `type <text>` / `press <key>` | keyboard input at whatever has real focus |
| `fill <css-sel> <text>` | set a React-controlled input's value via the native setter + `input` event (use this instead of `click`+`type` for form fields) |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` | evaluate in the page, print JSON |
| `text [css-sel]` | print innerText |
| `windows` | list all windows (there's normally exactly one) |
| `quit` | close app, exit |

## Run (human path)

```bash
npm run dev   # opens a real window with hot reload
```

## Gotchas

- **`ELECTRON_RUN_AS_NODE=1` in the parent shell breaks the launch.** When set, Electron runs as plain Node instead of the Electron runtime, `require('electron').app` is `undefined`, and `src/main/index.ts` crashes on `app.whenReady()`. This var is common in agent/CI sandboxes. The driver's `launch` command force-unsets it in the child process env regardless of the parent shell — if you launch Electron any other way, unset it first (`unset ELECTRON_RUN_AS_NODE`).
- **The Electron binary may not have been downloaded by `npm install`** if the postinstall download was interrupted (e.g. `node_modules/electron/dist/` only has a `path.txt`, not `Electron.app`). Fix: `node node_modules/electron/install.js`.
- **Freshly downloaded Electron.app may be quarantined by Gatekeeper** on macOS. If launch fails silently or hangs, run `xattr -cr node_modules/electron/dist/Electron.app`.
- There is exactly one window — `firstWindow()` is always the real UI (`out/renderer/index.html`), no splash screen or BrowserView layering to worry about.

## Troubleshooting

- **Launch timeout (30s):** build output missing → run `npm run build` first.
- **`spawn ... ENOENT`:** Electron binary missing → see Gotchas above.
- **App renders but shows the empty state:** this machine has no `~/.claude/` usage data to read — that's expected on a fresh machine, not a bug.
