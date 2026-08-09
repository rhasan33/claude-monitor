---
name: phased-plan
description: Use when finalizing an implementation plan for this project (claude-monitor) — ensures the plan is broken into independently-committable phases, each with a suggested commit message, before calling ExitPlanMode.
---

# Phased implementation plans for claude-monitor

When writing the final plan for a non-trivial implementation task in this repo (Phase 4 of the planning workflow, right before ExitPlanMode), always include a **"Phases & commits"** section. Two plans in this repo already ended up needing this added as an afterthought — bake it in from the start instead.

The section must:

1. **Break the implementation into independently mergeable slices.** Each slice should typecheck, lint, and pass tests on its own — a slice that only adds inert scaffolding (a new type, an unused helper) is fine; a slice that leaves the app in a broken state is not.
2. **Give each slice a suggested commit message** in this repo's style — see CLAUDE.md's "Commit style" section for the authoritative rules (atomic commits pairing an implementation change with its tests; short title + one sentence on *why*, not a line-by-line changelog). Don't restate those rules here — read CLAUDE.md at plan-writing time so this skill can't drift out of sync with it.
3. **State the ordering rationale** — why this slice lands before that one. Usual reasons in this codebase: backend before UI (UI depends on the IPC surface existing), lower-risk before higher-risk (e.g. an isolated new directory before a shared-file partial-merge writer), or foundational types/helpers before their consumers.

Keep the section scannable: one short paragraph or bullet list per phase, not a restatement of the whole plan.
