---
name: task-planning
description: Use when the user describes a change, fix, or feature to implement. Drives the full task lifecycle: interview the user to resolve ambiguity, write a self-contained implementation plan to tasks/<slug>.md, hand off to the build agent for implementation, then archive the plan to tasks/archive/YYYYMMDD-<slug>/. Trigger on phrases like "I want to add", "let's fix", "we need a feature", "change the way", or any open-ended implementation request.
---

# Task Planning Workflow

You own the full task lifecycle for this repo. Every user request that is more than a single-line factual question follows this flow. Do NOT skip steps. Do NOT start editing source files — implementation is the build agent's job, handed off via the plan MD.

## Step 1 — Capture the raw request

Restate the user's request in one sentence in your head, then identify what is genuinely ambiguous. Common ambiguity axes in this codebase:

- **Scope** — which entry point / simulator / panel is affected? (`simulator.html`, `traffic.html`, `race.html`, `world.html`, or shared `ts/`?)
- **Layer** — is this a math primitive, a car/sensor/physics change, a neural-network change, a UI/panel change, or a simulator shell change? (See `AGENTS.md` "Architecture rules" for the layer hierarchy.)
- **Backward compatibility** — does this break existing `.car` / `.world` save files? Existing brains? localStorage keys?
- **Persistence** — does the change need to survive reload? New localStorage key? New save-file field?
- **Visual vs behavioral** — is this purely rendering, or does it change car/traffic/sensor behavior?
- **State-aware** — does it touch the state-aware sensor flag or brain input dimensions? If yes, `brainsCompatible()` must be updated.

Do not interview on things that are already answered by `AGENTS.md` — read it first.

## Step 2 — Interview (hybrid: question tool first, free-form after)

Use the `question` tool to batch the high-value clarifications. Issue ONE `question` tool call with multiple `questions` entries — do not drip them out one at a time. Each question should have 2-4 concrete options drawn from the codebase where possible (file paths, layer names, existing config keys), plus the automatic "Type your own answer" fallback.

After the user answers the structured batch:

- If any answer reveals a new ambiguity that you could not have predicted, ask ONE round of free-form follow-up questions as plain text. Keep it to at most 2-3 questions.
- If the structured answers fully resolve the request, DO NOT ask more questions — move to Step 3.

Rules:

- Never ask more than 6 questions total across both phases. If you need more, the request is underspecified — ask the user to restate it instead.
- Never ask a question whose answer is already in `AGENTS.md`, `docs/`, or the existing task MD files.
- Prefer options that reference real files/symbols in this repo over generic phrasing.

## Step 3 — Write the plan to `tasks/<slug>.md`

The slug is kebab-case, 2-6 words, derived from the request. Examples: `traffic-light-override`, `extract-magic-numbers`, `fix-script-ordering`.

The plan MD MUST be self-contained: a fresh build agent with zero prior conversation context must be able to implement the change from this file alone. It must NOT say "as we discussed" or reference the interview — encode every decision as a concrete spec.

### Required sections

```markdown
# <Title>

**Date:** YYYY-MM-DD
**Slug:** <slug>
**Entry points affected:** <list html/* files, or "none — shared ts/ only">
**Save-file impact:** <none | new field on .car/.world | breaking | migration needed>
**Backward compat:** <preserved | brain dims change | localStorage key added>

## Goal
<2-4 sentences. What the user wants and why.>

## Context (read first)
<Absolute file paths the implementer MUST read before writing code. Include line
ranges when relevant. Pull conventions from AGENTS.md by reference, do not
copy them.>

## Scope
- **In scope:** <bullet list of concrete changes>
- **Out of scope:** <explicit non-goals>

## Implementation

### <Area 1, e.g. "ts/car/sensors/sensor.ts">
- <Change as a bullet, concrete enough to act on: function name, new field,
  expected signature, which existing helper to reuse.>
- <Reference the AGENTS.md rule that applies, e.g. "Sensor must stay decoupled
  from Car — receive (x, y, angle, polygons) via update().">

### <Area 2 ...>

## Brain / persistence considerations
<If the change touches brain input dims, sensor mode, or save schema, spell out
exactly how brainsCompatible() / Car.load() / serialization must handle it.
If none, write "None.">

## Acceptance criteria
- <Concrete, checkable bullet. e.g. "Opening simulator.html and enabling
  state-aware mode renders a colored dot at each traffic-light ray endpoint.">
- <Each criterion must be verifiable by opening an HTML page — there are no
  automated tests in this repo.>

## Docs to update
- <List every docs/*.md file that needs edits, and AGENTS.md if a convention
  is added/changed. See docs-sync skill for the doc-update protocol.>
- <If a new docs/*.md is warranted, name it and give a one-line purpose.>
```

### Writing rules

- Use **absolute paths** (`ts/car/sensors/sensor.ts`, not `the sensor file`).
- Reference real symbol names — grep first if you are not sure of the exact name.
- Pull architecture constraints from `AGENTS.md` by name ("see AGENTS.md § Sensor decoupled"), do not paraphrase them.
- If the change touches the layer hierarchy, draw the before/after import edges explicitly.
- One plan MD per task. If the request decomposes into independent sub-features, write one MD per sub-feature with a `01-`, `02-` prefix (mirrors the existing `tasks/archive/20260710-sensors-classified/` layout).
- Run `npm run fix:all` is NOT your job — that's the build agent's. But list it in Acceptance criteria.

## Step 4 — STOP for review

After writing `tasks/<slug>.md`, output:

> Plan written to `tasks/<slug>.md`. Review it and reply `proceed` to hand off to the build agent, or tell me what to change.

Then stop. Do NOT call the build agent. Do NOT edit source. Wait for the user.

## Step 5 — Hand off (only after user says proceed)

When the user replies `proceed` (or equivalent), call the **build** agent via the `task` tool with a prompt that:

1. Names the plan MD by absolute path.
2. Tells build to read it fully before doing anything.
3. Asks build to follow the plan exactly and report back when done, including which docs it touched.
4. Does NOT restate the plan — the MD is the source of truth.

Example handoff prompt:

```
Read /Users/alex/Code/Self-driving-car/tasks/<slug>.md fully and implement it.
Follow the plan exactly. When done, report which files you changed and which
docs/*.md you updated. Do not deviate from the plan without flagging it first.
```

## Step 6 — Docs sync

After build reports done, follow the `docs-sync` skill: ensure every doc listed in the plan's "Docs to update" section is actually updated, `AGENTS.md` conventions are appended if a new convention was introduced, and any new `docs/*.md` file is created.

## Step 7 — Archive

When the user confirms the work is complete:

1. Create `tasks/archive/YYYYMMDD-<slug>/` (use today's date, the same date as the plan's `**Date:**` field when possible).
2. Move `tasks/<slug>.md` (and any `01-`, `02-` sibling plan files) into that archive folder.
3. If the plan generated sub-feature MDs, move all of them together.
4. Confirm the archive path to the user.

Do NOT archive until the user explicitly confirms completion. "Looks good" or "works" counts as confirmation; "I'll test later" does not.

## When NOT to run this workflow

- The user asks a factual question ("where is X defined?") → just answer.
- The user asks for a one-line edit ("rename this variable") → just do it.
- The user asks the architect agent to audit → that's `architect.md`'s job, not yours.
- The user invokes a command directly → run the command.

If unsure whether a request warrants the full flow, default to running it — the interview step is cheap and the plan is useful even for small changes.
