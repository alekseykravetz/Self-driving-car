# Harness: Atomic Design + Design System Sync

**Date:** 2026-07-20
**Slug:** harness-atomic-design-sync
**Entry points affected:** none — harness/config/docs only (no `ts/` application code)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

The `atomic-design` branch moved the codebase to Atomic Design (CSS hierarchy under `styles/` + design tokens in `styles/tokens.css` + TS component hierarchy under `ts/ui/`). Commit `fe2a78c` already updated `AGENTS.md`, `docs/Architecture.md`, and added `docs/DesignSystem.md`. But the **harness itself** (agent MDs, skills, graphify integration, commands, gitignore) still has gaps. This plan closes those gaps and resolves three open questions: (1) dedupe `DESIGN.md` vs `docs/DesignSystem.md`, (2) clean up root-file git tracking, (3) wire `graphify update` into the task lifecycle.

No `ts/` application code is touched. This is a harness/docs/config change only.

## Context (read first)

- `/Users/alex/Code/Self-driving-car/AGENTS.md` — already has the "UI Architecture — Atomic Design" section (CSS + TS hierarchy). Do NOT duplicate; reference it.
- `/Users/alex/Code/Self-driving-car/.opencode/opencode.json` — harness config: agents, mcp, plugins, commands, skills paths.
- `/Users/alex/Code/Self-driving-car/.opencode/agents/planner.md` — planner agent spec (missing atomic-design/design-system awareness).
- `/Users/alex/Code/Self-driving-car/.opencode/agents/architect.md` — already mentions Atomic Design in description + §2. Mostly fine; minor token-awareness addition.
- `/Users/alex/Code/Self-driving-car/.opencode/agents/reviewer.md` — already checks `npx prettier --check ts/ html/ styles/` (line 55). Missing: atomic-design convention checks (token usage, no raw hex/px).
- `/Users/alex/Code/Self-driving-car/.opencode/skills/task-planning/SKILL.md` — full task lifecycle. Missing: graphify-update step.
- `/Users/alex/Code/Self-driving-car/.opencode/skills/docs-sync/SKILL.md` — doc-update protocol. Missing: `styles/` → `docs/DesignSystem.md` row in the touched-surfaces table; `docs/DesignSystem.md` not in the "Existing docs" list.
- `/Users/alex/Code/Self-driving-car/.opencode/skills/code-to-pen/SKILL.md` — references old `styles/style.css` path (line 37) and a stale token list (lines 51-78). Must point at `styles/tokens.css` + atomic-design structure.
- `/Users/alex/Code/Self-driving-car/.opencode/plugins/graphify.js` — graphify reminder plugin. No change needed.
- `/Users/alex/Code/Self-driving-car/.opencode/commands/` — `test.md`, `fix.md`, `start.md`. Adding `graphify.md` here.
- `/Users/alex/Code/Self-driving-car/DESIGN.md` (424 lines, root) — high-level design brief + DUPLICATED token tables (§2 Color Palette, §3 Typography, §4 Component Stylings overlap with `docs/DesignSystem.md`).
- `/Users/alex/Code/Self-driving-car/docs/DesignSystem.md` (279 lines) — token + CSS architecture reference (the canonical token tables).
- `/Users/alex/Code/Self-driving-car/.gitignore` — currently ignores `node_modules/`, `saves/*.world`, `tests/**/*.js`, `vitest.config.js`, `.herenow/`, `store/world/_v1_backup/`, `graphify-out/`, `coverage/`, `test-results/`, `playwright-report/`. Missing: `.DS_Store`, `.playwright-mcp/`.
- `/Users/alex/Code/Self-driving-car/vitest.config.js` — 6-line stale compiled artifact (gitignored, NOT tracked). `vitest.config.ts` is the source of truth. The `.js` should be deleted from the working tree to avoid confusion.
- `/Users/alex/Code/Self-driving-car/.graphifyignore` — contains `js/`. No change.

## Scope

- **In scope:**
  - Update `planner.md`, `reviewer.md`, `architect.md` to know about Atomic Design + design tokens + `styles/` structure.
  - Update `docs-sync` skill: add `styles/` → `docs/DesignSystem.md` row; add `docs/DesignSystem.md` to the existing-docs list.
  - Update `code-to-pen` skill: fix `styles/style.css` → `styles/tokens.css` + atomic-design structure; refresh the token-extraction guidance.
  - Update `task-planning` skill: add a graphify-update step after reviewer PASS (before docs sync) + add a `/graphify` command.
  - Add `.opencode/commands/graphify.md` + register the command in `opencode.json`.
  - Dedupe `DESIGN.md` (root): trim the duplicated token tables (§2 color/token lists, §3 typography token table, §4 component styling specs that duplicate `docs/DesignSystem.md`); keep the design-brief/atmosphere prose; add a cross-link to `docs/DesignSystem.md` for the canonical token reference.
  - `.gitignore`: add `.DS_Store` and `.playwright-mcp/`.
  - Delete `vitest.config.js` (stale, gitignored, untracked — just remove from working tree).
  - Update `AGENTS.md`: add a "Harness" subsection documenting the agent/skill/MCP/graphify layout so future agents know the harness structure; add graphify-update to the task lifecycle note.
