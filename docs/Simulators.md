# Simulators & Training Environments

The project provides multiple simulation environments for training and testing autonomous cars, each suited to different complexity levels and use cases.

---

## Training Manager (`ts/ai-training/trainingManagerPanel.ts`)

The central training orchestrator — a custom HTML element (`<training-manager-panel>`) that owns both the UI panel and all population/training state. Simulators are thin animation shells that configure this element with callbacks and read its public state.

### Custom Element Pattern

All simulator panels follow the same custom element pattern:

| Element                       | Tag                        | Responsibility                                   |
| ----------------------------- | -------------------------- | ------------------------------------------------ |
| `TrainingManagerPanelElement` | `<training-manager-panel>` | Training UI + genetic algorithm + car generation |
| `TopControlsPanelElement`     | `<top-controls-panel>`     | Border mode, tracking mode, world file loading   |
| `ViewControlsPanelElement`    | `<view-controls-panel>`    | Layout toggle, camera/visualizer/minimap toggles |

Each element:

1. Renders its own HTML template in `connectedCallback()`
2. Queries its own DOM subtree via `this.querySelector()` (scoped, not global)
3. Binds event listeners internally
4. Exposes state via public properties/getters and accepts callbacks via setter methods

### Class Structure

```typescript
interface TrainingManagerOptions {
  evaluateFitness: (car: Car) => number;
  getStartInfo: () => { x: number; y: number; angle: number };
  onCarsCreated: (cars: Car[]) => void;
  onPauseToggle?: (paused: boolean) => void;
}

class TrainingManagerPanelElement extends HTMLElement {
  // Public state (read by simulators for rendering)
  cars: Car[];
  bestCar: Car | null;
  bestPool: Car[];
  iteration: number;
  maxDistancePassed: number;
  paused: boolean;

  // Lifecycle
  connectedCallback(): void; // Renders template HTML
  configure(options): void; // Sets callbacks, inits DOM refs & listeners

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

customElements.define('training-manager-panel', TrainingManagerPanelElement);
```

### Usage in Simulator

```typescript
// Get element from DOM (already rendered by browser via <training-manager-panel> tag)
this.trainingManager = document.querySelector(
  'training-manager-panel',
) as TrainingManagerPanelElement;

// Configure with callbacks
this.trainingManager.configure({
  evaluateFitness: (car) => car.fitness,
  getStartInfo: () => this.#getStartInfo(),
  onCarsCreated: (cars) => {
    this.world.cars = cars;
  },
  onPauseToggle: (paused) => {
    /* cancel/resume animation */
  },
});

// Initialize population
this.trainingManager.initializeCars();
```

### Key Design Decisions

1. **TrainingManagerPanelElement generates cars** — simulators only provide `getStartInfo()` (position + angle). This eliminates duplicated car-creation logic.

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

### Control Panel UI (`<training-manager-panel>`)

The training panel is a custom HTML element that renders its own template. It is placed directly in the HTML:

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

**Pool Statistics table** (below Statistics):

