# Simulators & Training Environments

The project provides multiple simulation environments for training and testing autonomous cars, each suited to different complexity levels and use cases.

---

## Training Manager (`ts/ai-training/trainingManager.ts`)

The central training orchestrator that owns all population state and car generation logic. Simulators are thin animation shells that delegate training decisions to this class.

### Class Structure

```typescript
interface TrainingManagerOptions {
  evaluateFitness: (car: Car) => number;
  getStartInfo: () => { x: number; y: number; angle: number };
  onCarsCreated: (cars: Car[]) => void;
  onPauseToggle?: (paused: boolean) => void;
}

class TrainingManager {
  // Public state (read by simulators for rendering)
  cars: Car[];
  bestCar: Car | null;
  bestPool: Car[];
  iteration: number;
  maxDistancePassed: number;
  paused: boolean;

  // Car generation (fully internal)
  private generateCars(n, type, config): Car[]; // Uses getStartInfo() for position

  // Training lifecycle
  initializeCars(): void; // First-time setup (loads brains from localStorage)
  nextGeneration(): void; // Keeps top brains, mutates rest, increments gen
  newTraining(): void; // Resets to gen 0, no brains (fresh start)

  // Per-frame updates
  updateDistance(currentDist): void;
  updateStatsDisplay(alive, dead, frozen, maxDist): void;
  updateBestCarAndPool(): void;

  // Brain management
  updateCarsWithBrain(cars): void; // Apply brains from localStorage
  applyBrainPool(cars, pool): void; // Apply brains from in-memory pool
  save(): void; // Persist brains + car config to localStorage
  discard(): void; // Clear all saved data

  // Car config
  getSettings(): { carCount; poolSize; mutationRate };
  getCarSettings(): CarInfo;
  setCarSettings(info): void;
  applyCarSettingsToCars(cars): void;

  // File I/O
  saveCarToFile(): void; // Download best car as .car JSON
  // loadCarFromFile → auto-triggers newTraining()
}
```

### Key Design Decisions

1. **TrainingManager generates cars** — simulators only provide `getStartInfo()` (position + angle). This eliminates duplicated car-creation logic.

2. **Two distinct restart modes**:

   - `nextGeneration()` — preserves learning (elitism + mutation)
   - `newTraining()` — clean slate (no brains, generation counter reset)

3. **Auto-restart on config change** — all car parameter inputs have `change` listeners that call `newTraining()`. This ensures neural network architecture matches sensor config from generation 0.

4. **Loading .car files triggers fresh training** — if the file has no brain, stored brains are cleared; either way, `newTraining()` is called so the new config takes effect immediately.

### Genetic Algorithm Workflow

```
┌─────────────────────────────────────────────┐
│ 1. Load bestBrains + bestCarInfo from       │
│    localStorage (or legacy global carInfo)   │
│ 2. generateCars(N) using getStartInfo() +   │
│    car config from UI                       │
│ 3. Apply brains:                            │
│    - First K: exact copies (elitism)        │
│    - Rest: mutateFromPool(pool, rate)       │
│ 4. applyCarSettingsToCars() → ensure        │
│    physics/sensors match UI config          │
│    - If rayCount changed: rebuild brain     │
│      architecture [rayCount+1, 6, 4]        │
├─────────────────────────────────────────────┤
│ 5. Simulation runs...                       │
│    - Each frame: update all cars            │
│    - Track alive/dead/frozen counts         │
│    - Update best distance stat              │
│    - updateBestCarAndPool() per frame       │
├─────────────────────────────────────────────┤
│ 6. User clicks "Next Gen" (🧬):            │
│    - Sort by fitness, take top K brains     │
│    - nextGeneration() → gen++ + mutations   │
│ 7. User clicks "New Train" (🔄):           │
│    - newTraining() → gen=0, no brains       │
│ 8. User clicks "Save" (💾):                │
│    - Top K brains + CarInfo → localStorage  │
└─────────────────────────────────────────────┘
```