- **Out of scope:**
  - Any `ts/` application code changes.
  - Untracking `js/`, `session-ses_0be3.md`, or `app.pen` (user chose to keep everything tracked).
  - Changing the graphify plugin itself.
  - Renaming `DESIGN.md` or `docs/DesignSystem.md` (keep both, dedupe roles).

## Implementation

### `.opencode/agents/planner.md`

- In the "Repo facts (do not re-derive)" section, add a bullet:
  `Design system: styles/ uses Atomic Design (tokens.css + atoms/molecules/organisms/templates/pages); see AGENTS.md § UI Architecture. Design brief in DESIGN.md (root); canonical token reference in docs/DesignSystem.md.`
- In the "Decision rule" section, add a bullet:
  `Design-system / CSS / token change → run the full task-planning workflow; the docs-sync step must update docs/DesignSystem.md for any token or styles/ structural change.`

### `.opencode/agents/reviewer.md`

- In "Phase: code" step 3 (objective checks), the existing `npx prettier --check ts/ html/ styles/` line stays.
- Add a new step after step 6 ("Check no out-of-scope changes"):
  `7. **Check Atomic Design conventions** (only if the plan touches styles/ or ts/ui/): grep changed CSS files for raw hex (#xxx) or raw rgba() — flag any not using var(--color-*) / var(--space-*) / var(--text-*) / var(--radius-*) tokens. Grep for raw px in spacing/font/radius contexts. These violate AGENTS.md § UI Architecture.`

### `.opencode/agents/architect.md`

- In §2 "Structural & Folder Boundary Auditing", the existing Atomic Design bullet stays. Add after it:
  `- **Design tokens** — Verify all CSS uses var(--color-*) / var(--space-*) / var(--text-*) / var(--radius-*) from styles/tokens.css. Flag raw hex, rgba(), or px literals in styles/ (except inside tokens.css itself, which defines the values). The styles/ folder follows the same atoms→molecules→organisms→templates→pages hierarchy as ts/ui/.`

### `.opencode/skills/docs-sync/SKILL.md`

- In the "Existing docs (as of this writing)" code block, add `docs/DesignSystem.md` to the list (alphabetical: after docs/Controls.md).
- In the Step 1 touched-surfaces table, add a new row:
  `| styles/, tokens, CSS structure | docs/DesignSystem.md, DESIGN.md (root brief) |`
  Place it after the `ts/ui/` row.

### `.opencode/skills/code-to-pen/SKILL.md`

- Line 37: replace `Read the project's CSS files (usually styles/style.css).` with:
  `Read the project's CSS entry points: styles/tokens.css (design tokens — the single source of truth), styles/index.css (shared core), and the page entries styles/simulator.css, styles/landing.css, styles/race.css, styles/world.css. The styles/ folder follows Atomic Design: atoms/ → molecules/ → organisms/ → templates/ → pages/.`
- In Step 2's token-extraction guidance (lines 51-78), update the `SetVariables()` example to read token names from `styles/tokens.css` (e.g. `--color-bg-app`, `--color-text-primary`, `--space-2`, `--radius-lg`, `--text-base`) instead of the invented `bg-app`/`bg-panel` names. Add a note: `Token names in styles/tokens.css already follow the --color-*, --space-*, --text-*, --radius-* convention; map each to a Pencil variable by dropping the leading -- and the category prefix is optional.`

### `.opencode/skills/task-planning/SKILL.md`

- Insert a new step between Step 6 (Reviewer loop) and Step 7 (Docs sync), renumbering subsequent steps. New content:

  ```markdown
  ## Step 7 — Refresh the knowledge graph (planner does this)

  After the reviewer returns PASS on the code, run `graphify update .` from the project root to rebuild the `graphify-out/` knowledge graph with the new code. This MUST happen before docs sync (Step 8) because docs-sync may use `graphify query` to locate affected modules, and the architect/reviewer rely on a current graph.

  - If `graphify update .` fails (e.g. graphify CLI not installed), note it and continue — docs sync can still proceed by reading files directly. Do not block the task on a graph rebuild failure.
  - For docs-only or harness-only changes (no `ts/` edits), skip this step — the graph only tracks code.

  The manual ad-hoc refresh command is `/graphify` (see .opencode/commands/graphify.md).
  ```

- Renumber: old Step 7 (Docs sync) → Step 8, old Step 8 (Reviewer docs check) → Step 9, old Step 9 (Archive) → Step 10.
- Update the "Cost model summary" table: add a row `| Graph refresh | planner | glm-5.2 (smart) | Trivial command, but planner owns the lifecycle |` placed after the "Code review" row.

### `.opencode/commands/graphify.md` (new file)

```markdown
---
description: Rebuild the graphify knowledge graph from the current codebase
agent: build
---

Run `graphify update .` from the project root to rebuild the `graphify-out/` knowledge graph. This re-indexes all `ts/` source (per `.graphifyignore`). Use after code changes outside the task lifecycle, or when graphify query results look stale.
```

