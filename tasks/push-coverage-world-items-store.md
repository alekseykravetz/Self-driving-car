# Push Coverage: World, Items, and Store Modules

**Date:** 2026-07-18
**Slug:** push-coverage-world-items-store
**Entry points affected:** none (only `tests/unit/` added to)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Expand test coverage for the `world/`, `world/items/`, `world/markings/`, and `store/` modules from current levels to 80%+ statements.

Current coverage in these areas:

| Module | Current % Stmts | Target | Uncovered lines |
|--------|----------------|--------|----------------|
| `world/world.ts` | 7% | 80% | 84-441 |
| `world/items/building.ts` | 25% | 80% | 46-134 |
| `world/items/tree.ts` | 34% | 80% | 145-257 |
| `world/markings/crossing.ts` | 63% | 80% | 27-32 |
| `world/markings/light.ts` | 30% | 80% | 52-103 |
| `world/markings/parking.ts` | 29% | 80% | 27-40 |
| `world/markings/start.ts` | 42% | 80% | 29-63 |
| `world/markings/stop.ts` | 29% | 80% | 28-40 |
| `world/markings/target.ts` | 40% | 80% | 18-20 |
| `world/markings/yield.ts` | 29% | 80% | 27-40 |
| `store/storeManager.ts` | 34% | 80% | 236-443, 479-556 |

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules.
- `vitest.config.ts` — Vitest v4, coverage with v8 provider.
- Existing test files for reference:
  - `tests/unit/world/world.test.ts` — helper functions tested, class methods missing
  - `tests/unit/world/items/building.test.ts` — existing building tests
  - `tests/unit/world/items/tree.test.ts` — existing tree tests
  - `tests/unit/world/markings/light.test.ts` — existing light tests
  - `tests/unit/world/markings/marking.test.ts` — base Marking class tests
  - `tests/unit/world/markings/markingSubtypes.test.ts` — existing marking subtype tests
  - `tests/unit/store/storeManager.test.ts` — existing StoreManager tests
  - `tests/unit/world/trafficManager.test.ts` — existing TrafficManager tests
  - `tests/unit/world/corridor.test.ts` — existing Corridor tests

- Key source files:
  - `ts/world/world.ts` — `World` class: save, load, generate, query methods
  - `ts/world/items/building.ts` — `Building` class
  - `ts/world/items/tree.ts` — `Tree` class
  - `ts/world/markings/*.ts` — `Marking` subtypes
  - `ts/store/storeManager.ts` — store management functions

## Architecture rules for tests

1. **No canvas/DOM** — these tests use pure logic. `World.draw()` is not tested here.
2. **Deterministic** — seed PRNGs where possible.
3. **Import with `.js` extension** — project convention.
4. **localStorage mocking** — for `storeManager` tests, mock `globalThis.localStorage` as needed (existing tests already do this in `storeManager.test.ts` — follow the same pattern).

## Scope

### In scope

- Expand `tests/unit/world/world.test.ts` — add tests for `World` instance methods.
- Expand `tests/unit/world/items/building.test.ts` — add coverage for building serialization, `load`, `loadFootprint`.
- Expand `tests/unit/world/items/tree.test.ts` — add coverage for tree prototype system, `buildTreePrototypes`, serialization.
- Expand `tests/unit/world/markings/light.test.ts` — add coverage for light state transitions, animation timers, `setState`.
- Expand `tests/unit/world/markings/markingSubtypes.test.ts` — add coverage for `Crossing`, `Parking`, `Start`, `Stop`, `Target`, `Yield` constructors and serialization.
- Expand `tests/unit/store/storeManager.test.ts` — add `StoreManager` class method coverage (the class, not just the helper functions).

### Out of scope

- `World.draw()` — covered by visual tests.
- `World` editor interactions (graph editing, marking placement) — manual testing.
- `Building.draw()` / `Tree.draw()` — visual tests.
- `TrafficManager` — already at 90% from Phase 3 tests.
- `Corridor` — already at 91% from Phase 3 tests.
- DOM-dependent modules (`WorldLoader`, `MarkingLoader`) — handled by the zero-coverage modules plan.

## Implementation

### 1. Read existing tests and source

