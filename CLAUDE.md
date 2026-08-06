# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Claude Monitor is an Electron + TypeScript + React desktop app that gives a local dashboard (token usage, cost, cache efficiency, per-project/per-model breakdowns) computed entirely from Claude Code's local session logs on disk. No network calls, nothing uploaded.

## Commands

```sh
npm run dev         # launch in development mode (hot reload)
npm run build        # typecheck + production build
npm run typecheck    # tsc --noEmit for main/preload (tsconfig.node.json) and renderer (tsconfig.web.json)
npm test             # run unit tests (node --test, see below)
npm run lint          # eslint .
npm run package       # electron-vite build + electron-builder --mac -> release/
```

Run a single test file:

```sh
node --import tsx --test src/main/lib/pricing.test.ts
```

CI runs `lint`, `typecheck`, and `test` on every push/PR — all three must pass before opening a PR (see CONTRIBUTING.md).

Tests live alongside the code they test (`*.test.ts`), currently only under `src/main/**`.

### Lint/typecheck note

ESLint uses Babel's parser, not `typescript-eslint`, because `typescript-eslint` doesn't yet support the TypeScript 7 native compiler this repo runs on. This means ESLint has no type information: `no-unused-vars`/`no-undef` are disabled for `.ts`/`.tsx` since they misfire once Babel strips type-only syntax. `tsc` (via `noUnusedLocals`/`noUnusedParameters` in the tsconfigs) is what actually catches unused imports/variables — `npm run typecheck` is not optional even though lint passes.

### Makefile

A `Makefile` wraps npm scripts for the packaged macOS app: `make open` (build if needed + launch), `make install-app` (copy to /Applications), `make dmg` (build installer). Run `make` with no args for the full list. `DMG_PATH` derives its version from `package.json` at run time, so it stays correct across version bumps without editing the Makefile.

### Releases

Releases are published as GitHub Releases tagged `vX.Y.Z` (e.g. [v0.1.0](https://github.com/rhasan33/claude-monitor/releases/tag/v0.1.0), the first packaged build). Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`, which runs the same lint/typecheck/test gate as CI, then `npm run package` and attaches the resulting `.dmg` (`release/*.dmg`) to the release via `softprops/action-gh-release`. `electron-builder.yml` builds both an unpacked `dir` target and the `dmg` target for `arm64` — every tagged release should have a `.dmg` asset; if one is missing, check the `Release` workflow run for that tag.

## Architecture

Three Electron processes, connected by a narrow typed IPC boundary:

- **Main** (`src/main/`) — reads Claude Code's local data, aggregates it, serves it over IPC.
- **Preload** (`src/preload/index.ts`) — exposes a typed `window.api` via `contextBridge`; contextIsolation is enforced (throws if not isolated). This is the only surface the renderer touches.
- **Renderer** (`src/renderer/src/`) — React dashboard UI.

`src/shared/types.ts` is the contract all three processes import from: `UsageSourceEvent` (the source-agnostic normalized event shape), `AggregatedOverview` and friends (aggregation output), and `IPC_CHANNELS` (the channel name registry — add new channels here, wire in `main/ipc/handlers.ts`, expose in `preload/index.ts`).

### Data flow

1. `src/main/sources/claude-code-local/` reads `~/.claude/projects/**/*.jsonl` (session transcripts) and parses each line (`parseJsonlLine.ts`) into `UsageSourceEvent`s.
2. `src/main/ipc/handlers.ts` holds the last full scan in memory (`cachedEvents`) for the process lifetime — there's no background job or persistence; a client-triggered `refresh()` (IPC `usage:refresh`) re-scans from disk.
3. `src/main/lib/aggregator.ts` turns raw events into `AggregatedOverview` (daily/model/project rollups, cache efficiency, tool usage), applying `OverviewParams` filters (date range, project, model).
4. `src/main/lib/pricing.ts` is the versioned cost table — Claude Code's logs don't record cost, so `costUsd` everywhere is derived from tokens × this table. This is the file most likely to need updates as Anthropic's published rates change.
5. `src/main/lib/claudeJson.ts` reads `~/.claude.json` for profile/account info; `src/main/lib/historyReader.ts` reads `~/.claude/history.jsonl` for the recent-activity feed. Paths are centralized in `src/main/lib/paths.ts`.
6. Renderer calls `window.api.*` (defined in `src/preload/index.ts`), state lives in `src/renderer/src/state/store.tsx`, rendered by components in `src/renderer/src/components/`.

### Pluggable usage sources

`src/main/sources/types.ts` defines the `UsageSource` interface (`discover()` + `read()`) that `claude-code-local` implements. The aggregator, IPC handlers, and UI depend only on the source-agnostic `UsageSourceEvent`/`shared/types.ts` shapes — adding a second source (e.g. the Anthropic Admin API) means adding one new folder under `src/main/sources/` following the `claude-code-local` pattern, not reworking aggregation or UI.

### Dashboard components

`src/renderer/src/components/` — chart components (`TokenUsageChart`, `ModelBreakdownChart`, `ToolUsageChart`, etc.) follow fixed categorical color order and stable per-series colors, documented inline in each component; check those rules before adding a new chart. Shared chart color logic lives in `src/renderer/src/lib/colors.ts`.

## Commit style

- Atomic commits: an implementation change and its tests land together, never split into separate "add feature" / "add tests" commits.
- Commit message: short title + one sentence on *why*, not a line-by-line changelog.
