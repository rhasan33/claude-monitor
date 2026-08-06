# Claude Monitor

A desktop app that gives you a 360° view of how you use [Claude Code](https://claude.com/claude-code): token usage, cost, prompt-cache efficiency, and per-project/per-model breakdowns — all computed locally from the session logs already on your machine. Nothing is uploaded anywhere.

Built with Electron, TypeScript, and React.

## Status

Under active development. Current state:

- [x] Project scaffold (Electron + Vite + React + TypeScript)
- [x] Pluggable usage-source abstraction (`src/main/sources`)
- [x] Claude Code local-log parser (`src/main/sources/claude-code-local`)
- [x] Cost calculation from a versioned model-pricing table
- [x] Usage aggregation (daily/model/project rollups, cache efficiency)
- [ ] IPC bridge between the main process and the renderer
- [ ] Dashboard UI
- [ ] Packaged build

## Requirements

- Node.js 20+ (LTS recommended)
- macOS, Windows, or Linux with Claude Code already used at least once (the app reads `~/.claude/`)

## Install

```sh
npm install
```

## Run in development

```sh
npm run dev
```

## Other scripts

| Command | What it does |
|---|---|
| `npm run dev` | Launch the app in development mode (hot reload) |
| `npm run build` | Type-check and build the app for production |
| `npm run typecheck` | Type-check the main, preload, and renderer processes |
| `npm test` | Run the unit test suite |

## How it works

The app reads directly from Claude Code's local data directory — no network calls, no account required beyond what Claude Code itself already stores:

- `~/.claude/projects/**/*.jsonl` — per-session transcripts, the source of all token/model/tool-usage data.
- `~/.claude.json` — account/profile info and Claude Code's own last-session summaries (used as a sanity check, not the source of truth for history).
- `~/.claude/history.jsonl` — recent command history, feeds the activity view.

See `src/main/sources/types.ts` for the `UsageSource` interface — the data model is designed so a future source (e.g. the Anthropic Admin API, or your own instrumented API usage) can be added without reworking aggregation or the UI.

Cost estimates are derived from a versioned pricing table (`src/main/lib/pricing.ts`) rather than a field in the logs (Claude Code doesn't record cost per message). Anthropic's published rates change over time, so double-check the table against Anthropic's current pricing page before trusting a cost number.
