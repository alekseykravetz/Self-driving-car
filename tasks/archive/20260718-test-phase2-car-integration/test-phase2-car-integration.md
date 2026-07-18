# Phase 2: Car Integration Tests

**Date:** 2026-07-18
**Slug:** test-phase2-car-integration
**Entry points affected:** none — only `tests/` and `tests/helpers/` added
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Extend test coverage from ~58.6% to ~72% by adding integration tests for the `Car` class and its core collaborators (Sensor, Physics, Brain, Controls). The Car class is the most important untested module — it's 587 lines at 0% coverage.

## Strategy: global mock for `Image`

`CarRenderer` constructor calls `new Image()`, which throws in Node.js. We'll mock `globalThis.Image` as a no-op class in a shared test setup file, loaded before any Car test. This approach:

- **Zero production code changes** — no refactoring needed
- **Simple** — one-time setup, all Car tests use it
- **Safe** — the mock is minimal (just makes construction possible) and is scoped to test files

**Key insight:** Only `CarRenderer.#getSharedImage()` and `CarRenderer.draw()` depend on DOM/Canvas. The `draw()` method is NOT called by `update()`, `load()`, or any other logic method — only by `Car.draw()` which we do NOT test in Phase 2.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules.
- `tasks/test-phase1-quick-wins.md` (archived) — prior patterns for test factories, conventions.
- `tests/unit/car/carPhysics.test.ts` — state factory pattern.
- `tests/unit/car/carBrainAdapter.test.ts` — brain factory pattern.
- `tests/helpers/makeKnownNetwork.ts` — deterministic network construction.

### Source files to read before implementing

- `ts/car/car.ts` (587 lines) — the main class under test.
- `ts/car/sensors/sensor.ts` (263 lines) — Sensor.update() + SensorReading logic.
- `ts/car/brain/carBrainAdapter.ts` (112 lines) — buildInput, computeControls.
- `ts/car/physics/carPhysics.ts` — CarPhysics.update().
- `ts/car/controls/controls.ts` — Controls types and frozen flag.
- `ts/car/config.ts` — constants.
- `ts/car/rendering/carRenderer.ts` (144 lines) — only to understand `Image` dependency; NOT tested.

## Architecture rules

Same as Phase 1:

1. `.js` import extensions.
2. No DOM/Canvas in test assertions.
3. One concern per test file.
4. Deterministic tests — use `makeKnownNetwork` for brains.
5. `npm run fix:all` before commit.

## Scope

### In scope

| #   | Test file                                           | Est. tests | What it covers                                    |
| --- | --------------------------------------------------- | ---------- | ------------------------------------------------- |
| 1   | `tests/helpers/setupImageMock.ts`                   | —          | Shared mock for `globalThis.Image`                |
| 2   | `tests/unit/car/car.test.ts`                        | ~35        | Car construction, state, methods, update pipeline |
| 3   | `tests/unit/car/sensors/sensor.test.ts`             | ~15        | Sensor.update() without draw, stateAware encoding |
| 4   | `tests/unit/car/controls/controls.test.ts` (extend) | +4         | Remaining Controls edge cases                     |

#### Detailed test breakdown

### 1. `tests/helpers/setupImageMock.ts`

```typescript
/**
 * Mock for HTMLImageElement for Node.js unit tests.
 * CarRenderer constructor calls new Image(), which doesn't exist in Node.
 * Import this before any Car import to make construction possible.
 */
export function setupImageMock(): void {
  if (typeof globalThis.Image !== 'undefined') return; // already set

  class MockImage {
    src: string = '';
    complete: boolean = true;
    naturalWidth: number = 1;
    naturalHeight: number = 1;
    onload: (() => void) | null = null;
    constructor(width?: number, height?: number) {}
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
    getAttribute() {
      return null;
    }
  }

  globalThis.Image = MockImage as unknown as typeof Image;
  globalThis.HTMLImageElement = MockImage as unknown as typeof HTMLImageElement;
}
```

### 2. `tests/unit/car/car.test.ts`

**Setup:**

```typescript
import { setupImageMock } from '../../helpers/setupImageMock.js';
setupImageMock(); // Must run before any Car constructor call

import { Car } from '../../../ts/car/car.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';
```

**Test groups:**

#### Construction

