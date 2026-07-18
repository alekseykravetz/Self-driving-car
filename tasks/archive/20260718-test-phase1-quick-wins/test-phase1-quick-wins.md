# Phase 1: Pure-Logic Quick-Win Tests

**Date:** 2026-07-18
**Slug:** test-phase1-quick-wins
**Entry points affected:** none — only `tests/` added
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Extend test coverage from ~56% to ~65% by adding tests for pure-logic modules with no DOM dependency. These are the highest-ROI targets — every module listed here can be tested in Node.js with zero mocking of browser APIs.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, entry points.
- `tasks/add-test-infrastructure.md` — prior art for test patterns, conventions, and the existing 18 test files.
- `tests/helpers/makeKnownNetwork.ts` — helper for constructing deterministic neural networks.
- Existing test files to follow conventions:
  - `tests/unit/car/carPhysics.test.ts` — state factory pattern, import style.
  - `tests/unit/math/trafficControlGrid.test.ts` — polygon factory pattern.
  - `tests/unit/simulator/poolManager.test.ts` — mock car factory pattern.

## Architecture rules for tests (from AGENTS.md + prior plan)

1. **Import paths use `.js` extension** — `import { X } from '../../../ts/car/physics/sensorRaycaster.js'`
2. **No DOM/canvas in unit tests** — pure Node.js execution only.
3. **One concern per test file** — mirror `ts/` structure under `tests/unit/`.
4. **Deterministic tests** — avoid `Math.random` in assertions; use explicit known values.
5. **`npm run fix:all` before commit** — ESLint + Prettier apply to test files too.
6. **No `vi.mock()` unless absolutely necessary** — prefer real instances and test doubles (inline factories).

## Scope

### In scope (Phase 1)

| #   | Test file                                          | Source module                                   | Lines | Est. tests | Priority |
| --- | -------------------------------------------------- | ----------------------------------------------- | ----- | ---------- | -------- |
| 1   | `tests/unit/car/physics/sensorRaycaster.test.ts`   | `ts/car/physics/sensorRaycaster.ts`             | 133   | 10         | High     |
| 2   | `tests/unit/simulator/trafficControlUtils.test.ts` | `ts/simulator/trafficControlUtils.ts`           | 57    | 6          | High     |
| 3   | `tests/unit/car/loader/carLoader.test.ts`          | `ts/car/loader/carLoader.ts`                    | 169   | 10         | High     |
| 4   | `tests/unit/car/controls/controls.test.ts`         | `ts/car/controls/controls.ts`                   | 90    | 6          | High     |
| 5   | `tests/unit/panels/latchedToggle.test.ts`          | `ts/panels/latchedToggle.ts`                    | 42    | 6          | High     |
| 6   | `tests/unit/simulator/poolManager.edge.test.ts`    | `ts/simulator/training/genetics/poolManager.ts` | 141   | 8          | High     |
| 7   | `tests/unit/math/osm-importer/osm.test.ts`         | `ts/math/osm-importer/osm.ts`                   | 155   | 7          | Medium   |
| 8   | `tests/unit/math/worldUnits.gaps.test.ts`          | `ts/math/worldUnits.ts`                         | —     | 3          | Low      |

Total: ~8 new test files, ~56 new test cases.

### Out of scope (future phases)

- Car integration tests (Car + Sensor + Physics + Brain) — Phase 2.
- World/marking/serialization tests — Phase 3.
- Simulator/panels tests (KeyboardManager, etc.) — Phase 4.
- Property-based / fuzz tests — Phase 5.

## Implementation

### 1. `tests/unit/car/physics/sensorRaycaster.test.ts`

**Source:** `ts/car/physics/sensorRaycaster.ts`

**Key surfaces to test:**

- `castRays()` — known car position/angle → expected ray endpoints (count, angle math)
- `castRays()` — `rayCount=1` edge case (lerp with `rayCount===1` gives center angle)
- `castRays()` — `rayOffset` shifts all rays
- `getReading(ray, polygons)` — ray hits polygon → returns `IntersectionPoint` with correct offset
- `getReading(ray, polygons)` — ray misses all polygons → returns `null`
- `getReading(ray, polygons)` — multiple polygons, closest one wins
- `getReadings(rays, polygons)` — multiple rays, returns correct array
- `getTaggedReadings()` — border hit → `{type: 'border'}`; car hit → `{type: 'car'}`; traffic control hit → `{type: 'trafficControl', controlState}`
- `getTaggedReadings()` — closest among all categories wins (e.g., border closer than car)
- `getTaggedReadings()` — no hits → all `null`

**Helper factories needed:**

```typescript
// Simple ray along y-axis from (0,0) pointing up
const straightRay: Point[] = [
  { x: 0, y: 0 } as Point,
  { x: 0, y: -100 } as Point,
];

// Simple square polygon
function makeSquare(cx: number, cy: number, size: number = 20): Point[] {
  return [
    { x: cx - size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy + size / 2 } as Point,
    { x: cx - size / 2, y: cy + size / 2 } as Point,
  ];
}
```

