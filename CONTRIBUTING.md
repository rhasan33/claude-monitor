# Contributing

Thanks for taking a look at Claude Monitor. This is a small personal tool, so the bar for contributing is intentionally light.

## Setup

```sh
npm install
npm run dev
```

## Before opening a PR

Both must pass:

```sh
npm test
npm run typecheck
```

## Commit style

- Atomic commits: an implementation change and its tests land together — never split into "add feature" followed by a separate "add tests" commit.
- Commit message: a short title plus one sentence explaining *why*, not a line-by-line changelog.

## Where things live

- **Adding a new usage data source** (e.g. the Anthropic Admin API, or your own instrumented API calls): implement the `UsageSource` interface in `src/main/sources/types.ts` and add a new folder under `src/main/sources/`, following the pattern in `src/main/sources/claude-code-local/`. The aggregator and UI only depend on the source-agnostic `UsageSourceEvent` shape, so a new source shouldn't require touching either.
- **Pricing corrections**: `src/main/lib/pricing.ts` is the one file cost numbers come from — Claude Code's logs don't record cost, so it's derived from tokens × this table. This is the thing most likely to need updates as Anthropic's published rates change.
- **Dashboard components**: `src/renderer/src/components/`. If you're adding a chart, note the color/legend rules documented inline in the existing chart components (fixed categorical color order, stable per-series colors) before introducing a new one.