### `.opencode/opencode.json`

- In the `"command"` object, add a `"graphify"` entry after `"start"`:
  ```json
  "graphify": {
    "template": "Run `graphify update .` from the project root to rebuild the graphify-out/ knowledge graph. Report whether it succeeded.",
    "description": "Rebuild graphify knowledge graph",
    "agent": "build"
  }
  ```

### `DESIGN.md` (root) — dedupe

- Keep §1 "Visual Theme & Atmosphere" (prose design brief) — this is the high-level role.
- In §2 "Color Palette & Roles": keep the **role descriptions** (what each color means) but remove the inline hex/value duplication that `docs/DesignSystem.md` already tabulates. Replace the per-color value lists with a one-line pointer: `> Canonical token values: see docs/DesignSystem.md § Design Tokens. The roles below describe intent, not exact values.`
- In §3 "Typography Rules": keep the "Principles" subsection; replace the hierarchy table with a pointer to `docs/DesignSystem.md § Typography`.
- In §4 "Component Stylings": trim to role descriptions only (e.g. "Large primary button = green-tinted action"); remove exact px/rgba specs (they live in `docs/DesignSystem.md` + `styles/atoms/_button.css`). Add pointer line.
- Add a top-of-file callout after the H1: `> **Role of this document**: high-level design brief and atmosphere. For the canonical token reference (exact values, CSS custom properties, Atomic Design CSS architecture), see docs/DesignSystem.md.`
- Do NOT delete the file. Do NOT move it.

### `.gitignore`

- Add two lines (append after the existing `playwright-report/` line):
  ```
  .DS_Store
  .playwright-mcp/
  ```

### `vitest.config.js`

- Delete this file from the working tree. It is a stale tsc-compiled artifact of `vitest.config.ts`, already gitignored and untracked. `vitest.config.ts` is the source of truth (vitest loads it directly). Removing it eliminates the "two vitest configs" confusion.

### `AGENTS.md`

- Add a new subsection under "Architecture rules" (or a new top-level section "Harness" after the "Graphify" section) documenting the harness layout so all agents know it:

  ```markdown
  ## Harness layout (`.opencode/`)

  The agent harness lives in `.opencode/` and is part of this repo (tracked in git):

  - `opencode.json` — agent models, MCP servers (playwright), plugins (graphify), commands, skills paths.
  - `agents/` — `planner.md` (primary, glm-5.2), `build.md` (primary, deepseek-v4-flash-free), `reviewer.md` + `architect.md` (subagents).
  - `commands/` — slash commands: `/test`, `/fix`, `/start`, `/graphify`.
  - `skills/` — `task-planning` (full task lifecycle), `docs-sync` (doc-update protocol), `code-to-pen` (reverse-engineer code → .pen).
  - `plugins/graphify.js` — injects a graphify-reminder before the first bash call when `graphify-out/graph.json` exists.
  - MCP: `playwright` (local, via `npx -y @playwright/mcp`).

  The task lifecycle (task-planning skill) refreshes the graphify knowledge graph after the reviewer confirms code is complete and before docs sync. Run `/graphify` for ad-hoc refresh.
  ```

- In the "Key commands" table, add a row:
  `| graphify update .             | Rebuild graphify knowledge graph (also: /graphify) |`

## Brain / persistence considerations

None. No `ts/` code, no brain dims, no save schema, no localStorage.

## Acceptance criteria

- `planner.md`, `reviewer.md`, `architect.md` each mention Atomic Design / design tokens / `styles/` structure.
- `docs-sync` skill's touched-surfaces table has a `styles/` → `docs/DesignSystem.md` row and `docs/DesignSystem.md` appears in the existing-docs list.
- `code-to-pen` skill references `styles/tokens.css` (not `styles/style.css`) and the atomic-design folder structure.
- `task-planning` skill has a graphify-update step between the reviewer loop and docs sync; subsequent steps are renumbered; cost-model table has a graph-refresh row.
- `.opencode/commands/graphify.md` exists and `opencode.json` registers a `graphify` command.
- `DESIGN.md` no longer duplicates the full token tables; it has a callout pointing to `docs/DesignSystem.md` for canonical values; the design-brief prose remains.
- `.gitignore` contains `.DS_Store` and `.playwright-mcp/`.
- `vitest.config.js` no longer exists in the working tree.
- `AGENTS.md` has a "Harness layout" section and a `graphify update .` row in Key commands.
- `npm run fix:all` passes (format + lint) on all changed files.
- `npm test` still passes (no test files changed, but confirm nothing broke).

## Docs to update

- `AGENTS.md` — new "Harness layout" section + Key commands row (planner writes this, it's a convention).
- `DESIGN.md` — dedupe (planner writes; this is judgment work).
- `docs/DesignSystem.md` — no change needed (already canonical).
- `docs/Architecture.md` — no change needed (already updated in fe2a78c).
- The harness files (`.opencode/**`) ARE the docs for the harness; updating them is the implementation, not a separate docs-sync step. The docs-sync skill run at the end should verify the harness files are consistent but no separate `docs/*.md` edit is required beyond `DESIGN.md`.