### Control Panel UI (`html/controlPanel.html`)

Loaded via XMLHttpRequest into simulator pages. Contains:

| Control       | Type       | Range      | Purpose                                       |
| ------------- | ---------- | ---------- | --------------------------------------------- |
| Car Count     | Number     | 0–5000     | Population per generation                     |
| Pool Size     | Number     | 1–20       | Number of elite survivors                     |
| Mutation Rate | Number     | 0.001–1.0  | Randomization strength                        |
| Save          | Button     | —          | Persist brains + car config to localStorage   |
| Discard       | Button     | —          | Clear all saved data from localStorage        |
| Pause         | Button     | —          | Toggle simulation pause                       |
| Next Gen      | Button     | —          | Next generation (keeps top brains + mutates)  |
| New Train     | Button     | —          | Fresh training (gen 0, no brains)             |
| Load World    | File input | .world     | Load custom map                               |
| Network       | Checkbox   | —          | Show/hide neural network visualizer           |
| Max Speed     | Number     | 1–20       | Car maximum speed (change → new training)     |
| Accel         | Number     | 0.01–1     | Car acceleration (change → new training)      |
| Friction      | Number     | 0.01–0.5   | Car friction (change → new training)          |
| Width         | Number     | 10–100     | Car body width (change → new training)        |
| Height        | Number     | 20–150     | Car body height (change → new training)       |
| Rays          | Number     | 1–20       | Sensor ray count (change → new training)      |
| Ray Len       | Number     | 50–500     | Sensor ray length (change → new training)     |
| Ray Spread    | Number     | 0.1–6.28   | Sensor angular spread (change → new training) |
| Ray Offset    | Number     | -3.14–3.14 | Sensor angular offset (change → new training) |
| Save Car      | Button     | —          | Download best car as `.car` JSON file         |
| Load Car      | File input | .car/.json | Load car config (triggers new training)       |

**Car config layout**: Uses a 2-column CSS grid (`.car-config-grid`) to fit on small screens.

**Statistics display**:

- Generation count
- Alive / Dead / Frozen car counts
- Best distance (all-time)

---

## Simple Road Simulator (`ts/ai-training/simpleRoadSimulator.ts`)

### Purpose

Entry-level training environment — a straight 3-lane road with random traffic obstacles. Ideal for initial neural network evolution before testing on complex maps.

### Setup

```typescript
const road = new Road(canvas.width / 2, canvas.width * 0.9, 3); // Centered, 3 lanes
const CAR_START_Y = 100;

const trainingManager = new TrainingManager({
  evaluateFitness: (car) => CAR_START_Y - car.y, // Distance = upward travel
  getStartInfo: () => ({
    x: road.getLaneCenter(1),
    y: CAR_START_Y,
    angle: startAngle,
  }),
  onCarsCreated: () => {
    traffic = generateTraffic();
    lastGeneratedTrafficY = -700;
  },
});

trainingManager.initializeCars();
```

### Traffic Generation

```
generateTrafficRow(y):
  - Choose 1-2 of 3 lanes to block (always leave at least 1 gap)
  - Place DUMMY cars in blocked lanes at position y
  - DUMMY cars drive forward at ~2 speed

Initial traffic rows at: y = -100, -300, -500, -700
Dynamic: New rows generated ahead of leader, old rows culled behind

Spatial optimization: Traffic sorted by y each frame;
  each AI car uses binary search to find only nearby traffic (±250 px).
```

### Visualization