```bash
# Read the existing files to understand what's already tested
head -80 tests/unit/world/world.test.ts
head -80 tests/unit/world/items/building.test.ts
head -80 tests/unit/world/items/tree.test.ts
head -80 tests/unit/world/markings/light.test.ts
head -80 tests/unit/world/markings/markingSubtypes.test.ts
head -80 tests/unit/store/storeManager.test.ts

# Read the source files to understand what's NOT tested
grep -n "export function\|export class\|export const\|export default" ts/world/world.ts
grep -n "export function\|export class\|export const\|export default" ts/world/items/building.ts
grep -n "export function\|export class\|export const\|export default" ts/world/items/tree.ts
grep -n "class\|function\|export" ts/store/storeManager.ts
```

### 2. Expand `tests/unit/world/world.test.ts`

Add sections for the `World` class methods:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

beforeAll(() => setupImageMock());

describe('World', () => {
  describe('constructor', () => {
    it('creates a world with a graph', async () => {
      const { World } = await import('../../../ts/world/world.js');
      const { Graph } = await import('../../../ts/math/graph/graph.js');
      const graph = new Graph();
      const world = new World(graph);
      expect(world.graph).toBe(graph);
    });
  });

  describe('save/load round-trip', () => {
    it('save() produces data that load() can restore', async () => {
      const { World } = await import('../../../ts/world/world.js');
      const { Graph } = await import('../../../ts/math/graph/graph.js');
      const { Point } = await import('../../../ts/math/primitives/point.js');
      const { Segment } = await import('../../../ts/math/primitives/segment.js');

      // Create a world with some content
      const graph = new Graph();
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));
      const world = new World(graph);

      // Save and load
      const saved = world.save();
      const loaded = World.load(saved);

      // Verify
      expect(loaded.graph.points.length).toBe(2);
      expect(loaded.graph.segments.length).toBe(1);
    });
  });

  describe('generate()', () => {
    it('generates a new world', async () => {
      const { World } = await import('../../../ts/world/world.js');
      const world = World.generate();
      expect(world).toBeDefined();
      expect(world.graph.points.length).toBeGreaterThan(0);
    });

    it('generate() twice with same seed produces equivalent worlds', async () => {
      const { World } = await import('../../../ts/world/world.js');
      const world1 = World.generate(42);
      const world2 = World.generate(42);
      expect(world1.graph.segments.length).toBe(world2.graph.segments.length);
    });
  });
});
```

**Important:** Verify the actual API:
- `World` constructor may take additional parameters (markings, corridor, etc.)
- `World.save()` — check return type
- `World.load()` — may be async, may be static
- `World.generate()` — read the actual signature

### 3. Expand `tests/unit/world/items/building.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Building', () => {
  describe('serialization', () => {
    it('load() creates Building from valid data', async () => {
      const { Building } = await import('../../../../ts/world/items/building.js');
      // Check Building.load() signature — may take world reference
      // ...
    });

    it('toFootprint() returns footprint data', async () => {
      // ...
    });
  });
});
```

**Important:** First read the actual `Building` class to understand `load()`, `loadFootprint()`, `toFootprint()` signatures and whether they need a `World` reference.

### 4. Expand `tests/unit/world/items/tree.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Tree', () => {
  describe('buildTreePrototypes', () => {
    it('returns deterministic prototypes for same seed', async () => {
      const { Tree } = await import('../../../../ts/world/items/tree.js');
      const { buildTreePrototypes } = Tree; // or direct import
      // ... test deterministic prototype generation
    });
  });

  describe('serialization', () => {
    it('load() reconstructs tree from data', async () => {
      // ...
    });
  });
});
```

### 5. Expand `tests/unit/world/markings/markingSubtypes.test.ts`

For each marking subtype (`Crossing`, `Parking`, `Start`, `Stop`, `Target`, `Yield`), add tests:

```typescript
import { describe, it, expect } from 'vitest';

