# Integration Test for Car.update() Pipeline

**Date:** 2026-07-18
**Slug:** car-update-integration-test
**Entry points affected:** none (only `tests/unit/car/car.integration.test.ts` added)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Write an integration test for the full `Car.update()` pipeline. This is the most complex runtime flow in the project: steering → physics → sensor reading → brain inference → engine sync. Unit tests cover isolated pieces, but no test exercises the full pipeline end-to-end.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, especially the Car architecture rules:
  - `Car.update()` decomposed into `#applySteering()`, `this.physics.update()`, `#processBrain()`, `#syncEngine()`
  - `CarBrainAdapter.buildInput()` — static method for building input vectors
  - `NeuralNetwork.feedForward()` — binary step activation
  - `CarPhysics.update()` — mutates car state
  - Sensor decoupled — `Sensor.update(x, y, angle, polygons, trafficControls)`
- Current test coverage: `car.ts` is at 92%, but tests are unit-level (isolated methods).
- Key files:
  - `ts/car/car.ts` — `Car` class
  - `ts/car/sensors/sensor.ts` — `Sensor` class
  - `ts/car/brain/carBrainAdapter.ts` — bridge between car and network
  - `ts/car/physics/carPhysics.ts` — state update
  - `ts/car/controls/controls.ts` — control handling
  - `ts/neural-network/network.ts` — `NeuralNetwork`
  - `ts/math/collision.ts` — `polysIntersect`, `nearestEdgeOffset`
  - `tests/helpers/setupImageMock.ts` — Image mock for Car construction
  - `tests/helpers/makeKnownNetwork.ts` — deterministic network construction
- `tests/unit/car/car.test.ts` — existing car tests (92% coverage)

## Architecture rules for tests

1. **Import `setupImageMock()` before any Car import** — the `Car` constructor triggers `CarRenderer` which calls `new Image()`.
2. **Use `makeKnownNetwork`** for deterministic brain construction.
3. **No canvas/DOM** — the integration test doesn't render anything, just checks state transitions.
4. **Deterministic** — use known coordinates, known network weights, known road borders.

## Scope

### In scope

- `tests/unit/car/car.integration.test.ts` — the integration test file.
- Tests that exercise the full `update()` pipeline with:
  - A car with a known brain facing known road borders
  - Assertions on position change, rotation change, damage state
  - DUMMY and AI control types
  - Sensor readings with stateAware=false and stateAware=true
  - Traffic control perception integration

### Out of scope

- Tests that require canvas rendering (e.g., `Sensor.draw()`) — deferred to visual regression tests.
- Tests involving `Controls` KEYS type (requires `document.addEventListener`).
- Tests for `CarLoader`, `CarRenderer`, or DOM-dependent modules.
- Tests involving localStorage, file I/O, or network.

## Implementation

### 1. Read existing files first

Before writing tests, read these files to understand the exact API:

```bash
# Read the Car class
grep -n "class Car\|constructor\|update\|setCallbacks\|setAutopilot\|respawn\|toDrawData\|toInfo\|#applySteering\|#processBrain\|#syncEngine" ts/car/car.ts

# Read the Sensor class
grep -n "class Sensor\|constructor\|update\|encodeTrafficState\|draw\|#getReading\|#castRay" ts/car/sensors/sensor.ts

# Read CarBrainAdapter
grep -n "class CarBrainAdapter\|buildInput\|computeControls\|brainsCompatible\|inputLayerSize\|createBrain\|serialize\|deserialize" ts/car/brain/carBrainAdapter.ts
```

Use `graphify query` or `grep` to map the full signatures.

### 2. Read `tests/unit/car/car.test.ts` for patterns

Check how existing car tests set up mocks and construct cars:

```bash
head -30 tests/unit/car/car.test.ts
```

### 3. Create `tests/unit/car/car.integration.test.ts`

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';

// Mock Image before any Car import
beforeAll(() => setupImageMock());