- **Road**: Gray with white lane dividers (dashed)
- **Regular AI cars**: 20% opacity (semi-transparent)
- **Pool cars**: 100% opacity, gold border, rank labels (#1, #2...)
- **Sensors**: Visible on pool cars only
- **Network canvas**: Shows best car's brain in real-time

### Fitness

`fitness = CAR_START_Y - car.y` — simply how far upward the car traveled.

---

## Main Simulator (`ts/ai-training/simulator.ts`)

### Purpose

Full-featured training environment that loads custom world maps with roads, buildings, intersections, and corridors. The primary environment for advanced training.

### Class Structure

```typescript
class Simulator {
  gameCanvas: HTMLCanvasElement;
  networkCanvas: HTMLCanvasElement;
  miniMapCanvas: HTMLCanvasElement;
  world: World | null;
  viewport: Viewport | null;
  miniMap: MiniMap | null;
  roadBorders: Point[][] | null;
  trainingManager: TrainingManager; // Owns cars, bestCar, bestPool
}
```

### Initialization Flow

1. Load `.world` file (from file input or default)
2. `World.load(worldInfo)` → reconstruct full world
3. `world.generateCorridor(start, end)` → define training path
4. TrainingManager generates cars at start marking position via `getStartInfo()`
5. Apply brain pool from localStorage
6. Begin animation loop

### Key Features

- **Custom maps**: Load any `.world` file for diverse training environments
- **Corridor-based fitness**: Distance along corridor skeleton, not just straight-line
- **Viewport following**: Camera centers on best car with zoom/pan
- **Mini-map**: Shows all car positions on the full world graph
- **Network visualizer**: Best car's brain displayed in real-time
- **Full obstacles**: Road borders + buildings as collision polygons

### Animation Loop

```typescript
animate(time) {
  const cars = trainingManager.cars;
  const bestCar = trainingManager.bestCar;

  // Update all cars against nearby road borders only (spatial filtering)
  for (car of cars) car.update(nearbyBorders)

  // Update training state
  trainingManager.updateBestCarAndPool()

  // Center viewport on best car
  viewport.offset = { x: -bestCar.x, y: -bestCar.y }

  // Draw world, cars, network, mini-map
  world.draw(ctx, viewPoint)
  drawSimulatorCars(ctx, cars, trainingManager.bestPool, ...)
  Visualizer.drawNetwork(networkCtx, bestCar.brain)
  miniMap.draw(viewPoint)

  requestAnimationFrame(animate)
}
```

### Performance: Spatial Filtering

With large populations (500+ cars), passing all road border segments to every
car's `update()` becomes a bottleneck due to O(cars × rays × segments)
intersection tests.

Both simulators use **spatial proximity filtering** to reduce the work:

| Simulator   | Obstacle type         | Filtering strategy                                |
| ----------- | --------------------- | ------------------------------------------------- |
| Simple Road | Traffic cars (moving) | Sort traffic by y, binary-search for nearby range |
| World       | Road borders (static) | Manhattan-distance filter using segment midpoints |

**Threshold**: 250 px (sensor ray length 150 + car height 50 + buffer).

Each car only receives polygons/segments within this threshold, typically
reducing the per-car polygon count from hundreds to ~5–15, yielding roughly
a 10× speedup at 500+ car populations.
}

````

---

## Camera View Simulator (`ts/simulators/cameraViewSimulator.ts`)

### Purpose

Explores vision-based navigation by rendering the world from the car's perspective using 3D projection.

### Class Structure

```typescript
class CameraViewSimulator {
  gameCanvas: HTMLCanvasElement; // Top-down world view
  cameraCanvas: HTMLCanvasElement; // 3D perspective view
  miniMapCanvas: HTMLCanvasElement;
  world: World;
  camera: Camera;
  viewport: Viewport;
  miniMap: MiniMap;
  cars: Car[];
  myCar: Car | null;
}
````

### Key Features

- **Split view**: Top-down world + 3D camera perspective side by side
- **Camera following**: 3D camera positioned behind and above the car
- **Frustum culling**: Only renders objects within camera's field of view
- **3D projection**: Buildings and trees rendered with perspective depth
- **Rotated mini-map**: Aligned with car's heading for intuitive navigation

### Rendering Pipeline

```
1. Top-down canvas:
   - Standard world rendering
   - Car position indicator
   - Camera frustum visualization