describe('Marking subtypes', () => {
  // Each subtype should have a consistent pattern:
  // constructor(center, directionVector, width, height [, additional params])

  describe('Crossing', () => {
    it('constructor creates Crossing with correct type', async () => {
      const { Crossing } = await import('../../../../ts/world/markings/crossing.js');
      const crossing = new Crossing({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 3);
      expect(crossing.type).toBe('crossing');
      expect(crossing.center).toEqual({ x: 0, y: 0 });
    });

    it('borders returns polygon segments', async () => {
      // ...
    });
  });

  describe('Parking', () => {
    it('constructor creates Parking with correct type', async () => {
      const { Parking } = await import('../../../../ts/world/markings/parking.js');
      const parking = new Parking({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 3);
      expect(parking.type).toBe('parking');
    });
  });

  describe('Start', () => {
    it('constructor creates Start with correct type', async () => {
      const { Start } = await import('../../../../ts/world/markings/start.js');
      const start = new Start({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 3);
      expect(start.type).toBe('start');
    });
  });

  describe('Stop', () => {
    it('constructor creates Stop with correct type', async () => {
      const { Stop } = await import('../../../../ts/world/markings/stop.js');
      const stop = new Stop({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 3);
      expect(stop.type).toBe('stop');
    });
  });

  describe('Target', () => {
    it('constructor creates Target with correct type', async () => {
      const { Target } = await import('../../../../ts/world/markings/target.js');
      // Target may have different constructor signature
      // ...
      expect(target.type).toBe('target');
    });
  });

  describe('Yield', () => {
    it('constructor creates Yield with correct type', async () => {
      const { Yield } = await import('../../../../ts/world/markings/yield.js');
      const yieldSign = new Yield({ x: 0, y: 0 }, { x: 1, y: 0 }, 3, 3);
      expect(yieldSign.type).toBe('yield');
    });
  });
});
```

**Important:** Read each marking subtype file to understand the actual constructor signatures, which may differ from the template above.

### 6. Expand `tests/unit/store/storeManager.test.ts`

Add tests for the `StoreManager` class methods that are currently uncovered:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('StoreManager class', () => {
  let storeManager: StoreManager;

  beforeEach(async () => {
    // Mock localStorage
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      length: 0,
      key: vi.fn(() => null),
    } as unknown as Storage;

    const { StoreManager } = await import('../../../ts/store/storeManager.js');
    storeManager = new StoreManager();
  });

  describe('world management', () => {
    it('getAllWorlds returns world sources', async () => {
      const worlds = storeManager.getAllWorlds();
      expect(Array.isArray(worlds)).toBe(true);
      // Each world source has an id and name
      worlds.forEach(w => {
        expect(typeof w.id).toBe('string');
        expect(typeof w.name).toBe('string');
      });
    });

    it('importWorldFile uploads a world file', async () => {
      // This may require a DOM File mock — only test if mockable
    });
  });

  describe('active world/car tracking', () => {
    it('setActiveWorldId persists to localStorage', () => {
      storeManager.setActiveWorldId('test-world');
      expect(storeManager.getActiveWorldId()).toBe('test-world');
    });

    it('getWorldWorldId returns null when nothing set', () => {
      expect(storeManager.getActiveWorldId()).toBeNull();
    });
  });

  describe('car management', () => {
    it('toggleActiveCarId adds and removes ids', () => {
      storeManager.toggleActiveCarId('car-1');
      expect(storeManager.getActiveCarIds()).toContain('car-1');

      storeManager.toggleActiveCarId('car-1');
      expect(storeManager.getActiveCarIds()).not.toContain('car-1');
    });
  });
});
```

**Important:** Read the actual `StoreManager` class — the methods above may not match exactly. Adjust to the real API.

### 7. Run tests

```bash
npm test
npm run test:coverage
```

Check the coverage report to verify improvements:

```bash
npm run test:coverage | grep -E "world|store|markings|building|tree"
```

### 8. Iterate on uncovered lines

For any remaining uncovered lines, add targeted tests. Use the coverage HTML report for detailed line-by-line analysis:

```bash
open coverage/index.html
```

## Acceptance criteria

- `npm test` passes with all new tests green.
- Coverage for each target module increases:
  - `world/world.ts` >= 80% statements
  - `world/items/building.ts` >= 80%
  - `world/items/tree.ts` >= 80%
  - `world/markings/crossing.ts` >= 80%
  - `world/markings/light.ts` >= 80%
  - `world/markings/parking.ts` >= 80%
  - `world/markings/start.ts` >= 80%
  - `world/markings/stop.ts` >= 80%
  - `world/markings/target.ts` >= 80%
  - `world/markings/yield.ts` >= 80%
  - `store/storeManager.ts` >= 80%
- `npm run fix:all` passes.

## Gotchas

- **`World` constructor may need `setupImageMock()`** — if it creates any `Car` instances internally (e.g. for previews), import `setupImageMock()` before the `World` import.
- **`Building.load()` and `Tree.load()`** — these may require a `World` instance as context. Check the actual signature.
- **`Marking` subtypes** — some may have additional constructor parameters beyond the standard 4 (center, directionVector, width, height). Read each file.
- **`StoreManager`** — may depend on `localStorage` being set up in a specific way. Follow the pattern in existing `storeManager.test.ts`.
- **Import paths** — always use `.js` extension for both source and test file imports.

## Docs to update

- None (coverage improvement is internal).