describe('Car.update() integration', () => {
  describe('DUMMY car (no brain, no movement)', () => {
    it('stays in place when no controls are applied', async () => {
      const { Car } = await import('../../../ts/car/car.js');
      const car = new Car(100, 200, 0, 'DUMMY');
      const initialPos = { x: car.x, y: car.y };

      car.update([], []); // No road borders, no traffic controls

      expect(car.x).toBe(initialPos.x);
      expect(car.y).toBe(initialPos.y);
      expect(car.damaged).toBe(false);
    });

    it('moves forward when controls specify forward', async () => {
      const { Car } = await import('../../../ts/car/car.js');
      const car = new Car(100, 200, -Math.PI / 2, 'DUMMY');
      car.controls.forward = true;

      car.update([], []);

      // Car should have moved (angle -pi/2 = facing "up" in screen coords = decreasing y)
      // We check direction rather than exact position due to physics complexity
      expect(car.y).toBeLessThan(200);
    });
  });

  describe('AI car with known brain', () => {
    it('brain produces controls that move the car', async () => {
      const { Car } = await import('../../../ts/car/car.js');
      const { NeuralNetwork } = await import('../../../ts/neural-network/network.js');

      // Create a brain that always outputs "forward" (index 0 = forward)
      // Network: rayCount=5 (legacy mode → 6 inputs) + speed → 6 + 1 = 7 inputs
      // Output: 4 (forward, left, right, reverse)
      const brain = new NeuralNetwork([7, 6, 4]);

      // Set weights/biases to produce forward=1, left=0, right=0, reverse=0
      // Output level: bias[0] = -1 (always fire forward), bias[1..3] = 1 (never fire others)
      brain.levels[brain.levels.length - 1].biases[0] = -1;
      brain.levels[brain.levels.length - 1].biases[1] = 1;
      brain.levels[brain.levels.length - 1].biases[2] = 1;
      brain.levels[brain.levels.length - 1].biases[3] = 1;

      const car = new Car(100, 200, -Math.PI / 2, 'AI');
      car.brain = brain;
      car.setCallbacks({
        onDamaged: () => {},
        onEngineUpdate: () => {},
      });

      const roadBorders: { p1: { x: number; y: number }; p2: { x: number; y: number } }[] = [];
      car.update(roadBorders, []);

      // Car should have moved forward
      expect(car.speed).toBeGreaterThan(0);
      expect(car.y).toBeLessThan(200);
      expect(car.damaged).toBe(false);
    });

    it('stops moving when damaged (collision with road border)', async () => {
      const { Car } = await import('../../../ts/car/car.js');
      const { NeuralNetwork } = await import('../../../ts/neural-network/network.js');

      const brain = new NeuralNetwork([7, 6, 4]);
      brain.levels[brain.levels.length - 1].biases[0] = -1; // Always forward
      brain.levels[brain.levels.length - 1].biases[1] = 1;
      brain.levels[brain.levels.length - 1].biases[2] = 1;
      brain.levels[brain.levels.length - 1].biases[3] = 1;

      const car = new Car(500, 500, 0, 'AI');
      car.brain = brain;
      car.setCallbacks({
        onDamaged: () => {},
        onEngineUpdate: () => {},
      });

      // Place borders directly around the car to force collision
      // Car at (500,500), heading right (angle=0)
      // Place a vertical wall immediately to the right
      const roadBorders = [
        { p1: { x: 510, y: 480 }, p2: { x: 510, y: 520 } },
        { p1: { x: 490, y: 480 }, p2: { x: 490, y: 520 } }, // Left border
      ];

      // Run several update frames to ensure collision
      for (let i = 0; i < 10; i++) {
        car.update(roadBorders, []);
      }

      // After collision, car should be damaged and stopped
      expect(car.damaged).toBe(true);
      expect(car.speed).toBe(0);
    });

    it('sensor readings affect brain inputs', async () => {
      const { Car } = await import('../../../ts/car/car.js');
      const { NeuralNetwork } = await import('../../../ts/neural-network/network.js');
      const { CarBrainAdapter } = await import(
        '../../../ts/car/brain/carBrainAdapter.js'
      );

      // Replace the car's sensor to have known ray count
      const car = new Car(500, 500, 0, 'AI');
      // Read car.sensor.rayCount to know the input size

      // Create road borders close to the car so sensor readings are high
      const roadBorders = [
        // Wall very close on the right
        { p1: { x: 520, y: 400 }, p2: { x: 520, y: 600 } },
      ];

      // Build input from the car's perspective
      const sensorReadings = CarBrainAdapter.buildInput(
        car.sensor.readings,
        car.speed,
        car.maxSpeed,
        car.sensor.stateAware,
      );

      // At least some readings should be non-zero (wall is detected)
      const hasDetections = sensorReadings.slice(0, -1).some(r => r < 1);
      // (slice off speed reading at the end)
      expect(hasDetections).toBe(true);
    });
  });

  describe('AI car with state-aware sensor', () => {
    it('state-aware sensor produces longer input vector', async () => {
      // Test that switching stateAware changes input layer size
      // and that update() doesn't crash with stateAware=true
      // Create car with new construction that sets stateAware
      // ... (depends on actual Car constructor API)
    });
  });
});
```

**Note:** The above is a template. Before writing, read the actual `Car` constructor, `sensor` class, and `CarBrainAdapter` APIs to get exact parameter lists and type signatures. The test must compile and pass.

### 4. Run tests

```bash
npm test -- -t "Car.update"
```

This runs only tests matching the pattern.

### 5. Fix any issues

If tests don't compile or pass, check:

- `Car` constructor parameters — may include `maxSpeed`, `acceleration`, `friction`, `sensorConfig`
- `Sensor` ray count — default may differ from the assumed 5
- `CarBrainAdapter.buildInput()` signature — may take different parameters
- `car.brain` — may be a private field accessed via getter/setter
- `car.sensor` — check if it's public or accessed via getter

### 6. Run full test suite

```bash
npm test
npm run fix:all
```

## Acceptance criteria

- `npm test` passes with all new integration tests green.
- Coverage for `car.ts` remains >= 90%.
- The integration test exercises:
  - DUMMY car staying still
  - DUMMY car moving with controls
  - AI car with known brain moving
  - AI car colliding and becoming damaged
  - Sensor readings integrated into brain inputs
- `npm run fix:all` passes.

## Gotchas

- **`Car.brain` is `#brain` (private)** — `AGENTS.md` says `brain = unknown` opaque type. Check if there's a public getter/setter or if you need to access it differently. From the existing tests, it may be exposed as `car.brain` (public) or via a method.
- **`Car.sensor`** — similarly, check if `sensor` is public or private.
- **`CarPhysics.update()`** — the physics module is stateless; it takes `carState` and `controlsState`. The actual `Car.update()` calls `this.physics.update(this, this.controls)`. Your test just calls `car.update()` and checks results — you don't call physics directly.
- **`Car.setCallbacks()`** — must be called before `update()` if the car has `onDamaged` or `onEngineUpdate` callbacks that could throw.
- **`Sensor` constructor parameters** — `Sensor` may be constructed with `(rayCount, stateAware)` or similar. Read the actual `Sensor` class.
- **`makeKnownNetwork`** — use this helper for deterministic weights instead of manually setting biases. Check its signature: `makeKnownNetwork(layerCounts, weights, biases)`.

## Docs to update

- None (the integration test is self-contained).
