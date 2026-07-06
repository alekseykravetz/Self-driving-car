# Feature B1: Multi-Class Sensor Readings

**Priority:** 5 | **Effort:** Large | **Impact:** High | **Risk:** Medium

## Core Concept

Sensor rays report not just distance but also the type of obstacle (road border, car, traffic control) and its relative velocity, enabling richer behaviors like gap acceptance, overtaking, and speed matching.

## Target Files

- `ts/car/sensors/sensor.ts` — new reading interface
- `ts/car/physics/sensorRaycaster.ts` — accept tagged polygon groups
- `ts/car/brain/carBrainAdapter.ts` — assemble larger input layer
- `ts/car/car.ts` — add `sophistication` field
- All simulators — pass tagged polygon groups

## Implementation Steps

### 1. Define `SensorReading` interface

New file `ts/car/sensors/sensorReading.ts` or inline in `sensor.ts`:

```ts
type ObstacleType = 'border' | 'car' | 'trafficControl' | 'none';

interface SensorReading {
  distance: number;
  type: ObstacleType;
  relativeSpeed: number; // 0 for static obstacles
}
```

### 2. Update raycaster to accept tagged polygon groups

In `ts/car/physics/sensorRaycaster.ts`:

Current signature (likely accepts `roadPolygons: Point[][]`):

New signature:

```ts
interface TaggedPolygons {
  borders: Point[][];
  cars: Car[];        // pass Car[] so we can read speed
  controls: Point[][];
}

getReadings(
  x: number, y: number, angle: number,
  groups: TaggedPolygons,
  rayCount: number,
  rayLength: number,
  raySpread: number,
): SensorReading[]
```

**Per-ray algorithm:**

1. For each ray, find the nearest hit across all three groups (borders, cars, controls).
2. Record the type of the nearest hit.
3. If nearest hit is a car, read `otherCar.speed` and compute `relativeSpeed = (otherCar.speed - thisCar.speed) / thisCar.maxSpeed`, clamped to `[-1, 1]`.
4. Static obstacles (borders, controls) have `relativeSpeed: 0`.
5. If no hit, `distance: rayLength, type: 'none', relativeSpeed: 0`.

### 3. Extend `Sensor` class

In `ts/car/sensors/sensor.ts`:

```ts
class Sensor {
  #sophistication: 'basic' | 'classified';

  constructor(config: SensorConfig);
  update(
    x: number,
    y: number,
    angle: number,
    roadPolygons: Point[][],
    trafficControls?: { polygon: Point[]; state: LightState }[],
    otherCars?: Car[],
  ): void;
  getReadings(): SensorReading[];
}
```

When `sophistication === 'basic'`:

- Keep existing behavior (returns `number[]` of distances).
- Do not accept or use traffic controls / other cars.

When `sophistication === 'classified'`:

- Use updated raycaster with all three groups.
- Return `SensorReading[]` with type and relative speed.

### 4. Network input layer changes

In `ts/car/brain/carBrainAdapter.ts`:

**Basic mode (existing):** `rayCount + 1` inputs (distance per ray + self-speed).

**Classified mode (new):** `rayCount * 3 + 1` inputs:

- Per ray: `[distance, type_encoded, relative_speed]`
- Type encoding: `1 = border, 0.5 = car, 0 = none/trafficControl` (continuous tri-valued)
- Relative speed: clamped to `[-1, 1]` as fraction of this car's max speed
- Plus self-speed at the end

### 5. Add `sophistication` field

In `ts/car/car.ts`:

```ts
interface SensorConfig {
  // ... existing fields
  sophistication?: 'basic' | 'classified'; // defaults to 'basic'
}
```

**Backward compatibility:** Legacy `.car` files without this field default to `'basic'`. The `hiddenLayers` field in saved brains must account for the larger input layer when `'classified'` is used.

**Brain compatibility:** `brainsCompatible()` validates level dimensions — a `basic` brain cannot be loaded into a `classified` car and vice versa.

### 6. Update all simulators to pass tagged groups

In `TrainingSimulator`, `TrafficSimulator`, `RaceSimulator`:

Where sensors are updated, pass the appropriate polygon groups:

```ts
const groups = {
  borders: world.roadBorders,
  cars: this.#cars.filter((c) => c !== thisCar),
  controls: world.markings
    .filter((m) => m instanceof Light)
    .map((m) => m.polygon),
};
sensor.update(car.x, car.y, car.angle, groups);
```

For `basic` sensor cars, pass `undefined` for the extra args (gracefully ignored).

### 7. Rendering

In `ts/car/car.ts` or the car's `draw()` method:

Color-code sensor rays by type when `sophistication === 'classified'`:

- Red = car
- Yellow = border
- Green = traffic control
- Gray (existing) = no hit

### 8. Serialization

`Car.toInfo()` serializes `sensor.sophistication`.
`Car.fromInfo()` reads it, defaults to `'basic'`.
The `hiddenLayers` array in the saved brain must match the input layer size.

## Performance Safeguards

- Tagged polygon groups are already available in all simulators (road borders, cars list, world markings).
- The raycaster's polygon loop becomes 2–3 sequential loops over smaller arrays — no net regression.
- At 5000 cars, the bottleneck remains the car-vs-car distance-filtered O(n²) loop, not the per-ray raycaster.
- The `relativeSpeed` extraction is O(1) per reading (reads a single scalar from another car).
- For `basic` cars, there is zero overhead — the new code path is only hit for `classified` sensors.

## Acceptance Criteria

- [ ] `classified` sensors report different types (border/car/control/none) per ray
- [ ] `classified` sensors report relative velocity for car hits
- [ ] Sensor rays are color-coded by type in the visual debug overlay
- [ ] Legacy `.car` files (no `sophistication` field) work identically to before
- [ ] Classified brains train successfully with the larger input layer
- [ ] Brain compatibility check rejects cross-mode loading
- [ ] No measurable FPS regression with `basic` cars in a 5000-car traffic jam
- [ ] Classified AI cars can distinguish between borders and other cars (e.g., smoother following behavior)

## References

- `sensor.ts` in `ts/car/sensors/`
- `carBrainAdapter.ts` in `ts/car/brain/`
- `car.ts` and `CarInfo` interface
- All simulators for passing tagged groups
- `Light` class for traffic control polygons
- `brainsCompatible()` in `ts/neural-network/`
