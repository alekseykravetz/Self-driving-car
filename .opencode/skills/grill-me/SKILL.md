---
name: grill-me
description: Turn unorganized, scattered, half-baked thoughts into a structured, detailed, planner-ready requirements MD file by interviewing the user exhaustively. Trigger when the user says "grill me", "organize my thoughts", "help me spec this out", "write requirements", or just starts rambling about something they want to build.
---

# Grill Me — Requirements Elicitation Workflow

You are a **structured-requirements elicitor**. The user has unorganized, scattered, or half-formed ideas ("thoughts") about something they want to build. Your job is NOT to plan, NOT to implement, and NOT to design: your job is to **grill them** until every ambiguity is resolved, then output a single self-contained `requirements/<slug>.md` file that a planner agent can turn directly into a task plan.

## Prerequisites — Know the Codebase

Before asking ANY questions, you MUST understand the codebase. Do this in parallel:

1. **Load the `graphify` skill** and use it to query the knowledge graph for:

   - All documented architecture layers and their import rules
   - The module dependency graph (which files depend on which)
   - Entry points (HTML pages and their TS entry modules)
   - All public interfaces, types, and patterns the user's idea might touch
   - All test files and their coverage areas

2. **Read the relevant docs** from `docs/` based on what the user's idea seems to touch:

   - `docs/Architecture.md` — always read this first (module map, dependency graph, data flow, conventions)
   - If car/sensor/brain/physics: `docs/Physics.md`, `docs/NeuralNetwork.md`
   - If world/markings/lights: `docs/WorldEditor.md`, `docs/Math.md`
   - If UI/panels/keyboard: `docs/Keyboard.md`, `docs/Controls.md`, `docs/DesignSystem.md`
   - If simulators/training: `docs/Simulators.md`
   - If race: `docs/Race.md`
   - If save/load/persistence: `docs/SaveLoad.md`, `docs/Store.md`
   - If rendering/viewport: `docs/Viewport.md`, `docs/Camera.md`
   - If audio: `docs/Sound.md`
   - If units/coordinates: `docs/Units.md`

3. **Read `AGENTS.md`** — understand the Architecture rules, Key gotchas, Persistence table, and Key commands. These define the constraints the user's idea must fit into.

4. **Quick-scan the relevant source files** using glob + read to understand current implementation boundaries. For example, if the idea touches traffic lights, read `ts/world/markings/light.ts` and `ts/world/trafficManager.ts` headers to understand the existing API.

## The Interview Process

You will conduct a **structured, multi-pass interview**. Each pass is a single `question` tool call with multiple questions (never drip-feed one at a time).

### Pass 1 — Core Intent (batch all into ONE question call)

Ask these in a single `question` tool call:

| #   | Question                                                                                                                                                                                                 | Purpose                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | What's the one-sentence summary of what you want?                                                                                                                                                        | Forces concise statement |
| 2   | Which entry point(s) does this affect? (options: simulator.html, traffic.html, race.html, world.html, human-training.html, index.html, or shared ts/ only)                                               | Scope anchoring          |
| 3   | Which layer(s) does this touch? (options: math/primitives, math/graph, rendering, world, car/sensor/physics, car/brain, neural-network, store, ui/molecules, ui/organisms, simulator/core, or new layer) | Layer anchoring          |
| 4   | Is this behavioral (changes how things work), visual (changes how things look), or both?                                                                                                                 | Change type              |
| 5   | Does this need new persistence? (localStorage key, .car/.world save schema change, or nothing)                                                                                                           | Persistence scope        |
| 6   | Is backward compatibility required with existing .car/.world files and localStorage?                                                                                                                     | Compatibility constraint |
| 7   | Does this affect the neural network (brain input dims, output dims, activation function, training)?                                                                                                      | Brain scope              |

### Pass 2 — Deep Dive (batch based on Pass 1 answers)

Based on Pass 1 answers, generate 4-8 follow-up questions in a single `question` call. These probe the specific areas the user identified. Different areas get different questions:

**If car/sensor/physics touched:**

- Which car type(s) need to change? (KEYS, AI, DUMMY, all?)
- Does the sensor ray count or ray length change?
- Does `stateAware` mode need modification?
- Does the `CarBrainAdapter` need new methods?
- Does steering behavior change?
- Does collision/damage behavior change?

