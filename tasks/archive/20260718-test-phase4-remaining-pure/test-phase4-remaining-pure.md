# Phase 4: Remaining Pure-Logic Module Tests

**Date:** 2026-07-18
**Slug:** test-phase4-remaining-pure
**Entry points affected:** none — only `tests/` + `ts/store/storeManager.ts` (export helpers)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Cover the last remaining pure-logic modules that are testable in Node.js without DOM. After this phase, all truly testable surfaces will be covered — remaining uncovered code is Canvas rendering, DOM events, Web APIs, or editor infrastructure that requires Playwright/jsdom.

## Strategy

Same as prior phases: mock DOM dependencies where necessary (`localStorage` for StoreManager, `Image` for Car-dependent modules, `Viewport` for scaleIndicator), and export module-scoped helpers where practical.

## Scope

| #         | Test file                                                     | Est. tests | Source                                           | Lines | Purity                                 |
| --------- | ------------------------------------------------------------- | ---------- | ------------------------------------------------ | ----- | -------------------------------------- |
| 1         | `tests/unit/simulator/spatialGridUtils.test.ts`               | ~10        | `ts/simulator/spatialGridUtils.ts`               | 98    | ✅ Pure functions                      |
| 2         | `tests/unit/store/storeManager.test.ts`                       | ~15        | `ts/store/storeManager.ts`                       | 565   | ⚠️ Helpers + class (mock localStorage) |
| 3         | `tests/unit/viewport/scaleIndicator.test.ts`                  | ~6         | `ts/viewport/scaleIndicator.ts`                  | 130   | ⚠️ update() pure (mock Viewport)       |
| 4         | `tests/unit/simulator/training/modes/borderCollision.test.ts` | ~6         | `ts/simulator/training/modes/borderCollision.ts` | 51    | ✅ Pure mutation (mock Car)            |
| **Total** |                                                               | **~37**    |                                                  |       |                                        |

### Out of scope

- `simpleModeBehavior.ts` — deeply coupled to DOM (Viewport, Camera, MiniMap, Car rendering).
- `worldModeBehavior.ts` — same, coupled to DOM.
- `trafficFactory.ts` — creates `new Car()` (needs Image mock but is trivial wrapper).
- `cameraControls.ts` / `phoneControls.ts` / `markerDetector.ts` — 100% DOM/Web API.
- `storePanel.ts` / `store templates` — Custom Elements + DOM.
- `simulatorShell.ts` + all simulator subclasses — full DOM integration.
- `worldGenerator.ts` — generates World which includes Canvas draw methods.
- All `draw()` methods across the codebase.

## Implementation

### 1. `tests/unit/simulator/spatialGridUtils.test.ts`

**Source:** `ts/simulator/spatialGridUtils.ts`

No DOM dependencies. Pure functions operating on plain data:

- `buildRoadBorders(world)` — roadBorders + separatorBorders + corridor borders flattened
- `buildRoadBorders(world)` — empty arrays → empty result
- `buildRoadBorders(world)` — no corridors → no corridor borders
- `pointToSegmentDistanceSq(px, py, ax, ay, bx, by)` — point on segment → 0
- `pointToSegmentDistanceSq(px, py, ax, ay, bx, by)` — point off segment end → squared distance
- `pointToSegmentDistanceSq` — point perpendicular to segment midpoint → known distance
- `pointToSegmentDistanceSq` — zero-length segment → distance to endpoint
- `queryBordersNearCar(grid, car)` — car near grid → matching borders
- `queryBordersNearCar(grid, car)` — car far → empty
- `queryBordersNearCar(grid, car)` — car without sensor → fallback MIN_RANGE=100

**Factory:**

