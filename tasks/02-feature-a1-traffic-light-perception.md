# Feature A1: Traffic Light Perception for AI Cars

**Priority:** 2 | **Effort:** Medium | **Impact:** High | **Risk:** Low

## Core Concept

AI cars detect and react to traffic light state through their existing sensor network, stopping at red lights and proceeding on green/yellow.

## Target Files

- `ts/car/sensors/sensor.ts` — extend `update()` signature
- `ts/car/brain/carBrainAdapter.ts` — assemble new input layer
- `ts/world/trafficManager.ts` — expose light state for spatial queries
- `ts/math/spatialGrid.ts` — add `TrafficControlGrid` alongside border grid
- `ts/car/car.ts` — add `trafficAwareness` to `CarInfo`
- `ts/panels/` — back-compat for legacy `.car` files

## Background

Traffic lights exist in the world editor and are managed by `TrafficManager` (state machine cycling green→yellow→red per crossroad), but cars completely ignore them. This is the #1 gap in achieving a cooperative ecosystem. The infrastructure (lights, state machine, spatial grid) is already in place; only the car perception side is missing.

## Implementation Steps

### 1. Add `TrafficControlGrid` to spatial indexing

In `ts/math/spatialGrid.ts` or a new file `ts/math/trafficControlGrid.ts`:

```ts
class TrafficControlGrid {
  #cellSize: number;
  #cells: Map<string, { polygon: Point[]; state: LightState }[]>;

  constructor(cellSize?: number);
  rebuild(controls: { polygon: Point[]; state: LightState }[]): void;
  query(
    x: number,
    y: number,
    range: number,
  ): { polygon: Point[]; state: LightState }[];
}
```

Cell size matches the border grid (150px). Rebuilt only when world markings change, not per frame.

### 2. Extend `Sensor.update()` signature

Current signature:

```ts
update(x: number, y: number, angle: number, roadPolygons: Point[][]): void;
```

New signature:

```ts
update(
  x: number, y: number, angle: number,
  roadPolygons: Point[][],
  trafficControls?: { polygon: Point[]; state: LightState }[],
): void;
```

Add a type for traffic state encoding:

```ts
type TrafficState = 'green' | 'yellow' | 'red' | 'off';
```

Per-ray logic changes:

- After finding the closest polygon per ray, check if a traffic control polygon exists along the same ray.
- If a traffic control is found and its distance is less than the road border distance, cache its state.
- Store `trafficState: TrafficState | null` per ray reading.

### 3. Update sensor readings output

Current output: `number[]` of length `rayCount + 1` (distances + self-reading).

New output for traffic-aware mode: store both distance and traffic state per ray.

The internal reading type:

```ts
interface RayReading {
  distance: number;
  trafficState: number; // 1 = green, 0.5 = yellow, 0 = red/off/absent
}
```

### 4. Add `trafficAwareness` flag to `CarInfo`

In `ts/car/car.ts`:

```ts
interface SensorConfig {
  rayCount: number;
  // ... existing fields
  trafficAwareness?: boolean; // new, defaults to false
}
```

**Backward compatibility:** All existing `.car` files (no `trafficAwareness` field) default to `false`, preserving the old `rayCount + 1` input layer.

### 5. Update `CarBrainAdapter`

In `ts/car/brain/carBrainAdapter.ts`:

When `trafficAwareness` is `true`:

- Input layer size = `rayCount * 2 + 1` (distance + traffic state per ray, plus self-reading)
- Assemble input array: interleave `[distance0, trafficState0, distance1, trafficState1, ..., selfSpeed]`

When `trafficAwareness` is `false` (legacy):

- Input layer size = `rayCount + 1` (distance only + self-reading)
- Keep existing behavior

**Auto-detect topology:** If `trafficAwareness` is true but `hiddenLayers` is absent from saved brain, infer from the network level dimensions.

### 6. Serialization

`Car.toInfo()` serializes `sensor.trafficAwareness`.
`Car.fromInfo()` reads it.
Backward compatible: all existing `.car` files continue to work.

**Brain compatibility:** `brainsCompatible()` checks level dimensions — a non-traffic-aware brain cannot be loaded into a traffic-aware car and vice versa (since input layer sizes differ).

### 7. Rendering

No changes needed — `Light.draw()` already renders the current state.

Optional polish: draw a colored indicator on the best car's sensor display when a traffic light is detected (green/yellow/red dot).

## Performance Safeguards

- Traffic controls indexed in their own spatial grid — per-car query is O(cells covered), not O(total controls).
- Grid rebuilt only when world markings change, not per frame.
- At city scale (<500 intersections, ~8 lights each), overhead is negligible.
- The traffic state check per ray is a simple polygon intersection test — same cost as existing ray casting.

## Acceptance Criteria

- [ ] AI cars stop at red lights and proceed on green/yellow on any loaded world with traffic lights
- [ ] Legacy `.car` files load and drive identically (no traffic awareness by default)
- [ ] New `.car` files with `trafficAwareness: true` drive correctly
- [ ] Brain compatibility check rejects incompatible brains
- [ ] No measurable performance regression at city scale

## References

- `TrafficManager` state machine in `ts/world/trafficManager.ts`
- `Light` class and its `state: LightState` field
- Existing border grid in `ts/math/spatialGrid.ts` (cell size 150px)
- `CarBrainAdapter` input assembly in `ts/car/brain/carBrainAdapter.ts`
- `brainsCompatible()` in `ts/neural-network/`