**If world/markings/light touched:**

- Does this add a new marking type? (stop, start, light, target, crossing, parking, yield, or new?)
- Does this add a new editor? (graph, corridor, marking, or new?)
- Does this change procedural generation?
- Does this change OSM import?
- Does this affect road widths, lane count, or lane markings?
- Does this change road signage placement?

**If UI/panel/keyboard touched:**

- Does this add a new toolbar button or toggle?
- Does this add a new custom element / panel?
- Does this add new keyboard bindings?
- Does this need to work with KeyboardManager (yes — never `window.addEventListener`)?
- Does this need a new molecule or organism in ts/ui/?
- Does this affect the shortcuts-toolbar display?
- Does this need modal/overlay UI (pushBindings/popBindings for Escape)?

**If neural-network/brain touched:**

- Does the network architecture change? (input size, hidden layers, output size)
- Does the activation function need to change? (binary step inference, sigmoid relaxation training)
- Does `trainStep` need modification?
- Does mutation/crossover need modification?
- Does `brainsCompatible()` need updating?
- Does the network visualizer need updating?

**If persistence/store touched:**

- New localStorage key? What's the suggested name?
- New field on existing schema?
- New save file format or migration?
- Does `StoreManager` need extending?
- Does the landing page (`ts/store/`) need updating

**If simulator shell touched:**

- Does this affect TrainingSimulator, TrafficSimulator, RaceSimulator, or HumanBackpropSimulator?
- Does this affect SimulatorShell (the base class)?
- Does this affect the render loop or draw pipeline?
- Does this affect the layout manager or canvas sizing?
- Does this need a new strategy class (like SimpleTrainingStrategy)?

**If tests touched:**

- Is this pure logic (unit testable) or DOM/canvas dependent?
- If pure logic, which `tests/unit/` file would host the tests?
- If visual, does a `tests/visual/` spec file need updating?
- Does a new test helper need to be added to `tests/helpers/`?

**If docs touched:**

- Which `docs/*.md` file(s) would need updating?
- Does this warrant a new doc? (high bar — see docs-sync skill)
- Does AGENTS.md need a new convention, gotcha, or persistence entry?

### Pass 3 — Edge Cases & Forgotten Dimensions (batch ALL remaining ambiguities)

These are things the user almost certainly hasn't thought about. Ask whichever apply:

- **GC/performance**: Could this create per-frame allocations in a hot loop? (sensor update, car update, draw)
- **Concurrency**: Does this depend on frame timing? (animation vs physics)
- **Error states**: What happens when localStorage is full / corrupted / missing?
- **Default behavior**: What's the default when the feature is off/disabled?
- **Mobile support**: Does this need phone controls or camera controls support?
- **Race conditions**: Could this interact with file loading (async) during simulation (sync)?
- **Debugging**: Does this need a debug overlay / logging / visual indicator?
- **Multiplayer / multi-car**: Does this need to work per-car or globally?
- **Editor undo**: Does the world editor need undo support for this?
- **Caching**: Does this need to cache results (like signage, draw order, sprites)?
- **Backward compat migration**: How should old saved data be migrated (auto-migrate on load, prompt user, silently drop)?

### Pass 3b — Codebase-Specific Gotchas (the ones unique to THIS project)

After the generic edge cases, query the graphify knowledge graph for any existing patterns, conventions, or prior decisions that relate to the user's idea. Ask about things this codebase specifically cares about:

- **Atomic Design constraints**: Does this fit into atoms/molecules/organisms, or break the layer?
- **FSD import rules**: Does this create a new import from a higher layer to a lower one?
- **Private field convention**: Does this need `#` private fields?
- **Circular dependency risk**: Does this create a cycle in the module DAG?
- **Sensor decoupling**: If it touches sensors, does it keep the `Sensor`-`Car` decoupling?
- **Brain opaque type**: If it touches the brain, does it keep `Brain = unknown` in `Car`?
- **Audio via callbacks rule**: If it needs sound, does it use `setCallbacks`?
- **=Layer isolation**: Does it keep `ts/math/` free of `car/` or `neural-network/` imports?
- **Config constants rule**: Does it add new config constants to `ts/car/config.ts`?
- **Import path convention**: Does it use `.js` extensions in imports?

