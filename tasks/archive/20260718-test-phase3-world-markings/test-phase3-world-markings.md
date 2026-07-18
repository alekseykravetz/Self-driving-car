# Phase 3: World, Corridor, TrafficManager & Marking Tests

**Date:** 2026-07-18
**Slug:** test-phase3-world-markings
**Entry points affected:** none — only `tests/` added
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Extend test coverage from ~75% to ~82% by adding tests for world-adjacent modules: corridor geometry, traffic light state machine, marking constructors/anchor/reanchor, building serialization, tree prototype generation, and world helper functions.

## Strategy

All modules in this phase are **pure geometry/logic** in their non-draw methods. The only DOM dependencies are:

- **`Start` marking** — calls `new Image()` (same global mock as Phase 2 — tests importing `Start` must call `setupImageMock()`)
- All `draw()` methods across all classes — skipped (Canvas-dependent)

## Context (read first)

- `AGENTS.md` — project conventions.
- `tasks/test-phase1-quick-wins.md` and `tasks/test-phase2-car-integration.md` (archived) — prior patterns.
- `tests/helpers/setupImageMock.ts` — shared Image mock (may need to import in marking tests for `Start`).
- Existing tests for pattern reference.

### Source files to read

| File                            | Lines | Testability                                                                      |
| ------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `ts/world/corridor.ts`          | 141   | ✅ Pure geometry — `fromPath()`, `load()`, `removeCorridorCap()`                 |
| `ts/world/trafficManager.ts`    | 155   | ✅ Pure state — crossroads detection, control centers, cycling                   |
| `ts/world/markings/marking.ts`  | 162   | ✅ Pure geometry — constructor, `setAnchor()`, `reanchor()`, `rebuildGeometry()` |
| `ts/world/markings/light.ts`    | 106   | ✅ Pure state — `override()`, `releaseOverride()`, state transitions             |
| `ts/world/markings/stop.ts`     | 42    | ✅ Pure constructor geometry                                                     |
| `ts/world/markings/target.ts`   | 22    | ✅ Pure constructor geometry                                                     |
| `ts/world/markings/start.ts`    | 65    | ⚠️ `new Image()` in constructor (use `setupImageMock()`)                         |
| `ts/world/markings/crossing.ts` | 38    | ✅ Pure constructor geometry                                                     |
| `ts/world/markings/parking.ts`  | 42    | ✅ Pure constructor geometry                                                     |
| `ts/world/markings/yield.ts`    | 42    | ✅ Pure constructor geometry                                                     |
| `ts/world/items/building.ts`    | 142   | ✅ Pure serialization — `load()`, `loadFootprint()`, `toFootprint()`             |
| `ts/world/items/tree.ts`        | 263   | ✅ `buildTreePrototypes()`, `Tree.load()`, `toInstance()`, pure functions        |
| `ts/world/world.ts`             | 447   | ⚠️ Helper fns only — `loadWorldCorridors()`, `loadTreeInstance()`                |

## Scope

### In scope

| #         | Test file                                           | Est. tests | What it covers                                                                                             |
| --------- | --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| 1         | `tests/unit/world/corridor.test.ts`                 | ~10        | `fromPath()` with various options, `load()` round-trip, `removeCorridorCap()`                              |
| 2         | `tests/unit/world/trafficManager.test.ts`           | ~14        | `#getCrossroads()`, `#initializeControlCenters()`, `update()` cycling, override/release                    |
| 3         | `tests/unit/world/markings/marking.test.ts`         | ~12        | Constructor, `setAnchor()`, `reanchor()`, `rebuildGeometry()`, `MarkingAnchor`                             |
| 4         | `tests/unit/world/markings/light.test.ts`           | ~8         | Constructor, `override()`/`releaseOverride()`, `state`, `type`                                             |
| 5         | `tests/unit/world/markings/markingSubtypes.test.ts` | ~12        | Stop, Target, Start, Crossing, Parking, Yield — constructors, `type`, `rebuildGeometry()`, border segments |
| 6         | `tests/unit/world/items/building.test.ts`           | ~8         | Constructor, `load()`, `loadFootprint()`, `toFootprint()`                                                  |
| 7         | `tests/unit/world/items/tree.test.ts`               | ~8         | `buildTreePrototypes()`, `DEFAULT_TREE_PROTOTYPE`, construction                                            |
| 8         | `tests/unit/world/world.test.ts`                    | ~4         | `loadWorldCorridors()` (legacy/new), `loadTreeInstance()`                                                  |
| **Total** |                                                     | **~76**    | **8 new test files**                                                                                       |