2. Camera canvas:
   - Camera.move(car) → update position/angle
   - Filter objects by frustum intersection
   - Project 2D polygons to 3D perspective
   - Sort by distance (painter's algorithm)
   - Draw with depth-based shading
```

---

## Simulator Utilities (`ts/ai-training/simulatorUtils.ts`)

Shared rendering logic for the training simulators.

### `drawSimulatorCars(ctx, cars, bestPool, viewportTop, viewportBottom, drawMasks, poolColor)`

Drawing hierarchy:

1. **Regular AI cars**: 20% alpha, skip pool members, viewport-culled
2. **Pool cars**: 100% alpha, custom color border, visible sensors, rank label
3. **KEYS car**: Always full opacity

### `drawCarName(ctx, car)`

Draws rank label (#1, #2, etc.) centered at car position with:

- White text with black shadow for contrast
- Font size proportional to car size

---

## Racing Mode (`ts/games/race.ts`)

### Purpose

Competitive mode where the player races against AI cars on a corridor path.

### Class Structure

```typescript
class Race {
  gameCanvas, cameraCanvas, miniMapCanvas: HTMLCanvasElement
  world: World
  camera: Camera
  viewport: Viewport
  miniMap: MiniMap
  cars: Car[]
  myCar: Car | null
  roadBorders: [Point, Point][]
  frameCount: number
  started: boolean
  controls: Controls | null
}
```

### Race Flow

```
1. Load world with Start + Target markings
2. Generate corridor (start → target)
3. Create player car + AI opponents
4. AI brains: loaded from localStorage, top 2 unmutated, rest mutated at 0.1
5. Countdown: 3... 2... 1... GO! (with sound effects)
6. Race starts: all cars drive simultaneously
7. Progress tracked: distance along corridor / total corridor length
8. First to progress >= 1.0 wins
9. Finish time displayed
```

### Controls

| Mode     | Input                   | File               |
| -------- | ----------------------- | ------------------ |
| Keyboard | WASD/Arrows             | `race.html`        |
| Camera   | Blue markers via webcam | `race-camera.html` |
| Phone    | Device tilt             | `race-phone.html`  |

### Sound Effects

```typescript
function taDaa(); // Victory celebration (frequency sweep)
function explode(); // Crash (multi-oscillator noise)
function beep(freq, waveType); // Countdown beep
```

Engine sound via `Engine` class — LFO-modulated oscillator with volume/pitch control based on car speed.

---

## Viewport System (`ts/viewport/viewport.ts`)

### Transformation

```typescript
class Viewport {
  canvas: HTMLCanvasElement;
  zoom: number; // 1.0 = normal, higher = zoomed out
  center: Point; // Canvas center pixel
  offset: Point; // World origin offset
  drag: DragState; // Middle-mouse drag tracking
}
```

**Transformation pipeline** (applied to canvas context):

```
ctx.translate(center.x, center.y)    // Move origin to canvas center
ctx.scale(1/zoom, 1/zoom)            // Apply zoom
ctx.translate(offset.x + dragOffset.x, offset.y + dragOffset.y)  // Apply pan
```

**Mouse → World coordinate conversion**:

```
worldPos = (canvasPos - center) * zoom - offset
```

**Controls**:
| Input | Action |
|-------|--------|
| Scroll wheel | Zoom in/out (step: 0.1, range: 1–5×) |
| Middle-click + drag | Pan viewport |

---

## Mini-Map System (`ts/mini-map/miniMap.ts`)

```typescript
class MiniMap {
  canvas: HTMLCanvasElement;
  graph: Graph;
  size: number; // Canvas dimension in pixels
  scaler: number; // World-to-minimap scale factor
  cars: IMiniMapCar[];

  draw(viewPoint: Point, options?: IMiniMapDrawOptions): void;
}
```

**Rendering**:

- All graph segments drawn as thin lines
- Cars drawn as small circles (gray if damaged, else car color)
- Viewport center highlighted
- Everything scaled to fit mini-map canvas size
