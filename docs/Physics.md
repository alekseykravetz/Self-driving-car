# Car Physics & Perception

The `ts/car/` directory implements vehicle dynamics, environmental perception via ray-casting, and multiple control input systems.

---

## Car Class (`ts/car/car.ts`)

### Class Structure

```typescript
interface CarConstructorOptions {
  x: number;
  y: number;
  width?: number; // Default: 30
  height?: number; // Default: 50
  controlType?: string; // 'AI' | 'KEYS' | 'DUMMY'
  angle?: number; // Starting heading (radians, 0 = up)
  maxSpeed?: number; // Default: 3
  acceleration?: number; // Default: 0.2
  friction?: number; // Default: 0.05
  color?: string; // Body color
  hiddenLayers?: number[]; // Neural network hidden layers (default: [6])
  sensor?: SensorConfig; // Ray-casting config
}

interface CarInfo {
  brain?: NeuralNetwork;
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

Each frame, `Car.#move()` executes this sequence:

### 1. Acceleration

```
if (controls.forward) speed += acceleration
if (controls.reverse) speed -= acceleration
```

### 2. Friction (always applied)

```
if (speed > 0) speed -= friction
if (speed < 0) speed += friction
if (|speed| < friction) speed = 0    // Prevent oscillation around zero
```

### 3. Speed Capping

```
if (speed > maxSpeed) speed = maxSpeed
if (speed < -maxSpeed / 2) speed = -maxSpeed / 2   // Reverse is 50% of forward
```

### 4. Steering

```
if (speed != 0):
  flip = (speed > 0) ? 1 : -1       // Reverse flips steering direction
  if (controls.left)  angle += 0.03 * flip
  if (controls.right) angle -= 0.03 * flip
```

### 5. Position Update

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

### Default Parameters

| Parameter      | Default | Unit      | Description              |
| -------------- | ------- | --------- | ------------------------ |
| `maxSpeed`     | 3       | px/frame  | Maximum forward velocity |
| `acceleration` | 0.2     | px/frame² | Speed increase per frame |
| `friction`     | 0.05    | px/frame² | Speed decrease per frame |
| `width`        | 30      | px        | Car body width           |
| `height`       | 50      | px        | Car body height          |

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
  car: Car; // Reference to parent car
  rayCount: number; // Number of sensor rays (default: 5)
  rayLength: number; // Maximum detection distance (default: 150)
  raySpread: number; // Angular spread of rays (default: π/2 = 90°)
  rayOffset: number; // Rotational offset of sensor array (default: 0)

  rays: Point[][]; // Array of [startPoint, endPoint] pairs
  readings: (IntersectionPoint | null)[]; // Closest hit per ray, or null
}
```

### Ray Casting (`#castRays`)

Generates `rayCount` rays spread evenly across the `raySpread` angle:

```typescript
for (let i = 0; i < this.rayCount; i++) {
  const rayAngle =
    lerp(
      this.raySpread / 2,
      -this.raySpread / 2,
      this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1),
    ) +
    this.car.angle +
    this.rayOffset;

  const start = new Point(this.car.x, this.car.y);
  const end = new Point(
    this.car.x - Math.sin(rayAngle) * this.rayLength,
    this.car.y - Math.cos(rayAngle) * this.rayLength,
  );
  this.rays[i] = [start, end];
}
```

- Rays emanate from the car's center position
- Spread evenly from `+raySpread/2` to `-raySpread/2` relative to car heading
- `rayOffset` rotates the entire sensor array (useful for asymmetric sensing)
- Default config: 5 rays spanning 90° ahead of the car

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

| Parameter   | Default   | Description                                   |
| ----------- | --------- | --------------------------------------------- |
| `rayCount`  | 5         | Number of rays in the sensor array            |
| `rayLength` | 150       | Maximum detection distance (pixels)           |
| `raySpread` | π/2 (90°) | Total angular coverage of the sensor array    |
| `rayOffset` | 0         | Rotation offset (0 = centered on car heading) |

### Sensor Visualization

When `drawSensor` is true, rays are rendered on the canvas:

- **Clear ray** (no hit): drawn full-length in yellow with green endpoint
- **Hit ray**: drawn in yellow up to the hit point, then red to the max endpoint
- Hit point drawn as a black circle

---

## AI Integration

When the car has `type === 'AI'` and a brain:

```typescript
// In update(), after sensor.update():
const offsets = this.sensor.readings.map((r) => (r == null ? 0 : 1 - r.offset));
// Add normalized speed as extra input
offsets.push(this.speed / this.maxSpeed);

const outputs = NeuralNetwork.feedForward(offsets, this.brain);

this.controls.forward = outputs[0]; // 1 or 0
this.controls.left = outputs[1]; // 1 or 0
this.controls.right = outputs[2]; // 1 or 0
this.controls.reverse = outputs[3]; // 1 or 0
```

**Input normalization**: Sensor readings are inverted (`1 - offset`) so that:

- `1.0` = obstacle touching the car (maximum danger)
- `0.0` = no obstacle detected (ray missed entirely)
- Intermediate values represent proximity (closer = higher)

**Speed input**: Normalized to `[0, 1]` range using `speed / maxSpeed`.

**Network topology**: With default 5 rays + 1 speed input → 6 input neurons. Outputs are 4 binary decisions. Default architecture: `[6, 6, 4]` (6 inputs → 6 hidden → 4 outputs).

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
    },
    brain: this.brain ? JSON.parse(JSON.stringify(this.brain)) : undefined,
  };
}
```

### `Car.load(info: CarInfo)`

Applies a `CarInfo` to the car:

1. Physics params (maxSpeed, acceleration, friction) are applied directly
2. Size (width, height) override car dimensions if present
3. Sensor config is applied to the sensor instance
4. Brain is deep-cloned and assigned (or undefined if no brain in info)
5. If `hiddenLayers` changed or `rayCount` changed, the brain architecture must be rebuilt

### File Format (`.car` files)

Plain JSON matching the `CarInfo` interface:

```json
{
  "maxSpeed": 8,
  "acceleration": 0.08,
  "friction": 0.04,
  "width": 30,
  "height": 50,
  "hiddenLayers": [6],
  "sensor": {
    "rayCount": 5,
    "rayLength": 150,
    "raySpread": 1.5707963267948966,
    "rayOffset": 0
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
