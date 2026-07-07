# Car Physics & Perception

The `ts/car/` directory implements vehicle dynamics, environmental perception via ray-casting, and multiple control input systems.

---

## Car Class (`ts/car/car.ts`)

### Class Structure

```typescript
interface CarConstructorOptions {
  x: number;
  y: number;
  width?: number; // Default: 25 (~1.8m at 14px/m)
  height?: number; // Default: 63 (~4.5m at 14px/m)
  controlType?: string; // 'AI' | 'KEYS' | 'DUMMY'
  angle?: number; // Starting heading (radians, 0 = up)
  maxSpeed?: number; // Default: 3.24 (~50 km/h)
  acceleration?: number; // Default: 0.01
  friction?: number; // Default: 0.002
  color?: string; // Body color
  hiddenLayers?: number[]; // Neural network hidden layers (default: [6])
  sensor?: SensorConfig; // Ray-casting config
}

interface CarInfo {
  brain?: unknown; // Opaque brain data (serialized via CarBrainAdapter)
  maxSpeed: number;
  friction: number;
  acceleration: number;
  width: number;
  height: number;
  hiddenLayers?: number[];
  sensor: SensorConfig;
}

interface SensorConfig {
  rayCount: number;
  raySpread: number;
  rayLength: number;
  rayOffset: number;
  trafficAwareness?: boolean; // Defaults to false; omitted on legacy .car files
}

class Car {
  // Position & motion
  x: number; // World X position
  y: number; // World Y position
  angle: number; // Heading (radians, 0 = up, positive = clockwise)
  speed: number; // Current speed (px/frame)

  // Configuration
  width: number; // Body width for polygon generation
  height: number; // Body height for polygon generation
  maxSpeed: number; // Speed cap (forward)
  acceleration: number; // Speed gain per frame when accelerating
  friction: number; // Speed loss per frame (always applied)
  color: string; // Car body color

  // State
  damaged: boolean; // True after collision → stops moving (unless collision mode)
  fitness: number; // Accumulated distance score for genetic algorithm
  type: string; // 'AI' | 'KEYS' | 'DUMMY'
  name: string; // Display label (pool rank, "Player 1", etc.)
  progress: number; // Race progress (0-1, corridor-based)
  finishTime: number | null; // Frame when car finished race

  // Components
  sensor: Sensor | null; // Only for AI/KEYS cars (ray-caster)
  brain: NeuralNetwork | null; // Only for AI cars
  controls: Controls; // Input handler (keyboard, AI, or dummy)
  polygon: Point[]; // Collision boundary (4 rotated corners)

  // Methods
  update(polygons: Point[][]): void; // Per-frame physics + collision
  draw(ctx, drawSensor?, drawMask?): void; // Render car
  load(info: CarInfo): void; // Apply config to this car
  toInfo(): CarInfo; // Serialize to CarInfo
}
```

---

## Movement Model

### World Units

The world scale is defined in `ts/math/utils.ts`:

```typescript
const WORLD_PIXELS_PER_METER = 14;
```

This means:

| World value | Real distance |
| ----------- | ------------- |
| 1px         | 0.071m        |
| 14px        | 1m            |
| 49px        | 3.5m lane     |
| 98-100px    | 2-lane road   |

The default car is sized from real dimensions:

| Real size | World size |
| --------- | ---------- |
| 1.8m wide | 25px wide  |
| 4.5m long | 63px long  |

### Unit Formulas

The simulation updates once per animation frame. At the target 60 FPS:

```
meters = pixels / WORLD_PIXELS_PER_METER
pixels = meters * WORLD_PIXELS_PER_METER

m/s = pxPerFrame * 60 / WORLD_PIXELS_PER_METER
km/h = pxPerFrame * 60 / WORLD_PIXELS_PER_METER * 3.6

pxPerFrame = km/h / 3.6 * WORLD_PIXELS_PER_METER / 60
pxPerFrame = km/h * 0.0648148    // when WORLD_PIXELS_PER_METER = 14

px/frame² = m/s² * WORLD_PIXELS_PER_METER / 60²
px/frame² = m/s² * 0.0038889     // when WORLD_PIXELS_PER_METER = 14
```

Each frame, `Car.#move()` executes this sequence:

### 1. Acceleration

```
if (controls.forward) speed += acceleration
if (controls.reverse) speed -= acceleration
```

### 2. Speed Capping

