# Car Physics & Perception

The `ts/car/` directory implements vehicle dynamics, environmental perception via ray-casting, and multiple control input systems.

---

## Car Physics (`ts/car/car.ts`)

### Class Structure

```typescript
interface CarInfo {
  brain?: NeuralNetwork       // Optional — omitted if saving config without brain
  maxSpeed: number
  friction: number
  acceleration: number
  width: number
  height: number
  sensor: { rayCount: number; raySpread: number; rayLength: number; rayOffset: number }
}

class Car {
  // Position & motion
  x, y: number               // World position
  angle: number              // Heading (radians, 0 = up)
  speed: number              // Current speed (px/frame)

  // Configuration
  width, height: number      // Dimensions for polygon generation
  maxSpeed: number           // Speed cap
  acceleration: number       // Speed gain per frame
  friction: number           // Speed loss per frame
  color: string              // Body color

  // State
  damaged: boolean           // True after collision → stops moving
  fitness: number            // Distance score for genetic algorithm
  type: 'AI' | 'KEYS' | 'DUMMY'

  // Components
  sensor?: Sensor            // Only for AI/KEYS cars
  brain?: NeuralNetwork      // Only for AI cars
  controls: Controls         // Input handler
  polygon: Point[]           // Collision boundary (4 corners)

  // Methods
  update(polygons: Point[][]): void
  draw(ctx, drawSensor?: boolean, drawMask?: boolean): void
  load(info: CarInfo): void         // Apply config to this car
  toInfo(): CarInfo                 // Serialize car state to CarInfo
}
```

### Serialization

`Car.toInfo()` captures the full car configuration as a `CarInfo` object:

- Physics: maxSpeed, acceleration, friction
- Size: width, height
- Sensor: rayCount, rayLength, raySpread, rayOffset
- Brain: deep-cloned neural network (or undefined if no brain)

`Car.load(info)` applies a `CarInfo` to the car. If `info.brain` is present it's loaded; if `info.width`/`info.height` are present they override car dimensions. Sensor config is applied directly to the sensor instance.

**File format** (`.car` files): Plain JSON object matching the `CarInfo` interface. Legacy files using `let carInfo = {...}` format are also supported for loading.

### Movement Model

Each frame, `Car.#move()` executes:

```
1. ACCELERATION
   if (controls.forward) speed += acceleration
   if (controls.reverse) speed -= acceleration

2. FRICTION
   if (speed > 0) speed -= friction
   if (speed < 0) speed += friction
   if (|speed| < friction) speed = 0    // Prevent oscillation

3. SPEED CAPPING
   if (speed > maxSpeed) speed = maxSpeed
   if (speed < -maxSpeed/2) speed = -maxSpeed/2   // Reverse is slower

4. STEERING
   if (speed != 0):
     flip = (speed > 0) ? 1 : -1       // Reverse flips steering
     if (controls.left)  angle += 0.03 * flip
     if (controls.right) angle -= 0.03 * flip

5. POSITION UPDATE
   x -= sin(angle) * speed              // Heading-based movement
   y -= cos(angle) * speed              // Y-axis inverted (up = negative)
```

**Key behaviors**:

- Steering only works when the car is moving
- Reverse steering is inverted (turning left while reversing turns the car right)
- Friction brings the car to a natural stop
- Maximum reverse speed is 50% of forward max speed
- Steering rate is fixed at 0.03 rad/frame (~1.7°/frame)

### Default Parameters

| Parameter      | Typical Value | Description              |
| -------------- | ------------- | ------------------------ |
| `maxSpeed`     | 3             | Maximum forward velocity |
| `acceleration` | 0.2           | Speed increase per frame |
| `friction`     | 0.05          | Speed decrease per frame |
| `width`        | 30            | Car body width (px)      |
| `height`       | 50            | Car body height (px)     |

---

### Collision Detection

#### Polygon Generation (`#createPolygon`)

The car's collision boundary is a rotated rectangle:

```
Given: center (x, y), width, height, angle
radius = hypot(width, height) / 2
alpha = atan2(width, height)

4 corners at angles: angle ± alpha, angle ± (π - alpha)
Each corner: (x - sin(θ) * radius, y - cos(θ) * radius)
```

This creates a tight-fitting rotated bounding box that follows the car's heading.

#### Damage Assessment (`#assessDamage`)

Every frame, the car's polygon is tested against:

1. **Road borders** — Segments forming road edges
2. **Buildings** — Polygon bases
3. **Other cars** — Their polygon boundaries

Uses `polysIntersect(carPolygon, obstacle)` which checks all pairs of edges for intersection.

If any intersection found: `damaged = true`, car stops updating.

#### Collision Response (`handleCollisionWithRoadBorders`)