#### Detailed breakdown

### 1. `tests/unit/world/corridor.test.ts`

**Setup:**

```typescript
import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Corridor } from '../../../ts/world/corridor.js';
```

**Test groups:**

| Test                                | What it verifies                                 |
| ----------------------------------- | ------------------------------------------------ |
| `fromPath()` with single segment    | Returns Corridor with borders + skeleton         |
| `fromPath()` with multiple segments | Correct skeleton count                           |
| `fromPath()` with `openStart`       | Start cap removed (first skeleton border absent) |
| `fromPath()` with `openEnd`         | End cap removed                                  |
| `fromPath()` with `extendEnd`       | Extension segment appended to skeleton           |
| `load()` round-trip                 | Plain object → Corridor → same skeleton/borders  |
| `load()` preserves open flags       | `openStart`, `openEnd` survive load              |
| `load()` with missing flags         | Defaults to false for missing open flags         |

**Helper:**

```typescript
function makeSimpleSkeleton(): Segment[] {
  const p1 = new Point(0, 0);
  const p2 = new Point(0, 100);
  return [new Segment(p1, p2)];
}
```

### 2. `tests/unit/world/trafficManager.test.ts`

**Setup:**

```typescript
import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { TrafficManager } from '../../../ts/world/trafficManager.js';
import { Light } from '../../../ts/world/markings/light.js';
```

**Key insight:** TrafficManager needs a Graph with specific points/segments (crossroads = degree > 2). Create a graph with a known intersection.

```typescript
function makeCrossroadGraph(): Graph {
  const p1 = new Point(0, 0);
  const p2 = new Point(0, 100); // vertical road
  const p3 = new Point(100, 0); // horizontal road (intersects at origin)
  const p4 = new Point(-100, 0);
  const graph = new Graph();
  graph.tryAddPoint(p1);
  graph.tryAddPoint(p2);
  graph.tryAddPoint(p3);
  graph.tryAddPoint(p4);
  graph.tryAddSegment(p1, p2);
  graph.tryAddSegment(p3, p4);
  // This creates an intersection: p1 connects to p2, p3 connects to p4
  // Actually need p1 as the crossroad point...
  return graph;
}
```

**Better approach:** Create a graph where a single point has 3+ segments (crossroad).

**Test groups:**

| Test                                                        | What it verifies                                |
| ----------------------------------------------------------- | ----------------------------------------------- |
| Constructor with empty markings                             | No control centers, no error                    |
| `#getCrossroads()` detects degree > 2                       | Crossroad point found                           |
| `#initializeControlCenters()` groups lights by intersection | Lights assigned to correct center               |
| `update()` cycles lights green→yellow→red                   | Frame count progression produces expected state |
| `update()` skips overridden lights                          | Overridden light stays in its state             |
| `overrideLight()` / `releaseOverride()`                     | Light overridden flag toggled                   |
| `releaseAllOverrides()`                                     | All overridden lights released                  |
| Frame count increments                                      | `frameCount` increases after update             |

### 3. `tests/unit/world/markings/marking.test.ts`

**Setup:** Basic Point + Graph + Marking.

**Test groups:**