```
if (speed > maxSpeed) speed = maxSpeed
if (speed < -maxSpeed / 2) speed = -maxSpeed / 2   // Reverse is 50% of forward
```

### 3. Friction (always applied)

```
if (speed > 0) speed -= friction
if (speed < 0) speed += friction
if (|speed| < friction) speed = 0    // Prevent oscillation around zero
```

### 4. Steering

Steering is handled by `Car.#applySteering()` (not by CarPhysics), because the
tilt behavior differs by control type:

- **Keyboard controls**: simple left/right angle modification
- **CameraControls / PhoneControls**: tilt offset read from sensor/device

```typescript
// Car.#applySteering() — simplified
if (speed != 0):
  flip = (speed > 0) ? 1 : -1       // Reverse flips steering direction
  if (controls.left)  angle += 0.03 * flip
  if (controls.right) angle -= 0.03 * flip
```

### 5. Position Update (CarPhysics.update / CarPhysics.move)

```
x -= sin(angle) * speed    // Heading-based movement
y -= cos(angle) * speed    // Y-axis inverted (up = negative Y)
```

### Key Behaviors

- Steering only works when the car is moving (speed ≠ 0)
- Reverse steering is inverted (turning left while reversing turns the car right in world space)
- Friction brings the car to a natural stop when no input is applied
- Maximum reverse speed is 50% of forward max speed
- Steering rate is fixed at 0.03 rad/frame (~1.7°/frame at 60 FPS)
- Because friction is always applied, the default forward net acceleration is
  `0.01 - 0.002 = 0.008 px/frame²` while the accelerator is held.

### Default Parameters

| Parameter      | Default | Real-world meaning                | Description               |
| -------------- | ------- | --------------------------------- | ------------------------- |
| `maxSpeed`     | 3.24    | ~50 km/h                          | Maximum forward velocity  |
| `acceleration` | 0.01    | ~2.57 m/s² before friction        | Speed increase per frame  |
| `friction`     | 0.002   | ~0.51 m/s² coast-down             | Speed decrease per frame  |
| `width`        | 25      | ~1.8m                             | Car body width            |
| `height`       | 63      | ~4.5m                             | Car body height           |
| reverse limit  | 1.62    | ~25 km/h                          | `maxSpeed / 2` backward   |
| net accel      | 0.008   | ~2.06 m/s² while pressing forward | `acceleration - friction` |

### Speed Reference Table

At `WORLD_PIXELS_PER_METER = 14` and 60 FPS:

| Road/use case       | km/h | m/s  | px/frame | Notes                    |
| ------------------- | ---- | ---- | -------- | ------------------------ |
| Parking / crawling  | 5    | 1.39 | 0.32     | Very slow maneuvering    |
| School zone         | 20   | 5.56 | 1.30     | Slow urban traffic       |
| Residential         | 30   | 8.33 | 1.94     | Calm neighborhood speed  |
| City default        | 50   | 13.9 | 3.24     | Current default maxSpeed |
| Fast urban arterial | 70   | 19.4 | 4.54     | Feels quick on city maps |
| Highway             | 90   | 25.0 | 5.83     | Fast road                |
| Motorway            | 100  | 27.8 | 6.48     | Highway default option   |
| Fast motorway       | 130  | 36.1 | 8.43     | Very fast in-game        |

Useful inverse checks:

| px/frame | Approx km/h |
| -------- | ----------- |
| 1        | 15.4        |
| 2        | 30.9        |
| 3.24     | 50.0        |
| 5        | 77.1        |
| 8        | 123.4       |

### Acceleration & Friction Reference

Use these formulas when tuning:

```
realAccelerationMps2 = pxPerFrame2 * 60² / WORLD_PIXELS_PER_METER
pxPerFrame2 = realAccelerationMps2 * WORLD_PIXELS_PER_METER / 60²
```

| Real behavior        | m/s² | px/frame² |
| -------------------- | ---- | --------- |
| Gentle coasting drag | 0.5  | 0.0019    |
| Default friction     | 0.51 | 0.0020    |
| Smooth acceleration  | 1.5  | 0.0058    |
| Default acceleration | 2.57 | 0.0100    |
| Strong acceleration  | 4.0  | 0.0156    |
| Hard braking         | 8.0  | 0.0311    |

The current controls use the same `acceleration` value for forward and reverse.
There is no separate brake force yet, so pressing reverse while moving forward
slows the car by roughly `acceleration + friction` per frame until speed crosses
zero.

