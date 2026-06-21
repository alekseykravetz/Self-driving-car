# Task 07 — Split god classes

**Effort:** high · **Status:** done

## Problem

Several oversized files mix rendering, state, input, and persistence in one class:

| File                                     | LOC | Mixed responsibilities           |
| ---------------------------------------- | --- | -------------------------------- |
| `ts/ai-training/simulator.ts`            | 623 | render + state + input + storage |
| `ts/ai-training/trainingManagerPanel.ts` | 558 | UI + persistence + pool mgmt     |
| `ts/games/race.ts`                       | 448 | render + storage                 |
| `ts/world-editor/world.ts`               | 421 | model + (editor concerns)        |
| `ts/world-editor/editors/worldEditor.ts` | 366 | custom element + state           |

## Goal

Separate concerns so each class has a single responsibility. Start with the worst offenders.

## Suggested approach (incremental, one file at a time)

1. **`simulator.ts`** — extract:
   - rendering → a dedicated renderer (reuse/extend `ts/ai-training/carRenderer.ts`)
   - persistence → reuse `ts/ai-training/storageManager.ts` (the `bestPool` read/write)
   - input handling → a small input controller
2. **`trainingManagerPanel.ts`** — keep it as the custom element; move pool persistence into
   `storageManager.ts` and pool math into a helper.
3. **`race.ts`** — route its `bestPool` localStorage access through `storageManager.ts`.
4. After each extraction, run `tsc` + `npm run lint` and manually test the affected page.

## Acceptance criteria

- No single class owns rendering **and** state **and** input **and** persistence.
- Duplicate `localStorage.setItem("bestPool", ...)` logic lives in one place.
- Each refactored page still works (simulator, training panel, race).

## Notes

- High risk — do one extraction per commit and verify behavior before the next.
- Tackle this **after** Tasks 04 and 05 so the shared parser/safe-read helpers already exist.
- There is no test suite, so manual verification of each page is required.

## Resolution

- **Persistence centralized:** all duplicate `localStorage.setItem('bestPool', ...)`
  writes (in `simulator.ts`, `race.ts`, `trainingManagerPanel.ts`) now route through
  `savePoolToStorage()` in `storageManager.ts`. No class writes the pool key directly.
- **Simulator state-update extracted:** the world-mode car-update logic moved out of
  `Simulator` into a free function `updateWorldCars()` in
  `ts/ai-training/worldModeBehavior.ts`, mirroring the existing `updateSimpleCars()` in
  `simpleModeBehavior.ts`. The simulator no longer owns persistence, and its simulation
  step is separated from rendering orchestration.
- Verified with `tsc` + `eslint` (clean). Manual page testing still recommended.