| Test                                           | What it verifies                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| DUMMY type creates car with default properties | `x`, `y`, `width`, `height`, `speed=0`, `damaged=false`, `fitness=0`         |
| DUMMY type has no sensor or brain              | `car.sensor` undefined, `car.brain` undefined                                |
| AI type creates car with sensor and brain      | `car.sensor` exists, `car.brain` exists                                      |
| AI type uses correct layer sizes               | Brain input = `rayCount+1` for legacy, hidden layers from config, output = 4 |
| Custom options override defaults               | Custom `width`, `height`, `maxSpeed`, `acceleration`, `friction`             |
| KEYS type construction                         | Creates with sensor + brain (same as AI), controls type = KEYS               |

#### toInfo() / toDrawData()

| Test                                    | What it verifies                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `toInfo()` returns correct structure    | `maxSpeed`, `friction`, `acceleration`, `width`, `height`, `hiddenLayers`, `sensor` |
| `toInfo()` brain is serialized          | `info.brain` is defined for AI car                                                  |
| `toInfo()` brain is undefined for DUMMY | DUMMY has no brain → `info.brain` undefined                                         |
| `toDrawData()` returns correct shape    | `polygon`, `color`, `damaged`, `x`, `y`, `angle`, `width`, `height`                 |
| `toDrawData()` sensor reference         | Same sensor object                                                                  |

#### load(info)

| Test                                                     | What it verifies                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Load brain updates car brain                             | New brain loaded → `car.brain` has different weights                        |
| Load with no brain -> brain unchanged                    | `info` without `brain` → existing brain preserved                           |
| Load changes dimensions                                  | `width`/`height` changed → `car.polygon` recalculated                       |
| Load changes sensor config                               | `rayCount`, `raySpread`, `rayLength`, `rayOffset`, `stateAware` all applied |
| Load with changed sensor + no brain -> new brain created | Fresh brain with correct input layer size                                   |
| Brain desync guard clears incompatible brain             | Load sensor config changes input layer size → existing brain cleared        |
| Brain desync guard keeps compatible brain                | Same sensor config → brain preserved                                        |
| Load applies hiddenLayers                                | Car.hiddenLayers updated                                                    |

#### setAutopilot() / setLearningFromHuman()

| Test                                       | What it verifies                                              |
| ------------------------------------------ | ------------------------------------------------------------- |
| `setAutopilot(true)` freezes controls      | `car.controls.frozen === true`                                |
| `setAutopilot(true)` on DUMMY no-op        | DUMMY controls are not `Controls` instance → no frozen change |
| `setAutopilot(false)` clears controls      | All control flags reset to false                              |
| `get autopilot()` returns correct value    | True after enable, false after disable                        |
| `setLearningFromHuman(true)` getter works  | `car.learningFromHuman === true`                              |
| `setLearningFromHuman(false)` getter works | `car.learningFromHuman === false`                             |

#### setCallbacks()

| Test                               | What it verifies                                               |
| ---------------------------------- | -------------------------------------------------------------- |
| Setting callbacks doesn't throw    | `car.setCallbacks({onDamaged: () => {}})`                      |
| onDamaged fires on collision       | Create car, set callback, collide → callback invoked           |
| onEngineUpdate fires during update | Speed changes trigger engine callback with `(speed, maxSpeed)` |

#### respawn()

| Test                         | What it verifies             |
| ---------------------------- | ---------------------------- |
| Respawn resets position      | New x, y applied             |
| Respawn resets speed         | Speed back to 0              |
| Respawn clears damage        | Damaged → false              |
| Respawn recalculates polygon | Polygon matches new position |

#### update() — DUMMY car (physics only)

| Test                        | What it verifies                         |
| --------------------------- | ---------------------------------------- |
| DUMMY update moves forward  | Speed increases, position changes        |
| DUMMY update with collision | Collision → damaged flag, callback fires |

#### update() — AI car (full pipeline)

| Test                                        | What it verifies                                               |
| ------------------------------------------- | -------------------------------------------------------------- |
| AI update with known brain drives correctly | Brain outputs known controls → car moves in expected direction |
| AI car sensor updates each frame            | `sensor.readings` populated after update                       |
| AI car polygon recalculated                 | Polygon array updated                                          |
| AI car with polygons — collision detection  | Border wall → damaged                                          |

#### Private methods (via public methods)

| Test                                    | What it verifies                                         |
| --------------------------------------- | -------------------------------------------------------- |
| `#applySteering()` at zero speed no-ops | `car.speed=0` → `car.angle` unchanged even with controls |
| `#applySteering()` steers left          | Left control with forward speed → angle increases        |
| `#applySteering()` steers right         | Right control with forward speed → angle decreases       |
| `#syncEngine()` fires callback          | Engine callback fires during update                      |

#### learningRate