An alternative to the default "stop on damage" behavior. Defined in `simulatorUtils.ts` as a shared utility used by both the Simulator (collision border mode) and Race mode:

1. Find the nearest road skeleton/border segment to the car's position
2. Project each polygon corner onto that segment
3. Compute correction vector for each corner (segment point → polygon point)
4. Select the corner with the maximum correction magnitude
5. Adjust angle: +0.1 rad for right-side hits (polygon indices 0, 3), −0.1 for left (1, 2)
6. Translate car by the normalized correction vector
7. Reset `damaged = false` → car continues driving

This enables "bouncing off walls" behavior instead of instant death on collision.

> **Performance note**: With large populations (500+ cars), each car only
> receives _nearby_ polygons via spatial filtering (proximity threshold ≈ 250 px).
> This avoids the O(cars × total_polygons) explosion that would otherwise make
> sensor ray-casting and collision detection prohibitively expensive. See
> `simulator.ts` simple mode (binary-search on y-sorted traffic) and world mode
> (Manhattan-distance filter on border segment midpoints).

---

### AI Integration

When `type === 'AI'` and the car has a brain:

```typescript
// In update():
const offsets = sensor.readings.map((r) => (r == null ? 0 : 1 - r.offset));
const outputs = NeuralNetwork.feedForward(offsets, brain);

controls.forward = outputs[0]; // 1 or 0
controls.left = outputs[1];
controls.right = outputs[2];
controls.reverse = outputs[3];
```

The sensor readings are inverted (`1 - offset`) so that:

- 1.0 = obstacle touching the car
- 0.0 = no obstacle detected (ray missed)
- This gives the network higher values for closer obstacles

---

### Rendering

Cars are drawn as colored rectangles with an optional sprite overlay:

1. Save canvas state, translate to car center, rotate by angle
2. Draw color mask (rectangle with car color at 20% opacity)
3. Draw car sprite image on top (loaded from `/assets/car.png`)
4. Restore canvas state

**Pool cars** (top performers) get:

- Full opacity (100% vs 20% for regular AI cars)
- Gold highlight border
- Rank label (#1, #2, etc.) drawn above
- Visible sensor rays

---

## Sensor System (`ts/car/sensors/sensor.ts`)

### Class Structure

```typescript
class Sensor {
  car: Car; // Owner car
  rayCount: number; // Number of rays (e.g., 5)
  rayLength: number; // Max detection distance (e.g., 150)
  raySpread: number; // Angular spread (e.g., π/2 = 90°)
  rayOffset: number; // Vertical offset from car center
  rays: [Point, Point][]; // Ray start/end pairs
  readings: (IntersectionPoint | null)[]; // Detection results
}
```

### Ray Casting Process

#### Step 1: Generate Rays (`#castRays`)

```
For i = 0 to rayCount-1:
  t = (rayCount == 1) ? 0.5 : i / (rayCount - 1)
  rayAngle = lerp(raySpread/2, -raySpread/2, t) + car.angle

  start = (car.x, car.y - rayOffset)  // Offset forward from center
  end   = (car.x - sin(rayAngle) * rayLength,
           car.y - cos(rayAngle) * rayLength)
  rays[i] = [start, end]
```

Rays fan out from car center, spread evenly across `raySpread` radians.

#### Step 2: Get Readings (`#getReading`)

For each ray:

1. Test intersection against every segment in `polygons` (road borders, building edges, car polygons)
2. Collect all intersections with their `offset` (normalized distance along ray)
3. Return the one with **minimum offset** (closest obstacle)

```typescript
interface IntersectionPoint {
  x: number;
  y: number;
  offset: number; // 0 = at car, 1 = at ray end (max distance)
}
```

#### Step 3: Feed to Neural Network

```
For each reading:
  if (reading == null) → input = 0       // Nothing detected
  else → input = 1 - reading.offset      // Closer = higher value
```

### Visualization

Sensor rays are drawn in two segments:

- **Yellow line**: From car to intersection point (detected obstacle)
- **Black line**: From intersection to ray end (remaining unobstructed distance)
- If no intersection: full yellow ray

### Configuration

| Parameter   | Default | Description                    |
| ----------- | ------- | ------------------------------ |
| `rayCount`  | 5       | Number of sensor rays          |
| `rayLength` | 150     | Maximum detection distance     |
| `raySpread` | π/2     | Angular coverage (90°)         |
| `rayOffset` | 0       | Forward offset from car center |

---

## Fitness Evaluation

### Simple Road Simulator

```
fitness = startY - currentY    // Distance traveled upward
```

### World Simulator

```
fitness = distance along corridor from start to current position
```

The `fitness` value determines which cars survive to the next generation. Higher fitness = further traveled = better brain preserved.
