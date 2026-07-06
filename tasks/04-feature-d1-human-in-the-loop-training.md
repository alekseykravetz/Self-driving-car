# Feature D1: Human-in-the-Loop Training

**Priority:** 4 | **Effort:** Small | **Impact:** Medium | **Risk:** Low

## Core Concept

The KEYS car's brain (shaped by human driving) is injected into the genetic breeding pool, potentially becoming a parent for the next generation. The user "teaches by example."

## Target Files

- `ts/simulator/training/genetics/poolManager.ts` — injection logic
- `ts/simulator/training/trainingPanel.ts` — UI toggle
- `<training-panel>` custom element — display injection status

## Background

The KEYS car exists in every training session but is thrown away each generation. Allowing it to contribute to the gene pool lets the user demonstrate good driving, and the genetic algorithm incorporates that behavior through crossover. This bridges manual driving and autonomous training — "apprenticeship learning" within the existing GA framework — with minimal code change.

## Implementation Steps

### 1. Create `injectKeysCarIntoPool` function

In `ts/simulator/training/genetics/poolManager.ts`:

```ts
function injectKeysCarIntoPool(
  pool: CarInfo[],
  keysCar: Car,
  maxPoolSize: number,
  evaluateFitness: (car: Car) => number,
): CarInfo[];
```

**Logic:**

1. Check brain compatibility: `brainsCompatible(keysCar.brain, pool[0].brain)`. If incompatible (e.g., topology changed between generations), skip and return pool unchanged.
2. Compute fitness of the KEYS car: call `evaluateFitness(keysCar)` — same formula used for AI cars.
3. Convert KEYS car to `CarInfo`: `keysCar.toInfo()`.
4. Insert `keysCarInfo` into the pool at the correct position sorted by fitness (descending).
5. If pool exceeds `maxPoolSize` after insertion, remove the lowest-ranked AI car.

**Edge cases:**

- Pool is empty: just return `[keysCarInfo]`
- KEYS car has zero fitness: still insert (it may still contribute valuable patterns through crossover)
- `evaluateFitness` throws or returns NaN: skip injection

### 2. Add UI toggle to training panel

In `ts/simulator/training/trainingPanel.ts` (or the `<training-panel>` template):

Add checkbox:

```html
<label class="inject-keys-toggle">
  <input type="checkbox" id="injectKeys" checked />
  Inject KEYS brain into gene pool
</label>
```

Add status display (appears when injection is active):

```html
<span class="keys-status" id="keysPoolStatus">KEYS ∈ pool</span>
```

### 3. Integrate into generation cycle

In `TrainingSimulator` (where `#createCarsWithPool` is called):

```ts
if (this.#injectKeysEnabled && this.#keysCar) {
  this.#pool = injectKeysCarIntoPool(
    this.#pool,
    this.#keysCar,
    this.#maxPoolSize,
    (car) => this.#evaluateFitness(car),
  );
}
```

The `#injectKeysEnabled` boolean is wired to the checkbox state.

### 4. Update `TrainingManagerOptions`

Add field:

```ts
interface TrainingManagerOptions {
  // ... existing fields
  injectKeys?: boolean; // defaults to true
}
```

### 5. Rendering

No visual changes required on the simulation canvas.

Optional: color the KEYS car differently (e.g., a subtle glow or different border) when its brain is successfully injected into the pool.

### 6. Persistence

Transient training parameter — not persisted to localStorage or world files.

## Performance Safeguards

- Runs once per generation: O(poolSize) insertion sort.
- No per-frame cost.
- Brain compatibility check is O(layer count), negligible.
- The KEYS brain is shared (not copied) — the `toInfo()` call creates a lightweight snapshot.

## Acceptance Criteria

- [ ] Toggle checkbox appears in training panel
- [ ] When enabled, KEYS car's brain appears in the pool after generation reset
- [ ] When disabled, KEYS car is not injected (existing behavior preserved)
- [ ] Brains from the KEYS car can become parents of next-gen AI cars via crossover
- [ ] Incompatible brains (different topology) are gracefully skipped without errors
- [ ] Pool size does not exceed `maxPoolSize` after injection
- [ ] Toggle state persists across generations within a session (resets on page reload — acceptable)

## References

- `poolManager.ts` in `ts/simulator/training/genetics/`
- `Car.toInfo()` / `Car.fromInfo()` in `ts/car/car.ts`
- `brainsCompatible()` in `ts/neural-network/`
- Training panel UI in `ts/simulator/training/trainingPanel.ts`
- `TrainingManagerOptions` interface