| Test                                    | What it verifies                                |
| --------------------------------------- | ----------------------------------------------- |
| Constructor creates support segment     | `support.p1`, `support.p2` at correct positions |
| Constructor creates polygon             | `polygon` is a Polygon with 4+ points           |
| `type` defaults to 'marking'            | Default type string                             |
| `setAnchor()` creates anchor            | `anchor` has `p1`, `p2`, `offset`, `lateral`    |
| `setAnchor()` on graph with no segments | No anchor created (no crash)                    |
| `reanchor()` reconstructs position      | Center matches original after reanchor          |
| `reanchor()` with deleted segment       | No-op (keeps last position)                     |
| `rebuildGeometry()` updates polygon     | Support + polygon recalculated                  |

### 4. `tests/unit/world/markings/light.test.ts`

**Setup:** `setupImageMock()` NOT needed — Light does NOT call `new Image()`. Only `Start` does.

| Test                               | What it verifies                                              |
| ---------------------------------- | ------------------------------------------------------------- |
| Constructor creates Light          | `type === 'light'`, `state === 'off'`, `overridden === false` |
| `override('green')`                | State becomes 'green', overridden === true                    |
| `override('yellow')`               | State becomes 'yellow'                                        |
| `override('red')`                  | State becomes 'red'                                           |
| `releaseOverride()`                | Overridden becomes false                                      |
| `override()` twice changes state   | Override keeps overridden=true, state changes                 |
| `border` segment set correctly     | `border` is `this.polygon.segments[0]`                        |
| `rebuildGeometry()` updates border | New geometry → new border                                     |

### 5. `tests/unit/world/markings/markingSubtypes.test.ts`

**Setup:** Some subtypes need `setupImageMock()` — specifically `Start` (calls `new Image()`).

```typescript
import { setupImageMock } from '../../../tests/helpers/setupImageMock.js';

// Only needed for Start
setupImageMock();
```

**Test groups:**

| Test                                   | Subtype  | What it verifies                                                            |
| -------------------------------------- | -------- | --------------------------------------------------------------------------- |
| Constructor sets correct type          | All 6    | `stop`, `target`, `start`, `crossing`, `parking`, `yield`                   |
| Constructor creates valid polygon      | All 6    | Polygon with 4+ points, non-empty                                           |
| `rebuildGeometry()` after construction | All 6    | Polygon recalculated, no crash                                              |
| Stop has correct border                | Stop     | `border === polygon.segments[2]`                                            |
| Yield has correct border               | Yield    | `border === polygon.segments[2]` (same as Stop)                             |
| Crossing has borders array             | Crossing | `borders === [polygon.segments[0], polygon.segments[2]]`                    |
| Parking has borders array              | Parking  | `borders === [polygon.segments[0], polygon.segments[2]]` (same as Crossing) |
| Target constructor                     | Target   | No extra properties beyond base Marking                                     |
| Start constructor with Image mock      | Start    | Creates image reference, no crash                                           |

**All subtypes share the same constructor signature:** `(center: Point, directionVector: Point, width: number, height: number)`. A shared factory can create them all.

```typescript
function makeCenter(): Point {
  return new Point(100, 100);
}
function makeDirection(): Point {
  return new Point(1, 0);
}
```

### 6. `tests/unit/world/items/building.test.ts`

| Test                                  | What it verifies                        |
| ------------------------------------- | --------------------------------------- |
| Constructor stores base and height    | `base` is Polygon, `height` is number   |
| `load()` round-trip                   | Polygon + height restored               |
| `loadFootprint()` from compact form   | Points reconstructed from `number[][]`  |
| `toFootprint()` produces compact form | `{ poly: [[x,y],...], h: number }`      |
| `loadFootprint()` with default height | Height defaults to 200 when `h` missing |

### 7. `tests/unit/world/items/tree.test.ts`

| Test                                          | What it verifies                            |
| --------------------------------------------- | ------------------------------------------- |
| `buildTreePrototypes()` returns correct count | 8 prototypes for seed=123456, count=8       |
| `buildTreePrototypes()` is deterministic      | Same seed → same noise arrays               |
| `buildTreePrototypes()` empty count           | Zero prototypes for count=0                 |
| `DEFAULT_TREE_PROTOTYPE` has noise array      | 32 entries in noise                         |
| `Tree` constructor doesn't crash              | Creates Tree with position, size, prototype |