---

## Collision Detection

### Polygon Generation (`#createPolygon`)

The car's collision boundary is a rotated rectangle computed each frame:

```typescript
#createPolygon(): Point[] {
  const radius = Math.hypot(this.width, this.height) / 2;
  const alpha = Math.atan2(this.width, this.height);

  return [
    new Point(                                          // Top-right corner
      this.x - Math.sin(this.angle - alpha) * radius,
      this.y - Math.cos(this.angle - alpha) * radius
    ),
    new Point(                                          // Top-left corner
      this.x - Math.sin(this.angle + alpha) * radius,
      this.y - Math.cos(this.angle + alpha) * radius
    ),
    new Point(                                          // Bottom-left corner
      this.x - Math.sin(Math.PI + this.angle - alpha) * radius,
      this.y - Math.cos(Math.PI + this.angle - alpha) * radius
    ),
    new Point(                                          // Bottom-right corner
      this.x - Math.sin(Math.PI + this.angle + alpha) * radius,
      this.y - Math.cos(Math.PI + this.angle + alpha) * radius
    ),
  ];
}
```

This creates a tight-fitting rotated bounding box (4 vertices) that follows the car's heading angle.

### Damage Assessment (`#assessDamage`)

Every frame, the car's polygon is tested against obstacle polygons:

1. **Road borders** — Segments forming road edges (passed as `[Point, Point]` pairs)
2. **Buildings** — Polygon bases (when in world mode)
3. **Other cars** — Traffic car polygon boundaries

Uses `polysIntersect(carPolygon, obstacle)` which checks pairs of edges for intersection using the parametric line-line intersection formula. Two optimizations keep this cheap at large populations:

- **AABB broad phase.** `#assessDamage` first computes the car's axis-aligned bounding box and each obstacle's box, and skips the full edge-edge test whenever the boxes are disjoint. The shared narrow phase feeds every segment within _sensor_ range (far larger than the car body), so most candidates cannot possibly touch the car — the box test rejects them in a few comparisons.
- **Allocation-free intersection.** `polysIntersect` calls `getIntersectionOffset` (returns a number, not an object) since it only needs a yes/no, and skips the duplicate closing edge of 2-point border "polygons" (whose `p2→p1` edge is the same segment as `p1→p2`).

If any intersection found: `damaged = true`, car stops updating its position.

