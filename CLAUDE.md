# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is an early-stage scaffold, not a working application yet. Every source file under `phase-1-agentic-architecture/src/` and the docs (`README.md`, `docs/ADR-001-agent-vs-workflow.md`) are currently empty placeholders. There is no build, lint, or test tooling wired up yet — treat any task here as "build this from scratch" rather than "extend existing behavior," and check whether a file is still empty before assuming its contents.

## Repo structure

- pnpm workspace (`pnpm-workspace.yaml`) with packages matched by `phase-*` — each phase of the project lives in its own top-level `phase-N-*` package.
- `phase-1-agentic-architecture/` — the only phase package so far. Intended (per its dependencies) to build an agentic loop on the `@anthropic-ai/sdk`:
  - `src/coordinator.ts` — (empty) top-level orchestration.
  - `src/loop.ts` — (empty) the agent loop.
  - `src/types.ts` — (empty) shared types.
  - `src/hooks/policyGate.ts`, `src/hooks/postToolUse.ts` — (empty) hook points, presumably pre/post tool-call policy enforcement.
  - `src/subagents/researcher.ts`, `src/subagents/validator.ts` — (empty) subagent role implementations.
  - `docs/ADR-001-agent-vs-workflow.md` — (empty) ADR intended to record the agent-vs-workflow architecture decision — fill this in as that decision gets made.

## Commands

- Install deps: `pnpm install` (run from repo root; pnpm workspace covers all `phase-*` packages).
- Type-check phase 1: `cd phase-1-agentic-architecture && npx tsc --noEmit`.
- Run a file directly with tsx (declared as a devDependency, no npm script defined yet): `cd phase-1-agentic-architecture && npx tsx src/<file>.ts`.
- The root `package.json` defines no scripts. `phase-1-agentic-architecture/package.json`'s `test` script is the npm-init default (`echo "Error: no test specified" && exit 1`) — no real test suite exists yet.

## Known gotcha: `pnpm install` fails out of the box

`pnpm-workspace.yaml` has a literal placeholder instead of a real value:

```yaml
allowBuilds:
  esbuild: set this to true or false
```

This is invalid (not a boolean), so `pnpm install` currently fails with `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.2`. Fix by setting `esbuild: true` (or `false`) in `pnpm-workspace.yaml`, or by running `pnpm approve-builds`, before relying on a fresh install.

## TypeScript config notes (`phase-1-agentic-architecture/tsconfig.json`)

- `module`/`target`: `nodenext` / `esnext`; package is ESM (`"type": "module"` in package.json).
- Strict mode plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are enabled — write code that satisfies these (no implicit `any` from indexed access, no assigning `undefined` to optional properties without declaring it).
- `verbatimModuleSyntax` and `isolatedModules` are on — use explicit `import type` / `export type` for type-only imports/exports.

## Purpose

This repo is CCAR-F (Claude Certified Architect – Foundations) exam prep —
not a production app. Priority is exam-correctness and understanding, not
shipping speed.

## Working style

- Don't fully solve a task in one shot when the point is to learn the
  mechanic (e.g. stop_reason branching). Scope responses to what was asked.
- If a shortcut works but isn't what the exam blueprint tests (e.g. relying
  on context inheritance instead of explicit passing to subagents), flag
  the shortcut explicitly rather than silently taking it.
- Strict TypeScript always, no `any`.
- Each phase-N-*/ folder is self-contained (own package.json, own deps via
  pnpm workspace) — don't import across phases.

## Domains (reference)

Phase 1: Agentic Architecture & Orchestration (27%)
Phase 2: MCP/Tool Design (18%)
Phase 3: Prompt Engineering & Structured Output (20%)
Phase 4: Claude Code Config (20%) + Context Management (15%)