### 2. `tests/unit/simulator/trafficControlUtils.test.ts`

**Source:** `ts/simulator/trafficControlUtils.ts`

**Key surfaces to test:**

- `buildTrafficControls(world)` — world with lights → returns `TrafficControlEntry[]` with correct `polygon` and `getState` closure
- `buildTrafficControls(world)` — world with no markings → empty array
- `buildTrafficControls(world)` — world with non-Light markings → filtered out
- `queryTrafficControlsNearCar(grid, car)` — car near light → returns matching controls
- `queryTrafficControlsNearCar(grid, car)` — car far from lights → empty array
- `queryTrafficControlsNearCar(grid, car)` — car without sensor (fallback to `MIN_RANGE`)

**Note:** `buildTrafficControls` receives `IWorld` which has `markings: Marking[]`. For testing, we can construct a minimal mock world or import `Light` directly. `queryTrafficControlsNearCar` takes a `Car` — we need a minimal mock car object with `x`, `y`, `width`, `height`, `sensor` shape.

**Mock world factory:**

```typescript
function makeMockWorld(markings: Marking[]): IWorld {
  return { markings } as IWorld;
}
```

**Mock car factory:**

```typescript
function makeMockCar(
  overrides: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    sensor: { rayLength: number } | null;
  }>,
) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 25,
    height: overrides.height ?? 63,
    sensor: overrides.sensor ?? { rayLength: 200 },
  } as Car;
}
```

### 3. `tests/unit/car/loader/carLoader.test.ts`

**Source:** `ts/car/loader/carLoader.ts`

**Key surfaces to test:**

Pure functions (no DOM):

- `parseCarFileContent(content)` — valid JSON → parsed `CarInfo`
- `parseCarFileContent(content)` — valid JSON but missing fields → still parses (CarInfo shape)
- `parseCarFileContent(content)` — invalid JSON → returns `null`
- `compareCarInfoParams(a, b)` — identical params → `true`
- `compareCarInfoParams(a, b)` — different maxSpeed → `false`
- `compareCarInfoParams(a, b)` — different sensor.rayCount → `false`
- `compareCarInfoParams(a, b)` — raySpread within epsilon → true; outside epsilon → false
- `compareCarInfoParams(a, b)` — hiddenLayers default `[6]` when omitted
- `compareCarInfoParams(a, b)` — stateAware defaults to false when omitted
- `CarLoader.allParamsMatch(cars)` — empty array → `true`
- `CarLoader.allParamsMatch(cars)` — single car → `true`
- `CarLoader.allParamsMatch(cars)` — all matching → `true`
- `CarLoader.allParamsMatch(cars)` — one different → `false`
- `CarLoader.parseCarFile(content)` — delegates to `parseCarFileContent`
- `CarLoader.compareCarParams(a, b)` — delegates to `compareCarInfoParams`

**Do NOT test:** The `CarLoader` class itself (constructor, `#createInput`, `#handleFilesChange`) — these require DOM (`document.getElementById`, `document.createElement`).

**CarInfo factory:**

```typescript
function makeCarInfo(overrides: Partial<CarInfo> = {}): CarInfo {
  return {
    maxSpeed: 3.24,
    acceleration: 0.01,
    friction: 0.002,
    width: 25,
    height: 63,
    sensor: {
      rayCount: 5,
      raySpread: Math.PI / 2,
      rayLength: 200,
      rayOffset: 0,
      stateAware: false,
    },
    ...overrides,
  };
}
```

### 4. `tests/unit/car/controls/controls.test.ts`

**Source:** `ts/car/controls/controls.ts`

**Key surfaces to test:**

**DO NOT test:** keyboard listeners (`#addKeyboardListeners` uses `document.addEventListener` — DOM API). The `Controls` class couples construction with side effects via `#addKeyboardListeners()`, which is called during constructor for `KEYS` type.

**What CAN be tested:**

- `new Controls('DUMMY')` → `forward === true`, others false
- `new Controls('AI')` → all inputs false
- `new Controls('KEYS')` → all inputs false initially (`frozen` default false) — but listeners are attached as side effect
- `Controls.frozen` default is `false`
- `Controls.forward` / `.left` / `.right` / `.reverse` — can be set directly (no listener needed for AI)