> **Range-scoped borders (world mode).** A car is only handed the road borders
> within its reach, not the whole map. The simulator's `updateWorldCars` does a
> broad-phase [Spatial Hash Grid](Math.md#spatial-hash-grid-tsmathspatialgridts)
> query (radius derived from `sensor.rayLength`) followed by an exact per-car
> narrow-phase distance filter, so both damage detection and sensing operate on
> just the handful of relevant segments. See the [Simulators](Simulators.md) doc.

### Collision Response (`handleCollisionWithRoadBorders`)

Located in `ts/simulator/training/modes/borderCollision.ts`. An alternative to the default "stop on damage" behavior — pushes the car back onto the road:

```typescript
function handleCollisionWithRoadBorders(
  car: Car,
  bordersToCheck: Segment[],
): void {
  // 1. Find the nearest road skeleton/border segment to the car's position
  const segment = getNearestSegment(new Point(car.x, car.y), bordersToCheck);

  // 2. Project each polygon corner onto that segment
  const correctors = car.polygon.map((p: Point) => {
    const proj = segment.projectPoint(p);
    const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
    return subtract(projPoint, p);
  });

  // 3. Find the corner with the maximum correction magnitude
  const magnitudes = correctors.map((p: Point) => magnitude(p));
  const maxMagnitude = Math.max(...magnitudes);
  const correctorIndex = magnitudes.findIndex((mag) => mag === maxMagnitude);

  // 4. Adjust angle based on which side was hit
  if (correctorIndex === 0 || correctorIndex === 3) {
    car.angle += 0.1; // Right-side hit → steer left
  } else {
    car.angle -= 0.1; // Left-side hit → steer right
  }

  // 5. Move car by normalized correction vector
  const normalizedCorrector = normalize(correctors[correctorIndex]);
  car.x += normalizedCorrector.x;
  car.y += normalizedCorrector.y;

  // 6. Car lives on
  car.damaged = false;
}
```

This enables "bouncing off walls" behavior instead of instant death on collision.

---

## Sensor System (`ts/car/sensors/sensor.ts`)

### Class Structure

```typescript
interface IntersectionPoint extends Point {
  offset: number; // 0.0 = at ray start, 1.0 = at ray end (max length)
}

class Sensor {
  rayCount: number; // Number of sensor rays (default: 5)
  rayLength: number; // Maximum detection distance (default: 150)
  raySpread: number; // Angular spread of rays (default: π/2 = 90°)
  rayOffset: number; // Rotational offset of sensor array (default: 0)
  trafficAwareness: boolean; // Whether the sensor detects traffic lights (default: false)
  trafficReadings: (TrafficReading | null)[]; // Per-ray detection result (state + intersection point), traffic-aware only

  rays: Point[][]; // Array of [startPoint, endPoint] pairs
  readings: (IntersectionPoint | null)[]; // Closest hit per ray, or null
}
```

### Ray Casting (`#castRays`)

Generates `rayCount` rays spread evenly across the `raySpread` angle.
Takes the car's current center position and heading angle:

```typescript
this.#castRays(x: number, y: number, angle: number): void {
  for (let i = 0; i < this.rayCount; i++) {
    const rayAngle =
      lerp(
        this.raySpread / 2,
        -this.raySpread / 2,
        this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1),
      ) +
      angle +
      this.rayOffset;

    const start = new Point(x, y);
    const end = new Point(
      x - Math.sin(rayAngle) * this.rayLength,
      y - Math.cos(rayAngle) * this.rayLength,
    );
    this.rays[i] = [start, end];
  }
}
```

- Rays emanate from the provided center position
- Spread evenly from `+raySpread/2` to `-raySpread/2` relative to heading
- `rayOffset` rotates the entire sensor array (useful for asymmetric sensing)
- Default config: 5 rays spanning 90° ahead of the car
- Sensor no longer holds a reference to its parent Car — position data is passed in each frame

### Reading Detection (`#getReading`)

For each ray, test intersection against all nearby obstacle polygons:

```
minOffset = Infinity
For each obstacle polygon segment:
  offset = getIntersectionOffset(rayStart, rayEnd, segStart, segEnd)
  if (offset >= 0 and offset < minOffset):
    minOffset = offset

if (minOffset === Infinity): return null   // clear path
else: return { x, y, offset } built once via lerp at minOffset
```

The loop is a single allocation-free pass: it tracks only the closest offset
(using `getIntersectionOffset`, no per-segment object) and constructs the
intersection point **once** for the winning ray. The old version collected every
hit into an array and post-processed with `map`/`Math.min(...)`/`find`, which
allocated per ray per car per frame.

- `offset = 0.0` means the obstacle is touching the car
- `offset = 1.0` means the obstacle is at maximum ray length
- `null` means nothing was detected (clear path)

### Default Sensor Configuration

| Parameter          | Default   | Description                                                                                                                                                                                                                                 |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rayCount`         | 5         | Number of rays in the sensor array                                                                                                                                                                                                          |
| `rayLength`        | 150       | Maximum detection distance (pixels)                                                                                                                                                                                                         |
| `raySpread`        | π/2 (90°) | Total angular coverage of the sensor array                                                                                                                                                                                                  |
| `rayOffset`        | 0         | Rotation offset (0 = centered on car heading)                                                                                                                                                                                               |
| `trafficAwareness` | false     | When true, the sensor also detects traffic lights (see [Traffic-Light Perception](#traffic-light-perception)). Settable from the training UI via the "Traffic Lights" checkbox (init modal + live panel); defaults to off (legacy behavior) |

### Traffic-Light Perception

When `trafficAwareness` is `true`, `Sensor.update(x, y, angle, polygons, trafficControls?)` performs an extra per-ray pass over the supplied `SensorTrafficControl[]` (polygons + live light state). For each ray:

1. Find the closest traffic-control polygon intersection.
2. If that intersection's offset is **less** than the road-border hit offset (i.e. the light sits in front of the wall), the ray "sees" that light's state.
3. The state is written to `trafficReadings[i]`; `encodeTrafficState()` maps green→1, yellow→0.5, red/off/absent→0.

The traffic-control set is built per frame by the simulator via `buildTrafficControls(world)` (into a `TrafficControlGrid`) and `queryTrafficControlsNearCar(grid, car)` — mirroring `queryBordersNearCar` (sensor reach + body margin). The grid uses 150px cells and is rebuilt only when world markings change; light state is read live at query time through a `getState` closure, so a state change takes effect on the next query without a rebuild.

`Sensor.draw()` renders the traffic detection with a colored ray from the car to the light intersection point (instead of offsetting a dot above the wall hit), plus a colored dot (r=4) with a white 1.5px border at the light position. When a wall exists behind the light, the yellow wall ray continues from the light point to the wall. See [Sensor Visualization](#sensor-visualization) for the full per-ray rules.

> Lights still update via `TrafficManager` inside `World.draw()`, so perception reads the previous frame's light state — a one-frame lag, which is acceptable.

### Sensor Visualization

When `drawSensor` is true, rays are rendered on the canvas. The per-ray rules depend on whether a road-border hit and/or a traffic-light detection exists:

| Scenario             | Ray line                                                  | Endpoint dot                                                                           |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Wall hit, no traffic | Yellow from car → wall                                    | Yellow dot (r=3) at wall                                                               |
| Wall hit + traffic   | Colored\* from car → light, then yellow from light → wall | Yellow dot (r=3) at wall + colored dot (r=4, white 1.5px border) at light intersection |
| No wall, no traffic  | Faint yellow full-length (α0.2)                           | None                                                                                   |
| No wall + traffic    | Colored\* from car → light                                | Colored dot (r=4, white 1.5px border) at light intersection                            |

\* Color matches the traffic-light state: `#0F0` (green), `#FF0` (yellow), `#F00` (red).

The traffic intersection point is computed inside `#getTrafficReadings()` via `lerp()` and stored in a `TrafficReading` (`{ state, offset, x, y }`), so the dot lands exactly on the light polygon — never offset from a wall.

---

## AI Integration

Brain evaluation is handled through `CarBrainAdapter`, the sole bridge between
the Car layer and the NeuralNetwork layer:

```typescript
// In Car.update(), after sensor.update():
const reading = CarBrainAdapter.getReading(this); // builds input array
CarBrainAdapter.feedForward(this, reading);
// Car's internal controls are updated by the adapter
```

**What the adapter does**:

1. Reads `sensor.readings`, inverts offsets (`1 - offset`)
2. If `sensor.trafficAwareness`, interleaves `sensor.trafficReadings` (encoded green=1 / yellow=0.5 / red=0) between each distance and appends normalized speed; otherwise appends speed only
3. Calls `NeuralNetwork.feedForward(inputs, brain)`
4. Maps binary outputs to `controls.forward/left/right/reverse`

**Input normalization**: Sensor readings are inverted (`1 - offset`) so that:

- `1.0` = obstacle touching the car (maximum danger)
- `0.0` = no obstacle detected (ray missed entirely)
- Intermediate values represent proximity (closer = higher)

**Speed input**: Normalized to `[0, 1]` range using `speed / maxSpeed`.

**Network topology**: Input layer size is `CarBrainAdapter.inputLayerSize(rayCount, trafficAwareness)` — `rayCount*2 + 1` for traffic-aware cars (distance + light state per ray, plus speed), else the legacy `rayCount + 1`. With default 5 rays that yields 6 inputs (legacy) or 11 inputs (traffic-aware) → 4 outputs. Default architecture: `[6, 6, 4]` (legacy) / `[11, 6, 4]` (traffic-aware). `brainsCompatible()` in `poolManager.ts` rejects brain swaps across the two input sizes automatically.

**Opaque brain type**: `Car.brain` is typed as `unknown` (aliased `Brain`). No layer-2 code imports `NeuralNetwork` directly. Consumers that need the network API (e.g., pool manager, visualizer) use `as NeuralNetwork` casts internally.

---

## Serialization

### `Car.toInfo(): CarInfo`

Captures the full car configuration:

```typescript
toInfo(): CarInfo {
  return {
    maxSpeed: this.maxSpeed,
    acceleration: this.acceleration,
    friction: this.friction,
    width: this.width,
    height: this.height,
    hiddenLayers: this.hiddenLayers,
    sensor: {
      rayCount: this.sensor.rayCount,
      rayLength: this.sensor.rayLength,
      raySpread: this.sensor.raySpread,
      rayOffset: this.sensor.rayOffset,
      trafficAwareness: this.sensor.trafficAwareness,
    },
    brain: this.brain ? CarBrainAdapter.serialize(this.brain) : undefined,
  };
}
```

### `Car.fromInfo(opts, info?)` (preferred)

Factory method that creates a `Car` from initial options and optional persisted
info — an explicit, deterministic path for car rehydration:

```typescript
const car = Car.fromInfo({ x: 100, y: 200, controlType: 'AI' }, savedInfo);
```

### `Car.load(info: CarInfo)` (legacy)

Applies a `CarInfo` to an existing car instance (kept for backward compatibility):

1. Physics params (maxSpeed, acceleration, friction) are applied directly
2. Size (width, height) override car dimensions if present
3. Sensor config is applied to the sensor instance
4. Brain is deserialized via `CarBrainAdapter.deserialize(info.brain, this)` (or undefined if no brain)
5. If `hiddenLayers` changed or `rayCount` changed, the brain architecture must be rebuilt

### File Format (`.car` files)

Plain JSON matching the `CarInfo` interface:

```json
{
  "maxSpeed": 3.24,
  "acceleration": 0.01,
  "friction": 0.002,
  "width": 25,
  "height": 63,
  "hiddenLayers": [6],
  "sensor": {
    "rayCount": 5,
    "rayLength": 150,
    "raySpread": 1.5707963267948966,
    "rayOffset": 0,
    "trafficAwareness": false
  },
  "brain": {
    "levels": [
      {
        "inputs": [0, 0, 0, 0, 0, 0],
        "outputs": [1, 0, 1, 0, 0, 1],
        "biases": [-0.23, 0.45, -0.67, 0.12, -0.89, 0.34],
        "weights": [[...], ...]
      },
      ...
    ]
  }
}
```

Legacy format (`let carInfo = {...};`) is also supported for backward compatibility.

---

## Rendering

### Car Drawing (`draw`)

Cars are drawn either as a textured sprite (mask) or a flat colored polygon,
controlled by `CarDrawOptions`:

```typescript
draw(ctx, options: CarDrawOptions = {}): void {
  const { showSensor, showMask = true, colorOverride, alpha, showName } = options;

  // 1. Sensor rays (best car only, when enabled)
  if (this.sensor && showSensor) this.sensor.draw(ctx);

  if (showMask) {
    // 2a. Textured sprite: a cached, pre-composited color-tinted car image.
    //     Undamaged cars use Car.#getSprite(color, w, h) → single drawImage.
    //     Damaged cars (or before the image loads) fall back to the raw image.
    const sprite = this.damaged ? null : Car.#getSprite(this.color, w, h);
    ctx.drawImage(sprite ?? this.image, -w / 2, -h / 2, w, h);
  } else {
    // 2b. Flat polygon fill (cheap path; gray if damaged)
    ctx.fillStyle = this.damaged ? 'gray' : (colorOverride ?? this.color);
    // ...trace this.polygon and fill...
  }

  // 3. Optional #N rank label
}
```

**Cached sprite masks.** Building the tinted car sprite (fill +
`destination-atop` + `multiply`) is done **once** per `${color}|${width}|${height}`
key and stored in a static `Car.#spriteCache`, shared across all cars. Per-frame
mask drawing is therefore a single `drawImage`, which is what makes masks
affordable for thousands of cars (see the `drawMasks` threshold in
[Simulators](Simulators.md)).

### Pool Car Rendering (via `carRenderer.ts`)

The simulator draws cars in layers for visual clarity:

1. **Regular AI cars** — 20% alpha, no sensors, no name labels
2. **Previous pool cars** — full alpha, lime green mask, name labels
3. **Current pool cars** — full alpha, gold mask, name labels, sensors on best only
4. **KEYS car** — full alpha, own color, always visible

Each pool car gets a `#N` name label drawn at its world-space center (white text with black shadow for readability).

---

## Fitness & Training Integration

### Fitness Calculation

Fitness is evaluated externally by the simulator via callback:

- **Simple mode**: `fitness = startY - car.y` (how far upward from start)
- **World mode**: `fitness = car.fitness`, the total distance travelled
  (`car.fitness += car.speed` each frame). Idle freezing is measured as distance
  from the best (highest-fitness) car.

### Pool Selection

Each frame, `TrainingManager.updateBestCarAndPool()` sorts all alive AI cars by fitness and maintains a rolling `bestPool[]` of the top K performers. When a generation ends:

```typescript
const topPool = getTopCarInfoPool(cars, evaluateFitness, poolSize);
// topPool contains CarInfo objects (with brain) for the top K cars
```

This pool becomes the breeding stock for the next generation.