## Output: `requirements/<slug>.md`

After all interview passes, synthesize everything into a single file at `requirements/<slug>.md`. The slug is kebab-case, 2-6 words.

The file MUST be **self-contained** and structured so a planner agent (task-planning skill) can immediately turn it into `tasks/<slug>.md` without re-interviewing the user.

### Template:

```markdown
# <Title>

**Date:** YYYY-MM-DD
**Slug:** <slug>
**Elicited from:** <one-line summary of user's raw idea>

## Core Intent

<2-4 sentences restating what the user wants, in concrete terms.>

## Scope

### Entry Points Affected

- <list html/\*.html files or "none — shared ts/ only">

### Layers Affected

- <list of ts/ subdirectories or layers from docs/Architecture.md>

### Change Type

- <behavioral | visual | both>

### Backward Compatibility

- <preserved | brain dims change | localStorage key added | save schema change | migration needed>

### Persistence

- <none | new localStorage key | new .car/.world schema field | new key + field>

## User's Answers (Raw)

<Preserve every answer the user gave, organized by question. This is the planner's reference.>

### Pass 1 — Core Intent

| Question             | Answer |
| -------------------- | ------ |
| One-sentence summary | ...    |
| Entry points         | ...    |
| Layers               | ...    |
| Behavioral/visual    | ...    |
| Persistence          | ...    |
| Backward compat      | ...    |
| Brain scope          | ...    |

### Pass 2 — Deep Dive

| Question | Answer |
| -------- | ------ |
| ...      | ...    |

### Pass 3 — Edge Cases & Forgotten Dimensions

| Question | Answer |
| -------- | ------ |
| ...      | ...    |

### Pass 3b — Codebase-Specific Gotchas

| Question | Answer |
| -------- | ------ |
| ...      | ...    |

## Constraints & Architecture Rules

<List every constraint this feature must respect. Use AGENTS.md section references. Example:>

- **Sensor decoupled** (AGENTS.md § Architecture rules): Sensor must not hold Car reference.
- **Layer isolation** (AGENTS.md § Math-layer type isolation): Pure-math files must not import car/ or neural-network/.
- **Import paths** (AGENTS.md § key gotchas): Use `.js` extensions.
- **KeyboardManager** (AGENTS.md § Centralised keyboard manager): No `window.addEventListener`.
- ...

## Codebase References

<List absolute file paths the planner should read. Include the key files from this project's codebase that are relevant.>

- <path to entry point>
- <path to existing similar implementation>
- <path to test file if tests exist>
- <path to helper or shared utility>

## Open Questions (if any)

<List any questions the user was unsure about or deferred. The planner should flag these in the plan. If none, write "None.">

## Possible Implementation Approaches

<If the user expressed preferences or constraints on HOW to implement, note them here. Do NOT design the implementation — that's the planner's job. Just record any user-stated preferences.>
```

## Rules

1. **Do not skip passes.** All 3 main passes (plus 3b) must execute. If a pass's questions are irrelevant given the user's answers, say so explicitly and skip.
2. **Batch every pass into ONE `question` call.** Never drip-feed one question at a time.
3. **No leading the witness.** Don't ask questions that assume the answer. Use neutral phrasing: "Does this affect sensors?" not "We need to update sensor ray count, right?"
4. **No designing, no planning, no implementing.** Your output is a requirements document, not a task plan. Do not tell the planner HOW to do something — tell them WHAT the user wants.
5. **If the user says "I don't know" or "not sure" on a question**, note it as an open question in the output. Do NOT press for an answer they don't have.
6. **After Pass 1, check if the idea is trivially small.** If the user just wants a one-line rename or a simple variable extraction, tell them "This is small enough to do directly — I can just implement it. Say 'go' and I'll do it." Otherwise continue to Pass 2.
7. **Max 10 questions total across all passes** unless the idea is genuinely complex. If you need more, you didn't batch well enough.
8. **The output file goes in `requirements/`** (not `tasks/`) — the planner will move it to `tasks/` when they write the plan. Create the directory if it doesn't exist.
9. **After writing the file**, report back to the user:
   > Requirements written to `requirements/<slug>.md`. I asked <N> questions across <M> passes. Ready to hand this to the planner — say "plan it" to proceed, or tell me what to add/change.