```typescript
function makeMockWorld(
  overrides?: Partial<{
    roadBorders: Segment[];
    separatorBorders: Segment[];
    corridors: { borders: Segment[] }[];
  }>,
): IWorld {
  return {
    roadBorders: overrides?.roadBorders ?? [],
    separatorBorders: overrides?.separatorBorders ?? [],
    corridors: overrides?.corridors ?? [],
  } as IWorld;
}

function makeMockCar(
  overrides?: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    sensor: { rayLength: number } | null;
  }>,
) {
  return {
    x: overrides?.x ?? 0,
    y: overrides?.y ?? 0,
    width: overrides?.width ?? 25,
    height: overrides?.height ?? 63,
    sensor: overrides?.sensor ?? { rayLength: 200 },
  } as Car;
}
```

### 2. `tests/unit/store/storeManager.test.ts`

**Source:** `ts/store/storeManager.ts`

**Production change:** Export the pure helper functions at module top level with `@internal` JSDoc:

```typescript
/** @internal Exported for testing only. */
export function smGenId(): string { ... }

/** @internal Exported for testing only. */
export function smWorldMarkers(data: object): { hasStartMarker: boolean; hasEndMarker: boolean } { ... }

/** @internal Exported for testing only. */
export function smPersist(key: string, value: unknown, name: string): void { ... }

/** @internal Exported for testing only. */
export function smNormalizeWorldId(raw: string): string { ... }

/** @internal Exported for testing only. */
export function smReadActiveCarIds(): string[] { ... }

/** @internal Exported for testing only. */
export function smCountItems(key: string, value: string): number | null { ... }
```

**Testing the helper functions:**

| Test                                            | What it verifies                             |
| ----------------------------------------------- | -------------------------------------------- |
| `smGenId()` returns non-empty string            | Basic generation works                       |
| `smGenId()` consecutive calls differ            | Uniqueness                                   |
| `smWorldMarkers()` with start marking           | `hasStartMarker: true`                       |
| `smWorldMarkers()` with target marking          | `hasEndMarker: true`                         |
| `smWorldMarkers()` with no markings             | Both false                                   |
| `smWorldMarkers()` with empty markings array    | Both false                                   |
| `smPersist()` stores to localStorage            | `localStorage.setItem` called with JSON data |
| `smPersist()` on QuotaExceededError             | Warning logged, no throw                     |
| `smNormalizeWorldId('editor')`                  | Returns 'editor'                             |
| `smNormalizeWorldId('store:foo')`               | Returns 'store:foo'                          |
| `smNormalizeWorldId('loaded:x')`                | Returns 'loaded:x'                           |
| `smNormalizeWorldId('circle.world')`            | Returns 'store:circle.world' (legacy)        |
| `smReadActiveCarIds()` with stored array        | Returns parsed array                         |
| `smReadActiveCarIds()` with stored plain string | Returns legacy single-element array          |
| `smReadActiveCarIds()` with nothing stored      | Returns empty array                          |
| `smCountItems('bestPool', '[1,2,3]')`           | Returns 3                                    |
| `smCountItems('bestPool', 'not-array')`         | Returns null                                 |
| `smCountItems('editorWorld', '...')`            | Returns null (not in array keys)             |

**Testing the class with localStorage mock:**

```typescript
// Mock localStorage globally
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k in store) delete store[k];
  },
  get length() {
    return Object.keys(store).length;
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
});
```

| Test (class)                                      | What it verifies                               |
| ------------------------------------------------- | ---------------------------------------------- |
| `getAllWorlds()` with editor world + store worlds | Returns correct order: loaded → editor → store |
| `getAllCars()` with loaded + store cars           | Returns correct order                          |
| `getActiveWorldId()` with stored id               | Normalized and returned                        |
| `setActiveWorldId()` stores to localStorage       | `localStorage.setItem` called                  |
| `toggleActiveCarId()` add new                     | Id appended                                    |
| `toggleActiveCarId()` remove existing             | Id removed                                     |
| `getActiveCars()`                                 | Returns matching CarInfo objects               |
| `getLocalStorageStates()`                         | Returns tracked keys with sizes                |
| Static convenience methods                        | Delegate to instance correctly                 |

### 3. `tests/unit/viewport/scaleIndicator.test.ts`

**Source:** `ts/viewport/scaleIndicator.ts`