- Displays the current best pool cars ordered by fitness (best first)
- Columns: rank (#), car name, fitness value
- Car names are assigned as the pool index+1 — this lets you see if the same cars from a previous generation remain dominant

**Status dots** (colored indicators on section titles):

Each dot shows the localStorage sync state for that section:

| Section    | Green                                  | Orange                                         | Red                  |
| ---------- | -------------------------------------- | ---------------------------------------------- | -------------------- |
| Storage    | `bestBrains` exists in localStorage    | —                                              | No stored brains     |
| Pool       | Stored pool length matches pool size   | Stored pool length differs from current config | No stored brains     |
| Car Config | Stored config matches current controls | At least one parameter differs                 | No stored car config |

---

## Simple Road Simulator (Simple Mode)

### Purpose

Entry-level training environment — a straight 3-lane road with random traffic obstacles. Ideal for initial neural network evolution before testing on complex maps. Now unified into the main Simulator via `?mode=simple` URL parameter.

### Access

Navigate to `/html/simulator?mode=simple` (or click "Simple Road" on the landing page).

### Architecture

Simple mode reuses the `Simulator` class with a different initialization path:

```typescript
// Mode detected from URL parameter
const params = new URLSearchParams(window.location.search);
this.mode = params.get('mode') === 'simple' ? 'simple' : 'world';
```

Instead of loading a `.world` file, simple mode creates a `SimpleWorld` instance — a lightweight `IWorld` implementation:

```typescript
class SimpleWorld implements IWorld {
  graph: Graph; // Minimal 2-node graph
  roadBorders: Segment[]; // Two vertical border segments (left + right edges)
  buildings: Building[]; // Empty array (no 3D buildings)
  trees: Tree[]; // Empty array (no trees)
  corridor: null; // No pathfinding needed
  markings: Marking[]; // One synthetic Start marking
  cars: Car[];
  bestCar: Car | null;

  getLaneCenter(laneIndex: number): number;
  getLaneCount(): number;
  generateCorridor(): void; // No-op
  draw(ctx, viewPoint): void; // Renders lane dividers + borders
}
```

### Traffic Generation (`ts/ai-training/trafficGenerator.ts`)

```
generateInitialTraffic(getLaneCenter, startAngle):
  - Hardcoded 7 cars in rows at y = -100, -300, -500, -700
  - Each row has at least one empty lane

generateTrafficRow(y, getLaneCenter, laneCount, startAngle):
  - Choose 1-2 lanes to block (always leave at least 1 gap)
  - Place DUMMY cars in blocked lanes at position y
  - DUMMY cars drive forward at speed 2

Dynamic generation (in draw loop):
  - New rows spawned 1500 units ahead of leader
  - Old rows culled 600 units behind
  - Traffic sorted by y each frame for binary-search spatial lookups
```

### UI in Simple Mode

- **Hidden**: Top controls (border mode, tracking mode, world loader)
- **Visible**: View controls (layout toggle, 3D camera, network visualizer toggles)
- **Visible**: Training control panel (car count, mutation, save/discard/restart)
- **Disabled**: Mini-map checkbox (no minimap data for straight road)

### 3D Camera in Simple Mode

The Camera works with `SimpleWorld` because it only reads `world.buildings` (empty), `world.trees` (empty), `world.roadBorders` (valid segments), `world.bestCar`, and `world.cars`. Result: renders the road surface and cars in 3D perspective with no buildings or trees visible.

### Fitness

`fitness = startY - car.y` — how far upward the car traveled from the start position.

---

## Main Simulator (`ts/ai-training/simulator.ts`)

### Purpose

Unified training environment supporting two modes:

- **World mode** (default): Loads custom world maps with roads, buildings, intersections, and corridors
- **Simple mode** (`?mode=simple`): Straight 3-lane road with dynamic traffic (see above)

### IWorld Interface (`ts/world-editor/types.ts`)

Both `World` and `SimpleWorld` implement the `IWorld` interface, allowing the Simulator, Camera, and other components to work with either representation:

```typescript
interface IWorld {
  graph: Graph;
  cars: Car[];
  bestCar: Car | null;
  markings: Marking[];
  roadBorders: Segment[];
  corridor: Corridor | null;
  buildings: Building[];
  trees: Tree[];
  zoom?: number;
  offset?: Point;
  generateCorridor(start: Point, end: Point): void;
  draw(
    ctx: CanvasRenderingContext2D,
    viewPoint: Point,
    showStartMarkings?: boolean,
  ): void;
}
```

### Class Structure

```typescript
class Simulator {
  mode: 'world' | 'simple'; // Detected from URL ?mode= param
  gameCanvas: HTMLCanvasElement;
  networkCanvas: HTMLCanvasElement;
  miniMapCanvas: HTMLCanvasElement;
  cameraCanvas: HTMLCanvasElement;
  world: IWorld | null; // World or SimpleWorld
  viewport: Viewport | null;
  miniMap: MiniMap | null;
  camera: Camera | null;
  roadBorders: Point[][] | null;
  traffic: Car[]; // Simple mode only
  lastGeneratedTrafficY: number; // Simple mode only
  borderMode: 'none' | 'damage' | 'collision'; // Default: 'damage'
  trackingMode: 'none' | 'best' | 'keys'; // Default: 'best'
  trainingManager: TrainingManagerPanelElement;
}
```

### Initialization Flow

1. Load `.world` file (from file input or default)
2. `World.load(worldInfo)` → reconstruct full world
3. `world.generateCorridor(start, end)` → define training path
4. TrainingManagerPanelElement generates cars at start marking position via `getStartInfo()`
5. Apply brain pool from localStorage
6. Begin animation loop

### Key Features

- **Custom maps**: Load any `.world` file for diverse training environments
- **Corridor-based fitness**: Distance along corridor skeleton, not just straight-line
- **Viewport following**: Camera centers on best car with zoom/pan
- **Mini-map**: Shows all car positions on the full world graph
- **Network visualizer**: Best car's brain displayed in real-time
- **3D Camera view**: Optional perspective rendering following best car
- **Full obstacles**: Road borders + buildings as collision polygons
- **Border mode selection**: Three modes for how cars interact with road borders

### Border Modes

The simulator provides three radio-button options (displayed in the `<top-controls-panel>` custom element) for how cars interact with road borders:

| Mode       | Icon | Behavior                                                   |
| ---------- | ---- | ---------------------------------------------------------- |
| No borders | 🚫   | Cars ignore road borders entirely (no collision detection) |
| Damage     | 💀   | Cars are marked as damaged on collision and stop (default) |
| Collision  | 🛡️   | Cars are pushed back onto the road and continue driving    |

The collision mode uses the shared `handleCollisionWithRoadBorders()` utility, which projects car polygon points onto the nearest road skeleton segment and corrects position/angle.

### Tracking Modes

The `<top-controls-panel>` element also includes a **Tracking** radio-button group that controls which car the viewport and 3D camera follow:

| Mode     | Icon | Behavior                                                     |
| -------- | ---- | ------------------------------------------------------------ |
| No track | ✋   | Viewport stays in place; user can freely drag/pan the canvas |
| Best car | 🏆   | Centers viewport + camera on the best-fitness car (default)  |
| Keys car | 🎮   | Centers viewport + camera on the user-controlled (KEYS) car  |

When tracking is disabled (`none`), the viewport offset is not updated each frame, allowing the user to explore the world freely. The KEYS car is always present alongside AI cars (generated first with `controlType = "KEYS"`), so the user can drive manually and switch the view to follow it.

### Animation Loop

```typescript
animate(time) {
  const cars = trainingManager.cars;
  const bestCar = trainingManager.bestCar;

  // Update cars based on borderMode:
  for (car of cars) {
    if (car.damaged && borderMode !== 'collision') {
      deadCount++; // Skip damaged cars
    } else {
      if (car.damaged && borderMode === 'collision') {
        handleCollisionWithRoadBorders(car, bordersToCheck);
      }
      // Pass nearby borders (empty array if borderMode === 'none')
      car.update(borderMode === 'none' ? [] : nearbyBorders);
    }
  }

  // Update training state
  trainingManager.updateBestCarAndPool()

  // Center viewport based on tracking mode (none / best / keys)
  const target = getTrackTarget(bestCar) // null if 'none'
  if (target) viewport.offset = { x: -target.x, y: -target.y }

  // Draw world, cars, network, mini-map, camera
  world.draw(ctx, viewPoint)
  drawSimulatorCars(ctx, cars, trainingManager.bestPool, ...)
  Visualizer.drawNetwork(networkCtx, bestCar.brain)
  miniMap.draw(viewPoint)
  if (target) camera.move(target)
  camera.render(cameraCtx, world)

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

### `handleCollisionWithRoadBorders(car, bordersToCheck)`

Shared collision-response utility used by both the Simulator (in collision mode) and Race mode. Algorithm:

1. Find nearest segment from `bordersToCheck` (corridor skeleton or road borders)
2. Project each polygon corner onto that segment
3. Compute correction vectors (segment projection point → polygon point)
4. Select the corner with the largest correction magnitude
5. Adjust car angle (±0.1 rad based on which side hit: indices 0,3 → right, 1,2 → left)
6. Move car by the normalized correction vector
7. Reset `car.damaged = false` so the car continues driving

---

## Racing Mode (`ts/games/race.ts`)

### Purpose

Competitive mode where the player races against AI cars on a corridor path.

### Class Structure

```typescript
class Race {
  gameCanvas, cameraCanvas, miniMapCanvas: HTMLCanvasElement
  topControlsPanel: TopControlsPanelElement
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
3. Create player car (KEYS) + AI opponents
4. AI brains: loaded from pool in localStorage
   - Cars within pool size get exact pool configs (no mutation)
   - Cars beyond pool size get mutated copies of pool[0]
   - Player (KEYS) car is never modified by pool
5. Countdown: 3... 2... 1... GO! (with sound effects)
6. Race starts: all cars drive simultaneously
7. Border mode from TopControlsPanel controls collision behavior
8. Progress tracked: distance along corridor / total corridor length
9. First to progress >= 1.0 wins
10. Finish time displayed
```

### Top Controls Panel Integration

Race uses `<top-controls-panel>` (same as Simulator) for all controls:

- **World loading**: `WorldLoader` binds to `#loadWorldInput` inside the panel
- **Car pool loading**: `CarLoader` binds to `#loadCarInput` inside the panel. Accepts ALL selected `.car` files regardless of param differences (unlike Simulator which requires matching params). Each pool car is applied as-is to its corresponding AI car.
- **Border mode**: Controls how cars interact with road borders (same 3 modes as Simulator)
- **Tracking mode**: Controls which car the viewport/camera follows

### Car Pool Loading (Race-Specific Behavior)

Unlike the Simulator (which rejects car files with different parameters), Race mode accepts ALL loaded car files into the pool:

1. All `.car` files are parsed and stored as-is in `localStorage("bestPool")`
2. AI cars `[0..poolSize-1]` receive exact pool configs (brain + physics + sensors) — no mutation
3. AI cars beyond pool size receive mutated copies of `pool[0]`
4. The KEYS car (player) is never affected by pool loading
5. Race reinitializes with the new pool

This allows racing different car configurations against each other (e.g., a fast car with few sensors vs. a slow car with many sensors).

### Collision Handling

Collision behavior is now controlled by the panel's border mode:

| Mode      | Behavior in Race                                          |
| --------- | --------------------------------------------------------- |
| None 🚫   | Cars ignore road borders (sensors see nothing)            |
| Damage 💀 | Cars are damaged on collision and stop driving (default)  |
| Collision 🛡️ | Cars are pushed back onto road and continue (old behavior) |

The collision mode uses the shared `handleCollisionWithRoadBorders()` utility from `simulatorUtils.ts`.

### Tracking Modes in Race

| Mode     | Behavior                                    |
| -------- | ------------------------------------------- |
| None ✋  | Viewport stays in place (free drag/pan)     |
| Best 🏆  | Follows the leading car by progress         |
| Keys 🎮  | Follows the player-controlled car (default) |

### Controls

| Mode     | Input                   | URL                      |
| -------- | ----------------------- | ------------------------ |
| Keyboard | WASD/Arrows             | `race.html`              |
| Camera   | Blue markers via webcam | `race.html?mode=camera`  |
| Phone    | Device tilt             | `race.html?mode=phone`   |

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
````