For `KEYS` type, we can still construct it and verify initial state (the listeners are attached but won't fire without DOM events). The key insight: ALL control types produce the same initial state (all false), and `frozen` defaults to false. Only `DUMMY` has `forward: true`.

### 5. `tests/unit/panels/latchedToggle.test.ts`

**Source:** `ts/panels/latchedToggle.ts`

**Key surfaces to test:**

- `new LatchedToggle()` → `active === false`
- `setPhysicalHold(true)` → `active === true`
- `setPhysicalHold(false)` → after hold, active goes back to false
- `toggleLatch()` → toggles `active` on/off (latch persists after single call)
- `toggleLatch()` twice → back to `false`
- Combined: `setPhysicalHold(true)` + `toggleLatch()` → `active === true`; then `setPhysicalHold(false)` → still true (latched); then `toggleLatch()` → false
- `reset()` → clears both hold and latch → `active === false`
- `onChange` callback fires on every state change
- `onChange` does NOT fire when state doesn't change (e.g., double `setPhysicalHold(true)`)

### 6. `tests/unit/simulator/poolManager.edge.test.ts`

**Source:** `ts/simulator/training/genetics/poolManager.ts`

**Already tested functions (from `poolManager.test.ts`):** `brainsCompatible`, `inferHiddenLayers`, `getTopAICars`, `getTopCarInfoPool`

**Missing coverage to add:**

- `getSortedAICars()` — filters out KEYS, sorts by fitness descending
- `getSortedAICars()` — empty array → empty result
- `getSortedAICars()` — all KEYS → empty result
- `getSortedAICars()` — equal fitness → stable-ish (order undefined but both present)
- `applyPoolToCars()` — empty pool → no change to cars
- `applyPoolToCars()` — pool with compatible brains → brains copied to AI cars
- `applyPoolToCars()` — KEYS cars skipped
- `applyPoolToCars()` — pool with incompatible brains → falls through to mutateFromPool (or skip)
- `applyPoolToCars()` — when `aiIndex < brains.length`, brain copied directly; else `mutateFromPool`
- `getTopAICars()` — with fitness ties (both same fitness, both should be present)
- `getTopAICars()` — more AI cars than k, top k returned
- `createCarsForTraining()` — creates correct count, assigns type, uses config params

**Note:** `createCarsForTraining` creates real `Car` instances, which require Sensor/Controls/Physics constructor. This uses the full Car constructor (DOM-free). Verify it works in Node.js — if Car constructor throws due to missing DOM, skip this test and mark as Phase 2.

### 7. `tests/unit/math/osm-importer/osm.test.ts`

**Source:** `ts/math/osm-importer/osm.ts`

**Key surfaces to test:**

- `Osm.parseRoads(data)` — valid data with nodes + ways → returns `{points, segments}` with correct counts
- `Osm.parseRoads(data)` — one-way tagged ways → segment is one-way
- `Osm.parseRoads(data)` — `lanes: "1"` → auto one-way
- `Osm.parseRoads(data)` — `junction: "roundabout"` → one-way
- `Osm.parseRoads(data)` — no nodes → empty result with console.warn
- `Osm.parseRoads(data)` — missing node references in a way → warning logged, segment skipped
- `Osm.parseRoads(data)` — coordinate conversion produces valid Points with x,y

**Test data:**

```typescript
const simpleOsmData = {
  elements: [
    { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
    { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
    { type: 'way', id: 101, nodes: [1, 2], tags: { highway: 'residential' } },
  ],
};
```

### 8. `tests/unit/math/worldUnits.gaps.test.ts`

**Source:** `ts/math/worldUnits.ts`

**Gaps from existing coverage (93.8% lines, 88.9% functions):**

- Check which functions export lines are not covered: likely `formatKmhFromPxPerFrame`, `framesToSeconds` (reversal of `pxPerFrameToKmh` / `formatElapsedTime`)
- Add tests for uncovered boundaries

## File structure to create

```
tests/unit/
  car/
    physics/
      sensorRaycaster.test.ts       (new dir)
    loader/
      carLoader.test.ts             (new dir)
    controls/
      controls.test.ts              (new dir)
  panels/
    latchedToggle.test.ts           (new dir)
  simulator/
    trafficControlUtils.test.ts    (new)
    poolManager.edge.test.ts       (new)
  math/
    osm-importer/
      osm.test.ts                  (new dir)
    worldUnits.gaps.test.ts        (new)
```

## Acceptance criteria

- `npm test` — all 272 existing tests + ~56 new tests pass.
- `npm run test:coverage` — statements improve from 56.32% (target: ≥63%), branches from 42.7% (target: ≥48%)
- All new files pass `npm run lint` and `npm run format`.
- `tsc --noEmit` compiles clean.
- `AGENTS.md` updated (see docs step below).
- Each test file has:
  - `describe` block matching the module name
  - Individual `it()` cases with descriptive names
  - Edge cases covered (null, empty, boundary, degenerate)
  - No `Math.random` in assertions (use explicit known values)

## Docs to update

- `AGENTS.md` — update Testing section to list the new Phase 1 files/areas as extensions. No structural changes needed unless new patterns emerge.
- After Phase 1 completes, the knowledge graph should be rebuilt: `graphify update .`

## Implementation order (suggested)

1. `latchedToggle.test.ts` — simplest, warms up the pattern (6 tests, 42-line source)
2. `controls.test.ts` — also small
3. `sensorRaycaster.test.ts` — pure math, medium complexity
4. `carLoader.test.ts` — moderately complex (many edge cases)
5. `trafficControlUtils.test.ts` — needs mock world/car factories
6. `poolManager.edge.test.ts` — extends existing test patterns
7. `osm.test.ts` — standalone, moderate complexity
8. `worldUnits.gaps.test.ts` — fill remaining gaps