The key pure method is `update()` which calculates `pixelsPerMeter`, `barLength`, and `position` from the viewport state.

**Mock Viewport:**

```typescript
function makeMockViewport(pixelsPerMeter: number = 1, zoom: number = 1) {
  return {
    getPixelsPerMeter: () => pixelsPerMeter,
    getZoom: () => zoom,
  } as Viewport;
}
```

| Test                            | What it verifies                                        |
| ------------------------------- | ------------------------------------------------------- |
| `update()` with basic params    | `barLength = pixelsPerMeter * scaleInMeters`            |
| `update()` with height change   | position.y updated to canvasHeight - paddingY           |
| `update()` with different scale | 20m scale → double bar length                           |
| `update()` with zoom multiplier | pixelsPerMeter adjusted                                 |
| Constructor defaults            | Default values set correctly (paddingX, paddingY, etc.) |

### 4. `tests/unit/simulator/training/modes/borderCollision.test.ts`

**Source:** `ts/simulator/training/modes/borderCollision.ts`

Pure mutation — modifies car position/angle/damaged. We need a Car-like object. Since the function accesses `car.polygon`, `car.x`, `car.y`, `car.angle`, `car.damaged`, we need a polygon that overlaps the given segment.

**Key insight:** We can either:
a) Build a real Car with Image mock (like Phase 2 tests)
b) Create a plain object with the required interface

Option (b) is simpler if TypeScript doesn't complain:

```typescript
function makeMockCar(x: number, y: number, angle: number): Car {
  return {
    x,
    y,
    angle,
    damaged: false,
    width: 25,
    height: 63,
    speed: 1,
    polygon: CarPhysics.prototype.createPolygon({
      x,
      y,
      angle,
      width: 25,
      height: 63,
    } as CarState),
    // ... more fields
  } as Car;
}
```

The `polygon` is the critical part — it needs to be a Point[] that the function can project onto the segment. Using `CarPhysics.createPolygon` with a state object should work.

Actually simpler: we already have the `setupImageMock` pattern from Phase 2. We can build a real DUMMY Car and use it.

| Test                                                            | What it verifies                             |
| --------------------------------------------------------------- | -------------------------------------------- |
| `handleCollisionWithRoadBorders()` with no borders              | No-op                                        |
| `handleCollisionWithRoadBorders()` with overlapping segment     | Car position corrected, damaged set to false |
| `handleCollisionWithRoadBorders()` with non-overlapping segment | No change                                    |
| `handleCollisionWithRoadBorders()` corrector index logic        | Angle adjusted correctly                     |

## Production changes

Two changes needed:

1. **`ts/store/storeManager.ts`** — add `export` keyword to 6 helper functions with `@internal` JSDoc
2. No other changes needed — all other modules are already consumable from tests

## File structure

```
tests/
  unit/
    simulator/
      spatialGridUtils.test.ts          (NEW)
      training/
        modes/
          borderCollision.test.ts       (NEW)
    store/
      storeManager.test.ts              (NEW)
    viewport/
      scaleIndicator.test.ts            (NEW dir)
```

## Acceptance criteria

- `npm test` — all 530 existing + 37 new = 567 tests pass.
- `npm run test:coverage` — verify:
  - `spatialGridUtils.ts` from 0% to ≥95%
  - `storeManager.ts` helper functions ≥90%, class methods ≥50%
  - `scaleIndicator.ts` `update()` method covered
  - `borderCollision.ts` from 0% to ≥85%
  - Overall non-draw coverage metrics improved
- All new files pass `npm run lint` and `npm run format`.
- `tsc --noEmit` compiles clean.
- `AGENTS.md` updated with Phase 4 coverage notes.

## Implementation order

1. `spatialGridUtils.test.ts` — simplest pure functions
2. `scaleIndicator.test.ts` — small module, needs mocked Viewport
3. `storeManager.test.ts` — needs localStorage mock + export production change
4. `borderCollision.test.ts` — needs Car construction (Image mock)
5. Update AGENTS.md, run fix:all, archive
