---
name: docs-sync
description: Use after implementing a change, to keep documentation in sync. Ensures every docs/*.md covering the touched area is updated, AGENTS.md conventions are appended for any new project rule, and new docs/*.md files are created when a feature warrants its own page. Trigger after a plan from task-planning is implemented, or whenever the user says "update the docs", "document this", or asks to sync docs after a change.
---

# Docs Sync Workflow

This repo has no automated tests — documentation IS the regression surface. Every behavioral or architectural change must be reflected in `docs/` and `AGENTS.md` before the task is archived.

**You (the planner agent, running on glm-5.2) write the docs yourself.** Do NOT delegate docs to the build agent — build runs on a cheaper model and is not suited for the judgment calls required here (matching tone, deciding new docs, AGENTS.md convention decisions). The build agent implements code only; you handle docs.

The reviewer agent (cheap model) will verify your docs work afterward via a checklist — it checks that every doc listed in the plan's `## Docs to update` was actually edited, but it does not write or judge quality. That's your job.

## Existing docs (as of this writing)

```
docs/Architecture.md   docs/Camera.md       docs/Controls.md   docs/Keyboard.md
docs/Math.md           docs/NeuralNetwork.md docs/Physics.md   docs/ProjectGoal.md
docs/Race.md           docs/SaveLoad.md     docs/Simulators.md docs/Sound.md
docs/Store.md          docs/Units.md        docs/Viewport.md   docs/WorldEditor.md
```

Read `docs/Architecture.md` first to understand the doc house style (heading depth, code-block conventions, when to link to AGENTS.md vs duplicate).

## Step 1 — Identify touched surfaces

From the just-complemented change, list every area touched:

| Code area                                       | Doc(s) to check                          |
| ----------------------------------------------- | ---------------------------------------- |
| `ts/car/` (physics, sensors, controls, brain)   | `docs/Physics.md`, `docs/NeuralNetwork.md` |
| `ts/world/`, markings, lights                   | `docs/WorldEditor.md`                    |
| `ts/simulator/`, training, race, traffic shells | `docs/Simulators.md`, `docs/Race.md`     |
| `ts/panels/`, keyboard manager, toolbars        | `docs/Keyboard.md`, `docs/Controls.md`   |
| `ts/rendering/`, viewport, camera               | `docs/Viewport.md`, `docs/Camera.md`     |
| `ts/store/`, serialization, save files          | `docs/SaveLoad.md`, `docs/Store.md`      |
| `ts/math/`, primitives, grids, heatmaps         | `docs/Math.md`, `docs/Units.md`          |
| Audio / sound engine                            | `docs/Sound.md`                          |
| New project-wide convention                     | `AGENTS.md` (append to relevant section) |

## Step 2 — Update each touched doc

For each doc in your list:

1. **Read the existing doc fully** — do not append blindly. The change may belong in an existing section, or it may obsolete a paragraph that needs removing.
2. **Match the existing tone and heading depth.** This repo's docs use `##` for sections, `###` for subsections, tables for enumerations, and inline code for symbols/paths.
3. **Reference AGENTS.md for conventions, do not duplicate them.** A doc explains *what* a feature does and *how* to use it; AGENTS.md records the *rule* the codebase enforces. If you find yourself copying a rule into a doc, link to `AGENTS.md §<section>` instead.
4. **Update diagrams/tables if the change alters them.** The state-aware sensor table in `docs/Physics.md` and the keyboard bindings table in `docs/Keyboard.md` are examples of tables that must stay in sync.
5. **Note one-frame lags, ephemeral state, and other gotchas** in the relevant doc — these belong in docs, not just AGENTS.md key-gotchas.

## Step 3 — Decide if a new doc is warranted

Create a new `docs/<Name>.md` ONLY when:

- The feature is large enough that shoving it into an existing doc would make that doc >400 lines, AND
- The feature has a distinct user-facing surface (its own HTML page, its own panel, its own config schema).

If you create a new doc:

- Use PascalCase matching the existing names (`TrafficControl.md`, not `traffic-control.md`).
- Add a one-line intro stating what the doc covers and which entry point it relates to.
- Link to it from `docs/Architecture.md` if that doc has an index/overview section.
- Add it to the table above in this skill (so future runs know it exists).

When in doubt, fold the new info into an existing doc rather than spawning a new file. The bar for a new doc is high.

## Step 4 — AGENTS.md conventions

`AGENTS.md` is the single source of truth for **rules the codebase enforces**, not feature descriptions. Append to AGENTS.md ONLY when the change introduces:

- A new architectural rule (e.g. a new layer, a new isolation boundary, a new serialization pattern).
- A new key gotcha that would bite the next person editing the code.
- A new entry point, localStorage key, or save-file schema version.
- A new config constant in `ts/car/config.ts` that other agents must respect.
- A new private-field convention, naming rule, or import-path rule.

Do NOT add to AGENTS.md for: feature descriptions (those go in `docs/`), one-off implementation details, or anything already covered by an existing bullet.

When appending, place it in the right section:

- **Architecture rules** — new layer/isolation/serialization rules.
- **Key gotchas** — surprising behaviors, one-frame lags, ephemeral state.
- **Persistence** table — new localStorage keys.
- **Entry points** — new HTML pages.
- **Key commands** — new npm scripts.

Keep bullets to one line where possible; use the existing bullet style (em-dash separated).

## Step 5 — Report

After updating, list to the user:

- Which `docs/*.md` files were edited and a one-line summary of each edit.
- Whether a new `docs/*.md` was created (and its name).
- Whether `AGENTS.md` was updated (and which section).

This report is what gets recorded in the task archive alongside the plan MD.