### 8. `tests/unit/world/world.test.ts`

**Note:** These test the standalone helper functions exported from `world.ts`. The `World` class itself has heavy DOM dependencies (draw methods).

**Key insight:** `loadWorldCorridors` and `loadTreeInstance` are NOT exported — they're module-private functions in `world.ts`. We cannot test them directly without exporting them or testing them through the `World.load()` method.

**Alternative:** Either:
a) Export these functions for testing (add `export` keyword — minimal production change)
b) Skip these tests (they're only ~4 tests)
c) Test through `World.load()` which requires a complex setup

**Recommendation:** Add `export` to these two functions with a `@internal` JSDoc tag. This is a trivially safe production change (no behavioral impact, just makes testable).

```typescript
/** @internal Exported for testing only. */
export function loadWorldCorridors(info: World): Corridor[] { ... }

/** @internal Exported for testing only. */
export function loadTreeInstance(inst: TreeInstance, world: World): Tree { ... }
```

| Test                                               | What it verifies                                |
| -------------------------------------------------- | ----------------------------------------------- |
| `loadWorldCorridors()` with corridors array        | Returns array of Corridor from new-format world |
| `loadWorldCorridors()` with legacy single corridor | Returns single-entry array                      |
| `loadWorldCorridors()` with no corridors           | Returns empty array                             |
| `loadTreeInstance()` reconstructs Tree             | Position, prototype applied                     |

## Out of scope

- All `draw()` methods (Canvas — visual/Playwright tests)
- All editors (DOM events)
- `World.draw()` / `World.generate()` — complex Canvas operations
- `worldGenerator.ts` — depends on World and Graph state
- `markingLoader.ts` — `loadMarking()` is called by World.load(), complex setup
- `trafficSimulator.ts`, `trainingSimulator.ts` — full simulator shells

## Approximate file structure

```
tests/
  unit/
    world/
      corridor.test.ts                (NEW)
      trafficManager.test.ts          (NEW)
      world.test.ts                   (NEW)
      markings/
        marking.test.ts               (NEW)
        light.test.ts                 (NEW)
        markingSubtypes.test.ts       (NEW)
      items/
        building.test.ts              (NEW)
        tree.test.ts                  (NEW)
  helpers/
    setupImageMock.ts                 (existing – may need importing for Start)
```

## Production code change

Minimal: Add `export` keyword to `loadWorldCorridors` and `loadTreeInstance` in `ts/world/world.ts` with `@internal` JSDoc. This is safe — no behavioral change, just makes testable.

## Acceptance criteria

- `npm test` — all existing tests + ~76 new tests pass (528 total).
- `npm run test:coverage` — verify:
  - `ts/world/corridor.ts` ≥90%
  - `ts/world/trafficManager.ts` ≥90%
  - `ts/world/markings/marking.ts` ≥85%
  - `ts/world/markings/light.ts` ≥85%
  - `ts/world/items/building.ts` ≥90%
  - `ts/world/items/tree.ts` ≥70% (constructors only, no draw)
  - Overall statements ≥80%
- All new files pass `npm run lint` and `npm run format`.
- `tsc --noEmit` compiles clean.
- `AGENTS.md` updated with Phase 3 coverage notes.

## Implementation order

1. `light.test.ts` — simplest state machine, warms up the marking pattern
2. `marking.test.ts` — base class, sets up constructor/helper patterns
3. `markingSubtypes.test.ts` — extends marking patterns to all subtypes
4. `corridor.test.ts` — pure geometry with helper factories
5. `trafficManager.test.ts` — graph setup + state cycling logic
6. `building.test.ts` — serialization round-trip
7. `tree.test.ts` — deterministic prototype generation
8. `world.test.ts` — helper function tests (requires export change)
9. Update AGENTS.md, run fix:all, archive