| Test                       | What it verifies                              |
| -------------------------- | --------------------------------------------- |
| Default learning rate      | `car.learningRate` is 0.1 (or DEFAULT)        |
| Set learning rate          | `car.learningRate = 0.5` → getter returns 0.5 |
| `setLearningRate()` method | Alternate setter works                        |

#### Edge cases

| Test                         | What it verifies                   |
| ---------------------------- | ---------------------------------- |
| Update with empty polygons   | No crash, car moves                |
| Update with traffic controls | Car doesn't crash with extra param |
| Update with other cars       | Car processes other car polygons   |

### 3. `tests/unit/car/sensors/sensor.test.ts`

**Setup:** No Image mock needed — Sensor has no DOM dependency in constructor. Only `Sensor.draw()` uses Canvas.

**Test groups:**

| Test                                             | What it verifies                         |
| ------------------------------------------------ | ---------------------------------------- |
| Constructor with defaults                        | Uses DEFAULT_CAR_CONFIG values           |
| Constructor with custom config                   | All parameters applied                   |
| `update()` populates rays                        | `sensor.rays` has `rayCount` entries     |
| `update()` populates readings                    | `sensor.readings` has `rayCount` entries |
| `update()` with borders — rays intersect         | Closest border hit found                 |
| `update()` with no borders — all null            | No obstacles → null readings             |
| `update()` stateAware=false                      | `sensorReadings` all null                |
| `update()` stateAware=true with traffic controls | sensorReadings populated with state data |
| `update()` stateAware=true with other cars       | sensorReadings pick up car as nearest    |
| `update()` multiple calls — readings refresh     | New readings replace old                 |
| `encodeTrafficState()` — red returns 1           | Known mapping                            |
| `encodeTrafficState()` — yellow returns 0.5      | Known mapping                            |
| `encodeTrafficState()` — green returns 0         | Known mapping                            |
| `encodeTrafficState()` — null returns 0          | Default                                  |

**Mock factories:**

```typescript
function makeSquare(cx: number, cy: number, size: number = 20): Point[] {
  return [
    { x: cx - size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy + size / 2 } as Point,
    { x: cx - size / 2, y: cy + size / 2 } as Point,
  ];
}
```

### 4. Extend `tests/unit/car/controls/controls.test.ts`

**Additional tests:**

| Test                                        | What it verifies                        |
| ------------------------------------------- | --------------------------------------- |
| `Controls.frozen` can be set to `true`      | Frozen flag is mutable                  |
| `Controls.frozen` persists                  | Set frozen → verify stays true          |
| `Controls` properties individually writable | Set forward/left/right/reverse directly |

## Out of scope (Phase 3+)

- `Car.draw()` — requires CanvasRenderingContext2D.
- `Sensor.draw()` — requires CanvasRenderingContext2D.
- `CarRenderer` — Canvas-dependent, deferred to visual regression testing.
- `Car.#processBrain()` replay buffer / trainBatch — requires NeuralNetwork trainStep which is already tested in Phase 0.
- Full simulator integration (SimulatorShell + Car + World).
- Human backprop flow (learning from human, autopilot + replay).
- PhoneControls / CameraControls (different control types).

## Approximate file structure

```
tests/
  helpers/
    setupImageMock.ts               (NEW)
    makeKnownNetwork.ts             (existing)
  unit/
    car/
      car.test.ts                   (NEW — ~400 lines)
      sensors/
        sensor.test.ts              (NEW — ~200 lines)
      controls/
        controls.test.ts            (EXTEND — +4 tests)
```

## Acceptance criteria

- `npm test` — all existing tests (~365) + new tests pass.
- `npm run test:coverage` — Car class from 0% to ≥55%, Sensor from 3.3% to ≥60%.
- Overall statements ≥70% (target).
- All new files pass `npm run lint` and `npm run format`.
- `tsc --noEmit` compiles clean.
- `AGENTS.md` updated with Phase 2 test coverage notes.
- No production code changed.
- `html/simulator.html` still works (no test artifacts in production).

## Docs to update

- `AGENTS.md` — add Phase 2 modules to Testing section.
- Update the coverage note with new numbers.

## Implementation order

1. `tests/helpers/setupImageMock.ts` — shared mock, simplest file
2. `tests/unit/car/sensors/sensor.test.ts` — pure logic, no Image mock needed
3. `tests/unit/car/car.test.ts` — the big one (35+ tests)
4. Extend `tests/unit/car/controls/controls.test.ts` — quick additions
5. Verify all tests pass
6. Run `npm run fix:all`
7. Update AGENTS.md
