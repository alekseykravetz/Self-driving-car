# Simulators & Training Environments

The project provides multiple simulation environments for training and testing autonomous cars, each suited to different complexity levels and use cases.

---

## Training Manager (`ts/ai-training/trainingManager.ts`)

The shared control system orchestrating genetic training across all simulators.

### Class Structure

```typescript
interface TrainingManagerOptions {
  getCars: () => Car[]
  evaluateFitness: (car: Car) => number
  onRestart: (bestBrainPool: NeuralNetwork[]) => void
  onPauseToggle?: (paused: boolean) => void
}

class TrainingManager {
  // State
  iteration: number
  maxDistancePassed: number
  paused: boolean

  // UI Elements (bound from controlPanel.html)
  carCountInput: HTMLInputElement      // Population size
  thresholdInput: HTMLInputElement     // Mutation rate
  poolCountInput: HTMLInputElement     // Elite pool size
  statGenEl, statAliveEl, statDeadEl, statFrozenEl, statDistEl: HTMLElement

  // Methods
  getSettings(): { carCount: number; poolSize: number; mutationRate: number }
  togglePause(forceState?: boolean): void
  restart(): void
  save(): void
  discard(): void
  updateCarsWithBrain(cars: Car[]): void
  applyBrainPool(cars: Car[], bestBrainPool: NeuralNetwork[]): void
  updateDistance(currentDist: number): void
  updateStatsDisplay(alive, dead, frozen, maxDist): void
  updateBestCarAndPool(cars: Car[]): { bestCar: Car; bestPool: Car[] }
}
```

### Genetic Algorithm Workflow

```
┌─────────────────────────────────────────────┐
│ 1. Load bestBrains from localStorage        │
│ 2. Generate N cars                          │
│ 3. Apply brains:                            │
│    - First K: exact copies (elitism)        │
│    - Rest: mutateFromPool(pool, rate)       │
├─────────────────────────────────────────────┤
│ 4. Simulation runs...                       │
│    - Each frame: update all cars            │
│    - Track alive/dead/frozen counts         │
│    - Update best distance stat              │
├─────────────────────────────────────────────┤
│ 5. User clicks "Save" or auto-save:        │
│    - Sort cars by fitness                   │
│    - Take top K → new bestPool             │
│    - Store in localStorage                  │
│ 6. Restart → back to step 1                │
└─────────────────────────────────────────────┘
```

### Control Panel UI (`html/controlPanel.html`)

Loaded via XMLHttpRequest into simulator pages. Contains:

| Control       | Type       | Range     | Purpose                             |
| ------------- | ---------- | --------- | ----------------------------------- |
| Car Count     | Slider     | 0–5000    | Population per generation           |
| Pool Size     | Slider     | 1–20      | Number of elite survivors           |
| Mutation Rate | Slider     | 0.001–1.0 | Randomization strength              |
| Save          | Button     | —         | Persist best brains to localStorage |
| Discard       | Button     | —         | Clear saved brains                  |
| Pause         | Button     | —         | Toggle simulation pause             |
| Restart       | Button     | —         | New generation from current pool    |
| Load World    | File input | .world    | Load custom map                     |

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
  getCars: () => cars,
  evaluateFitness: (car) => CAR_START_Y - car.y, // Distance = upward travel
  onRestart: (pool) => {
    /* regenerate cars with pool */
  },
});
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
  cars: Car[];
  bestCar: Car | null;
  roadBorders: Point[][] | null;
  trainingManager: TrainingManager;
}
```

### Initialization Flow

1. Load `.world` file (from file input or default)
2. `World.load(worldInfo)` → reconstruct full world
3. `world.generateCorridor(start, end)` → define training path
4. Generate cars at start marking position
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
  // Update all cars against nearby road borders only (spatial filtering)
  for (car of cars) car.update(nearbyBorders)

  // Find best performer
  { bestCar, bestPool } = trainingManager.updateBestCarAndPool(cars)

  // Center viewport on best car
  viewport.offset = { x: -bestCar.x, y: -bestCar.y }

  // Draw world, cars, network, mini-map
  world.draw(ctx, viewPoint)
  drawSimulatorCars(ctx, cars, bestPool, ...)
  Visualizer.drawNetwork(networkCtx, bestCar.brain)
  miniMap.draw(viewPoint, { cars })

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
