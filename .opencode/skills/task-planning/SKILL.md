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

## Step 5 — Hand off to build (only after user says proceed)

When the user replies `proceed` (or equivalent), call the **build** agent via the `task` tool. Build runs on a cheaper model (deepseek-v4-flash-free) — the plan MD is what makes this safe: it's detailed enough that a cheaper model can execute it mechanically.

The `task` prompt to build:

1. Names the plan MD by absolute path.
2. Tells build to read it fully before doing anything.
3. Asks build to follow the plan exactly, implement every bullet in `## Implementation`, run `npm run fix:all` when done, and report back which files it changed.
4. Does NOT restate the plan — the MD is the source of truth.

Example handoff prompt:

```
Read /Users/alex/Code/Self-driving-car/tasks/<slug>.md fully and implement it.
Follow the plan exactly. Implement every bullet in the ## Implementation section.
When done, run `npm run fix:all`. Report back: (1) which files you changed,
(2) which bullets you completed, (3) anything you skipped or couldn't do.
Do not deviate from the plan without flagging it first.
```

## Step 6 — Reviewer loop (catches incomplete implementation)

After build reports done, call the **reviewer** agent via the `task` tool. Reviewer runs on the same cheap model but is read-only — it checks build's work against the plan.

The `task` prompt to reviewer:

```
Review the implementation of /Users/alex/Code/Self-driving-car/tasks/<slug>.md.
Phase: code.

Build reported these changes:
<paste build's report here>

Verify every bullet in ## Implementation was done, run tsc --noEmit and
npm run lint:log, check acceptance criteria at the code level, and flag
any out-of-scope changes. Return your structured gap report.
```

### Reviewer verdict handling

- **PASS** → proceed to Step 7 (docs sync).
- **GAPS_FOUND** → extract the gap list from the reviewer's report and send build back via `task` with a targeted fix prompt:

  ```
  The reviewer found these gaps in your implementation of
  /Users/alex/Code/Self-driving-car/tasks/<slug>.md:

  1. <gap from reviewer>
  2. <gap from reviewer>
  ...

  Fix every gap. Run `npm run fix:all` when done. Report back what you fixed.
  ```

  Then call reviewer again with the same plan MD + build's fix report.

- **Max 2 review rounds.** If after the 2nd round the reviewer still reports GAPS_FOUND, STOP and report the remaining gaps to the user:

  > Build could not fully complete the plan after 2 review rounds. Remaining gaps:
  > <list gaps>
  > Please review and decide: fix manually, adjust the plan, or accept as-is.

  Wait for the user's decision. Do not loop further.

## Step 7 — Docs sync (planner does this, NOT build)

After the reviewer confirms code is complete (PASS), load the `docs-sync` skill and write the docs yourself. You run on glm-5.2 — docs are this repo's regression surface (no automated tests), so doc quality and AGENTS.md convention decisions need the smart model.

Follow the `docs-sync` skill's protocol:
1. Read the plan's `## Docs to update` section.
2. Read each listed doc, edit it to reflect the change, match the existing tone.
3. Decide if a new `docs/*.md` is warranted (high bar — see docs-sync skill).
4. Append to `AGENTS.md` only if a new convention/gotcha/key/persistence entry is needed.

Build does NOT touch docs. The plan's `## Docs to update` section tells YOU what to write — build implements code only.

## Step 8 — Reviewer docs check (light)

After you finish writing docs, call the reviewer one more time with phase `docs`:

```
Review the docs for /Users/alex/Code/Self-driving-car/tasks/<slug>.md.
Phase: docs.

The plan's ## Docs to update section lists:
<paste the docs-to-update section>

Verify every listed doc was actually edited with the content described,
AGENTS.md has any new conventions the plan specified, and no stale
content was left behind. Return your structured gap report.
```

- **PASS** → proceed to Step 9 (archive).
- **GAPS_FOUND** → fix the docs yourself (you're the smart model, no need to delegate) and re-run the reviewer. Max 1 docs review round — if still gaps, report to user.

## Step 9 — Archive

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

## Cost model summary

| Step | Agent | Model | Why |
|---|---|---|---|
| Interview + plan writing | planner | glm-5.2 (smart) | Judgment, ambiguity resolution |
| Code implementation | build | deepseek-v4-flash-free (cheap) | Mechanical execution from detailed plan |
| Code review | reviewer | deepseek-v4-flash-free (cheap) | Checklist verification, tsc/lint |
| Docs writing | planner | glm-5.2 (smart) | Doc quality is the regression surface |
| Docs review | reviewer | deepseek-v4-flash-free (cheap) | Checklist verification |
| Archive | planner | glm-5.2 (smart) | Trivial, just file moves |

The expensive judgment work (planning, docs) stays on the smart model. The token-heavy mechanical work (implementation, review) runs on the cheap model. The plan MD is the bridge that makes this safe — it's detailed enough that a cheap model can execute without judgment.
