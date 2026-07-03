# Simulators & Training Environments

The project provides multiple simulation environments for training and testing autonomous cars. All training is orchestrated by the `<training-panel>` custom element.

---

## Simulator Shell (`ts/simulator/core/simulatorShell.ts`)

Every canvas-based simulator shares the same non-domain scaffolding: four
canvases, a viewport/camera/mini-map, the shared world-toolbar / layout-toolbar /
animation-loop-toolbar panels, responsive layout, the neural-network visualizer,
and a render-throttled animation loop. That scaffolding lives in one reusable
abstract base class, `SimulatorShell`, so each concrete simulator only writes its
own behaviour.

```typescript
abstract class SimulatorShell {
  // Owned scaffolding (protected, available to subclasses)
  protected gameCanvas / gameCtx;
  protected networkCanvas / networkCtx;
  protected miniMapCanvas;
  protected cameraCanvas / cameraCtx;
  protected viewport: Viewport | null;
  protected miniMap: MiniMap | null;
  protected camera: Camera | null;
  protected toolbarPanel: WorldToolbarElement;
  protected layoutToolbar: LayoutToolbarElement;

  constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas);

  // Shared helpers
  protected resizeLayout(): void;                       // responsive multi-panel resize
  protected drawNetworkVisualizer(time, brain): void;   // gated by the visualizer toggle
  protected animate(time: number): void;                // render-throttled RAF loop

  // Subclass hooks
  protected abstract update(): void;        // per-frame physics/state step
  protected abstract draw(time: number): void;  // per-render draw pass
  protected isPaused(): boolean;            // default: never paused
  protected onPausedRender(): void;         // default: no-op
}
```

### Responsibilities split

| Concern                                       | Owner             |
| --------------------------------------------- | ----------------- |
| Canvases + 2D contexts                        | `SimulatorShell`  |
| Viewport / camera / mini-map references       | `SimulatorShell`  |
| Toolbar + layout-toolbar panel wiring         | `SimulatorShell`  |
| Responsive layout + mobile defaults           | `SimulatorShell`  |
| Network visualizer rendering                  | `SimulatorShell`  |
| Render-throttled `requestAnimationFrame` loop | `SimulatorShell`  |
| World loading, car physics, spawning, fitness | Concrete subclass |

### Animation loop contract

`animate()` runs every frame and is never cancelled. It reads the live
`renderInterval` from the animation-loop-toolbar panel, steps `update()` every
frame (unless `isPaused()` returns true), and runs the heavier `draw()` pass only
on render frames. The shared `isPaused()` reads the play/pause toggle owned by
`<animation-loop-toolbar>`. While paused, render frames call `onPausedRender()`
instead of `update()`. Subclasses call `this.animate(0)` once at the end of their
constructor to start the loop.

### Animation Loop Toolbar (`ts/simulator/panels/animationLoopToolbar.ts`)

The `<animation-loop-toolbar>` custom element provides real-time controls and monitoring:

**Features:**

1. **Play/Pause Toggle** (⏸️ / ▶️)

   - Pauses and resumes the simulation
   - Respects pause state for time tracking
   - Shared across all SimulatorShell pages

2. **Render Interval Throttle** (e.g., "1 / 60")

   - Controls how many animation frames pass between renders
   - Physics always runs at full 60 FPS; only draw pass is throttled
   - Higher values = more frames skipped = faster simulation with choppier visuals
   - Useful for speeding up training without affecting physics accuracy

3. **Elapsed Simulation Time** (HH:MM:SS)

   - Displays time since simulation started
   - Only counts frames when simulation is running
   - Reset button (⟲) clears the counter
   - Based on `SIMULATION_FPS = 60` constant (see Units.md)

4. **Rendering FPS Counter** (0-60 fps)
   - Shows actual rendering frames per second
   - Reflects the effect of `renderInterval`
   - Measured using `performance.now()`, updates once per second
   - Example: `renderInterval = 60` shows ~1 FPS (only 1 of 60 frames rendered visually)

**Code interface:**

```typescript
class AnimationLoopToolbarElement extends HTMLElement {
  // State
  get paused(): boolean;
  get renderInterval(): number; // [1, 10]
  get elapsedTime(): number; // total frames

  // Control
  togglePause(forceState?: boolean): void;
  setPaused(paused: boolean): void;
  resetTime(): void;
  recordFrame(isRenderFrame: boolean = false): void; // called by SimulatorShell.animate()
}
```

### Subclasses

| Class               | File                                         | Page              |
| ------------------- | -------------------------------------------- | ----------------- |
| `TrainingSimulator` | `ts/simulator/training/trainingSimulator.ts` | `/html/simulator` |
| `TrafficSimulator`  | `ts/simulator/traffic/trafficSimulator.ts`   | `/html/traffic`   |

---

## Training Manager (`ts/simulator/training/trainingPanel.ts`)

The central training orchestrator — a custom HTML element that owns both the UI panel and all population/training state. Simulators are thin animation shells that configure this element with callbacks and read its public state.

### Custom Element Pattern

| Element                       | Tag                        | Responsibility                                                          |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| `TrainingPanelElement`        | `<training-panel>`         | Training UI + genetic algorithm + car generation                        |
| `AnimationLoopToolbarElement` | `<animation-loop-toolbar>` | Play/pause, render throttle, time display, FPS counter                  |
| `WorldToolbarElement`         | `<world-toolbar>`          | Border mode, tracking mode, world/car loading                           |
| `LayoutToolbarElement`        | `<layout-toolbar>`         | Layout toggle, camera/visualizer/minimap toggles                        |
| `ShortcutsToolbarElement`     | `<shortcuts-toolbar>`      | Per-page keyboard-shortcut indicators (momentary + click-latch toggles) |

> `AnimationLoopToolbarElement`, `WorldToolbarElement`, and `ShortcutsToolbarElement`
> live in the shared `ts/panels/` directory (not the simulator domain) and are reused
> across the simulator, race, Live Traffic Jam, and World Editor pages.

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
}

class TrainingPanelElement extends HTMLElement {
  // Public state (read by simulators for rendering)
  cars: Car[];
  bestCar: Car | null;
  bestPool: Car[];
  iteration: number;
  maxDistancePassed: number;

  // Lifecycle
  connectedCallback(): void;
  configure(options: TrainingManagerOptions): void;

  // Training lifecycle
  initializeCars(): void;
  nextGeneration(): void;
  newTraining(): void;

  // Per-frame updates
  updateDistance(currentDist: number): void;
  updateStatsDisplay(alive, dead, frozen, maxDist, bestCarSpeed?): void;
  updateBestCarAndPool(): void;

  // Brain management
  save(): void;
  discard(): void;

  // Car config
  getSettings(): {
    carCount: number;
    poolSize: number;
    mutationRate: number;
    idleRange: number;
  };
  getCarSettings(): CarInfo;
  setCarSettings(info: CarInfo): void;
  applyCarSettingsToCars(cars: Car[]): void;

  // File I/O
  saveCarToFile(): void;
}

customElements.define('training-panel', TrainingPanelElement);
```

### Configuration Flow

```typescript
// In TrainingSimulator constructor:
this.trainingManager = document.querySelector('training-panel');

this.trainingManager.configure({
  evaluateFitness: (car) => startInfo.y - car.y, // Simple mode: distance upward
  getStartInfo: () => this.#getStartInfo(), // Spawn position + angle
  onCarsCreated: (cars) => {
    this.#updateRoadBorders(); // Rebuild corridor/borders for new cars
    this.animationLoopToolbar.setPaused(false); // Auto-resume on new cars
  },
});

this.trainingManager.initializeCars();
```

### Key Design Decisions

1. **TrainingPanelElement generates cars** — simulators only provide `getStartInfo()` (position + angle). Car creation logic lives in one place.

2. **Two distinct restart modes:**

   - `nextGeneration()` — preserves learning (elitism + mutation)
   - `newTraining()` — clean slate (no brains, generation counter reset)

3. **Auto-restart on config change** — all car parameter inputs have `change` listeners that call `newTraining()`. This ensures neural network architecture matches sensor config from generation 0.

4. **Loading .car files triggers fresh training** — if the file has no brain, stored brains are cleared; either way, `newTraining()` is called so the new config takes effect immediately.

### Genetic Algorithm Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Load pool from localStorage (bestPool key)   │
│    → If legacy keys exist: auto-migrate         │
│ 2. createCarsForTraining(N, 'AI', config, pos)  │
│ 3. applyPoolToCars(cars, pool, rate):           │
│    - First K: exact brain copies (elitism)      │
│    - Rest: toMutatedFromPool(brains, rate)      │
│ 4. If rayCount changed: rebuild brain arch      │
│    → New architecture: [rayCount+1, ...hidden, 4] │
├─────────────────────────────────────────────────┤
│ 5. Simulation runs...                           │
│    - Each frame: update all cars                │
│    - Track alive/dead/frozen counts             │
│    - updateBestCarAndPool() per frame           │
│    - Update best distance stat                  │
├─────────────────────────────────────────────────┤
│ 6. User clicks "Next Gen" (🧬):                │
│    - getTopCarInfoPool(cars, fitness, K)        │
│    - nextGeneration() → gen++ + reinitialize    │
│ 7. User clicks "New Train" (🔄):               │
│    - Opens the Training-Init modal (see below)  │
│    - On Start: apply params/config + newTraining │
│ 8. User clicks "Save" (💾):                    │
│    - savePoolToStorage(topK)                    │
└─────────────────────────────────────────────────┘
```

### Training-Init Modal

`<training-init-modal>` (`TrainingInitModalElement`,
`ts/simulator/training/trainingInitModal.ts`) replaces the old confusing
"New Training auto-behaviour + alerts". It opens:

- **On page entry** (`context: 'entry'`) — Cancel starts training with the
  previous/default config.
- **On "New Train" (🔄)** (`context: 'new'`) — Cancel keeps the current run
  untouched.

The modal collects, prefilled with current/default values:

- **Training params** — car count, pool size, mutation rate, idle range.
- **Car config** — height, width, hidden layers, max speed, accel, friction,
  ray count / length / spread / offset.
- **Brain source** — `fresh` (discard pool), `pool` (keep stored `bestPool`), or
  `selected` (seed from the actively-selected store/loaded cars). Sources are
  enabled only when available and parameter-compatible (via `CarLoader.allParamsMatch`);
  choosing a non-`fresh` source **locks** the car-config fields to the source's
  params. Default preference order: `pool` > `selected` > `fresh`.

Start applies the params/config (`setTrainingParams` + `setCarSettings`), seeds
the pool per the chosen source, then runs `newTraining()`.

### Control Panel UI

| Control        | Type       | Range      | Purpose                                                            |
| -------------- | ---------- | ---------- | ------------------------------------------------------------------ |
| Car Count      | Number     | 0–5000     | Population per generation                                          |
| Pool Size      | Number     | 1–20       | Number of elite survivors                                          |
| Mutation Rate  | Number     | 0.001–1.0  | Randomization strength                                             |
| Idle Range     | Number     | 200–20000  | Freeze cars farther than this from best car                        |
| Save (💾)      | Button     | —          | Persist brains + car config to localStorage                        |
| Discard (🗑️)   | Button     | —          | Clear all saved data from localStorage                             |
| Pause (⏸️)     | Button     | —          | Toggle simulation pause                                            |
| Next Gen (🧬)  | Button     | —          | Next generation (keeps top brains + mutates)                       |
| New Train (🔄) | Button     | —          | Opens the Training-Init modal (params + car config + brain source) |
| Max Speed      | Number     | 1–20       | Car maximum speed (change → new training)                          |
| Accel          | Number     | 0.001–1    | Car acceleration (change → new training)                           |
| Friction       | Number     | 0.001–0.5  | Car friction (change → new training)                               |
| Width          | Number     | 10–100     | Car body width (change → new training)                             |
| Height         | Number     | 20–150     | Car body height (change → new training)                            |
| Rays           | Number     | 1–20       | Sensor ray count (change → new training)                           |
| Ray Len        | Number     | 50–500     | Sensor ray length (change → new training)                          |
| Ray Spread     | Number     | 0.1–6.28   | Sensor angular spread (change → new training)                      |
| Ray Offset     | Number     | -3.14–3.14 | Sensor angular offset (change → new training)                      |
| Save Car       | Button     | —          | Download best car as `.car` JSON file                              |
| Load Car       | File input | .car/.json | Load car config (triggers new training)                            |

> **Render interval** lives in the separate `<animation-loop-toolbar>` (not the
> training panel): a `1 / N frames` number input (1–10, default 2) that throttles
> the draw rate while physics keeps running every frame. Raise it to push very
> large populations (the picture jumps but the sim keeps stepping). See
> [Render Decoupling](#render-decoupling-physics-vs-draw-rate).
>
> **Panel DOM throttle.** `updateBestCarAndPool` selects the pool every frame but
> only re-renders the pool table (`innerHTML`) and status dots (a `localStorage`
> read) every ~15 frames. `save()`/`discard()` force an immediate refresh.

### Statistics Display

- **Generation count**: Current generation number
- **Alive / Dead / Frozen**: Car status breakdown
- **Best distance**: Maximum fitness value achieved (all-time for this session)

### Pool Statistics Table

Below the main stats, a table displays the current best pool:

| Column  | Content               |
| ------- | --------------------- |
| #       | Rank (1 = best)       |
| Name    | Pool index + 1        |
| Fitness | Current fitness value |

### Status Dots

Colored indicators on section titles showing localStorage sync state:

| Section    | Green                             | Orange                         | Red                  |
| ---------- | --------------------------------- | ------------------------------ | -------------------- |
| Storage    | `bestPool` exists in localStorage | —                              | No stored pool       |
| Pool       | Stored pool size matches config   | Pool size mismatch with config | No stored pool       |
| Car Config | Stored config matches UI controls | At least one parameter differs | No stored car config |

---

## Simple Road Simulator (Simple Mode)

### Purpose

Entry-level training environment — a straight 3-lane road with random traffic obstacles. Ideal for initial neural network evolution before testing on complex maps.

### Access

Navigate to `/html/simulator?mode=simple` (or click "Simple Road" on the landing page).

### Architecture

Simple mode reuses the `TrainingSimulator` class with a different initialization path:

```typescript
const params = new URLSearchParams(window.location.search);
this.mode = params.get('mode') === 'simple' ? 'simple' : 'world';

if (this.mode === 'simple') {
  this.#initSimpleMode(); // Creates SimpleWorld + traffic
} else {
  this.#initWorldMode(); // Loads .world file
}
```

### SimpleWorld (`ts/world/simple/simpleWorld.ts`)

A lightweight `IWorld` implementation:

```typescript
class SimpleWorld implements IWorld {
  graph: Graph; // Minimal 2-node graph (top → bottom)
  roadBorders: Segment[]; // Two vertical segments (left + right edges)
  buildings: Building[]; // Empty array (no 3D buildings)
  trees: Tree[]; // Empty array (no trees)
  corridor: null; // No pathfinding needed
  markings: Marking[]; // One synthetic Start marking
  cars: Car[];
  bestCar: Car | null;

  constructor(x: number, width: number, laneCount: number = 3);

  getLaneCenter(laneIndex: number): number; // X-coord of lane center
  getLaneCount(): number; // Number of lanes (default: 3)
  generateCorridor(): void; // No-op (no corridor in simple mode)
  draw(ctx, options: WorldDrawOptions): void; // Renders lane dividers + borders
}
```

**Road geometry:**

- Width: 180px (configurable)
- Lanes: 3 (default)
- Length: effectively infinite (top = -1,000,000, bottom = +1,000,000)
- Borders: two vertical segments at left and right edges

**Lane centers:**

```typescript
getLaneCenter(laneIndex: number): number {
  const laneWidth = this.width / this.laneCount;
  return this.left + laneWidth / 2 + laneIndex * laneWidth;
}
```

### Traffic Generation (`ts/simulator/training/modes/trafficFactory.ts`)

#### Initial Traffic (`generateInitialTraffic`)

Hardcoded 7 DUMMY cars in 4 rows:

| Row (Y)  | Occupied Lanes | Empty Lane |
| -------- | -------------- | ---------- |
| y = -100 | Lane 1         | 0, 2       |
| y = -300 | Lanes 0, 2     | 1          |
| y = -500 | Lanes 0, 1     | 2          |
| y = -700 | Lanes 1, 2     | 0          |

Each row always has at least one empty lane, ensuring a path exists.

#### Dynamic Traffic (`generateTrafficRow`)

```typescript
function generateTrafficRow(y, getLaneCenter, laneCount, startAngle): Car[] {
  // Randomly choose 1-2 lanes to block
  // Always leave at least 1 lane empty
  // Place DUMMY cars (maxSpeed: 2) in blocked lanes
}
```

### Simple Mode Update Loop (`ts/simulator/training/modes/simpleModeBehavior.ts`)

```typescript
class SimpleSimState {
  traffic: Car[];
  lastGeneratedTrafficY: number;
  simpleViewY: number;
}

function updateSimpleTraffic(state, bestCar, simpleWorld, roadBorders, startInfo): void {
  // 1. Generate new traffic rows ahead of best car (1500px lookahead)
  while (lastGeneratedTrafficY > bestCar.y - TRAFFIC_LOOKAHEAD) {
    lastGeneratedTrafficY -= TRAFFIC_ROW_GAP;  // 200px between rows
    traffic.push(...generateTrafficRow(...));
  }

  // 2. Cull traffic far behind start (don't cull based on bestCar!)
  traffic = traffic.filter(c => c.y < startY + 600);

  // 3. Update traffic cars (they drive forward at speed 2)
  for (const car of traffic) car.update(roadBorders);

  // 4. Sort by Y for binary-search spatial lookups
  traffic.sort((a, b) => a.y - b.y);
}

function updateSimpleCars(
  cars, state, roadBorders, idleEnabled, bestCar, idleRange,
): { aliveCount; deadCount; frozenCount } {
  // For each non-damaged car:
  //   - Idle (freeze) if idleEnabled and its fitness is lower than the
  //     best car's fitness by more than idleRange (fitness comparison) → frozenCount++
  //   - Otherwise: pass the 2 road borders + binary-searched nearby
  //     traffic (±400px in Y) and update
}
```

> **Idle model:** cars far from the best car are frozen, keyed off a configurable
> `idleRange` (Training panel → "Idle Range"). The earlier "stuck behind traffic"
> timer (`simpleUpdateCycle` / `trafficIdleStart`) was removed in favor of this
> single range-based rule, shared with world mode.

**Key constants:**

- `TRAFFIC_LOOKAHEAD`: 1500px ahead of best car
- `TRAFFIC_ROW_GAP`: 200px between rows
- `TRAFFIC_SPEED`: 2 px/frame (DUMMY cars)

### Fitness (Simple Mode)

```typescript
evaluateFitness: (car) => startInfo.y - car.y;
```

How far upward the car traveled from start. Simple, effective for straight roads.

### UI Differences (Simple Mode)

| Element        | State      | Reason                            |
| -------------- | ---------- | --------------------------------- |
| World loader   | Hidden     | No world files in simple mode     |
| Border mode    | Hidden     | Always damage mode                |
| Mini-map       | Disabled   | No meaningful map to show         |
| Camera debug   | Hidden     | Not supported                     |
| Layout default | Camera-big | 3D view is primary in simple mode |

---

## Main Simulator — World Mode (`ts/simulator/training/trainingSimulator.ts`)

### Purpose

Full-featured training environment using custom world maps with roads, buildings, intersections, and defined training corridors.

### Initialization Flow

```
1. Load .world file (from file input, localStorage fallback, or default)
2. World.load(worldInfo) → reconstruct full world geometry
3. world.generateCorridor(start, end) → define training path
4. TrainingManager generates cars at start marking position
5. Apply brain pool from localStorage
6. Begin animation loop
```

### IWorld Interface

Both `World` and `SimpleWorld` implement `IWorld`, allowing the TrainingSimulator and Camera to work with either:

```typescript
interface IWorld {
  graph: Graph;
  markings: Marking[];
  roadBorders: Segment[];
  corridor: Corridor | null;
  buildings: Building[];
  trees: Tree[];
  zoom?: number;
  offset?: Point;
  generateCorridor(start: Point, end: Point): void;
  draw(ctx, options: WorldDrawOptions): void;
}

interface WorldDrawOptions {
  viewPoint: Point;
  cars?: Car[]; // Cars to render (draw-time input, not world state)
  bestCar?: Car | null; // Highlighted car drawn with its sensor rays
  showStartMarkings?: boolean;
  renderRadius?: number;
}
```

### Border Modes

Three radio-button options in `<world-toolbar>`:

| Mode       | Icon | Behavior                                                           |
| ---------- | ---- | ------------------------------------------------------------------ |
| No borders | 🚫   | Cars ignore road borders entirely (no collision detection)         |
| Damage     | 💀   | Cars are marked damaged on collision and stop (default)            |
| Collision  | 🛡️   | Cars are pushed back onto road and continue (`borderCollision.ts`) |

### Tracking Modes

Radio-button group in `<world-toolbar>`:

| Mode     | Icon | Behavior                                            |
| -------- | ---- | --------------------------------------------------- |
| No track | ✋   | Viewport stays in place; user pans freely           |
| Best car | 🏆   | Viewport + camera follow best-fitness car (default) |
| Keys car | 🎮   | Viewport + camera follow user-controlled KEYS car   |

### Animation Loop (Pseudocode)

The loop has three clearly separated concerns: **update**, **panel refresh**, and
**draw**. The RAF always keeps running — pause only gates the update step.

```typescript
animate(time: number): void {
  const interval = animationLoopToolbar.renderInterval;
  const render = framesSinceRender >= interval - 1;
  framesSinceRender = render ? 0 : framesSinceRender + 1;

  // --- UPDATE PHASE (skipped when paused) ---
  if (!animationLoopToolbar.paused) {
    // #updateSimple() or #updateWorld() depending on mode:
    //   1. Update traffic / AI cars (physics + sensors)
    //   2. Update training metrics (distance, alive/dead/frozen)
    //   3. Update viewport offset (camera tracking)
    //   4. camera.move(trackTarget)  ← tracking is an update concern
    this.#update();
  } else if (render) {
    // While paused the world is frozen but the panel must stay reactive:
    // pool table and indicator dots respond to settings changes.
    trainingManager.updateBestCarAndPool();
  }

  // --- DRAW PHASE (throttled, always runs) ---
  if (render) {
    // #drawSimple(time) or #drawWorld(time) depending on mode:
    //   1. Resize canvases responsively
    //   2. viewport.reset() + world.draw()
    //   3. drawSimulatorCars() pool-ranked layers
    //   4. Visualizer.drawNetwork() (if shown)
    //   5. miniMap.draw() (if shown, world mode)
    //   6. camera.render() (if shown) ← render only, move done in update
    this.#draw(time);
  }

  // Loop always continues — pause never cancels the RAF.
  requestAnimationFrame(this.animate.bind(this));
}
```

### Update/Draw Method Split

Each mode has two private methods with clear ownership:

| Method              | Mode   | Responsibility                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------------ |
| `#updateSimple()`   | Simple | Traffic + car physics, metrics, viewport offset, `camera.move()`               |
| `#drawSimple(time)` | Simple | Canvas clear, road/traffic/car draw, network vis, `camera.render()`            |
| `#updateWorld()`    | World  | Car physics via `updateWorldCars()`, metrics, viewport offset, `camera.move()` |
| `#drawWorld(time)`  | World  | Canvas clear, world/car draw, minimap, network vis, `camera.render()`          |

`camera.move(trackTarget)` belongs to the **update** phase — it advances the
camera position every frame so 3D rendering uses an up-to-date eye position.
`camera.render()` belongs to the **draw** phase and is only called on render frames.

### Pause Behavior

Pause **does not** cancel the animation loop. The `paused` flag is read inside
`animate()` to gate `#update()` only:

- Canvas keeps re-rendering the frozen state (world, cars, visualizer, camera)
- Pool table and indicator dots refresh every ~15 render frames via `updateBestCarAndPool()`
- Settings changes (pool count, save/discard) reflect immediately without resuming
- Play/pause + render interval are owned by `<animation-loop-toolbar>`; the loop is always live

### Render Decoupling (Physics vs Draw Rate)

`animate` computes a `render` flag from a per-frame counter and the panel's
`renderInterval` (1–10, default 2). **Physics updates every frame; the draw
pass only runs when `render` is true.** This keeps the simulation stepping at
the display rate (~60 Hz) even when rendering is the bottleneck — the canvas
redraws less often (e.g. ~30 fps at interval 2). The value is user-adjustable
in the [animation-loop-toolbar panel](#control-panel-ui) and applies to both
world and simple modes. Training throughput and outcomes are unaffected — only
visual smoothness.

### World Mode Update Loop (`ts/simulator/training/modes/worldModeBehavior.ts`)

The per-frame car-update phase is extracted out of `TrainingSimulator` into a free function,
mirroring `updateSimpleCars()` in `simpleModeBehavior.ts`. The simulator only computes
the inputs and reads the returned counts — it no longer owns the update logic:

```typescript
function updateWorldCars(
  cars: Car[],
  borderGrid: SpatialHashGrid,
  borderMode: BorderMode,
  collisionBorders: Segment[],
  bestCar: Car,
  idleEnabled: boolean,
  idleRange: number,
): { aliveCount: number; deadCount: number; frozenCount: number } {
  // - 'collision' mode: push damaged cars back onto road (handleCollisionWithRoadBorders)
  // - idle: freeze cars whose fitness is lower than the best car's fitness by more than idleRange (frozenCount++)
  // - 'none' mode: cars receive no borders
  // - otherwise: query the SpatialHashGrid for nearby borders (broad phase),
  //   then keep only the segments actually within the car's reach (narrow phase)
}
```

### Fitness (World Mode)

```typescript
evaluateFitness: (car) => car.fitness; // accumulated distance travelled
```

Each frame, `car.fitness += car.speed`, so fitness measures the total distance a
car has driven — the furthest traveller is "best".

### Performance: Spatial Filtering

Border and obstacle lookups are scoped per-car so each car only senses what it
can actually reach. World mode uses a two-phase scheme on top of the
[Spatial Hash Grid](Math.md#spatial-hash-grid-tsmathspatialgridts):

| Obstacle type         | Filtering strategy                                               |
| --------------------- | ---------------------------------------------------------------- |
| Traffic (simple mode) | Sort by Y, binary-search for nearby range (±400 px)              |
| Road borders (world)  | Grid query (broad phase) + exact per-car distance (narrow phase) |

**World-mode two-phase border filtering:**

1. **Broad phase** — `borderGrid.query(car.x, car.y, reach + cellSize)` returns
   every segment in the surrounding grid cells. `reach = max(sensor.rayLength, MIN)`,
   so the query radius scales with the car's actual ray length (this fixed the
   old bug where rays longer than a fixed threshold missed borders).
2. **Narrow phase** — each candidate is kept only if its exact point-to-segment
   distance is within `reach + halfCarDiagonal`, using a `sqrt`-free squared
   distance (`pointToSegmentDistanceSq`). Cell neighbours that are technically
   nearby but actually out of range are discarded.

This reduces each car's per-frame polygon count from the full map down to the
handful of borders it can really hit, while never dropping a reachable one.

> Simple mode does **not** use the grid: it has only 2 (full-length) borders,
> passed directly, plus the binary-searched traffic above.

---

## Live Traffic Jam Simulator (`ts/simulator/traffic/trafficSimulator.ts`)

### Purpose

An interactive sandbox where you paint trained cars onto a real world and watch
them drive themselves. Instead of a population evolving toward a goal, the user
manually drops cars one at a time and an emergent traffic jam forms as cars
weave around each other and crash.

### Access

Navigate to `/html/traffic` (or click "Live Traffic Jam" 🚦 on the landing page).

### Architecture

`TrafficSimulator extends SimulatorShell` — it reuses all the shared scaffolding
(canvases, viewport, camera, mini-map, panels, the RAF loop) and only implements
the traffic-specific `update()` / `draw()` behaviour plus click-to-spawn.

```typescript
class TrafficSimulator extends SimulatorShell {
  #world: World | null;
  #roadBorders: GridSegment[];
  #borderGrid: SpatialHashGrid; // broad-phase border lookups
  #statsPanel: TrafficPanelElement;
  #cars: Car[]; // single source of truth (panel is a view)
  #spawnCount: number; // names cars "Car 1", "Car 2", …

  protected update(): void; // step alive cars + follow selected car
  protected draw(time): void; // world + cars (wrecks greyed) + camera + stats
  protected isPaused(): boolean; // mirrors the stats-panel pause toggle
}
```

### Spawning a car

The active world is loaded from `StoreManager.getActiveWorld()` (falling back to
the editor world via `getEditorWorld()`). A **left-click** on the game canvas
spawns a car at the clicked world point:

```
1. Read the single selected car from the toolbar Car selector
   (toolbarPanel.getSelectedCars()[0]); alert if none selected
2. point   = viewport.getMouse(event)        ← screen → world coords
3. heading = face the nearest graph segment  ← getNearestSegment(point, …, 200)
4. car = new Car({ controlType: 'AI', x, y, angle, color: random })
         .load(selectedConfig)
   car.name = `Car ${++spawnCount}`
5. push to #cars and refresh the stats panel
```

> **Left-click is free for spawning** — viewport panning uses the **middle**
> mouse button, so painting cars never conflicts with panning the map.
>
> The spawn heading uses the same convention as the world-mode Start marking:
> `angle = -angle(direction) + Math.PI / 2`.

### Car picker (unified Car selector)

The traffic page uses the world toolbar's **unified Car selector** in
**single-select** mode — the same selector used by Race (multi) and Training
(single). It is configured during init via:

```typescript
this.toolbarPanel.configureSelectors({
  carMode: 'single',
  onWorldSelected: (entry) => this.#loadWorld((entry?.data as World) ?? null),
});
```

The selector lists **every car across sources** (loaded → store) from
`StoreManager.getAllCars()`. Spawning reads the active car via
`toolbarPanel.getSelectedCars()[0]` (which returns `StoreManager.getActiveCars()`);
if nothing is selected the user is prompted to pick a car first. The old
`showSpawnCarPicker` / `setSpawnCars` / `getSelectedSpawnCar` /
`setSpawnCarChangeListener` API has been removed.

### Collision & ghosting

Car physics treats every nearby obstacle polygon the same — road borders and
other cars alike. The traffic simulator builds each alive car's obstacle set per
frame and feeds it to `car.update(obstacles)`:

| Obstacle source | Filtering                                                               |
| --------------- | ----------------------------------------------------------------------- |
| Road borders    | `SpatialHashGrid` broad phase + exact narrow-phase distance (sqrt-free) |
| Other cars      | Distance-filtered O(n²) scan (small populations) over **alive** cars    |

Both follow the toolbar **border mode**: when it is `none` there is no collision
at all (free driving). When a car crashes it becomes **ghosted**:

- It stays on the road, frozen, rendered grey (`showMask: false`).
- It is excluded from every other car's obstacle set, so traffic flows around
  the wreck without chain-reaction damage.

### Statistics panel (`<traffic-panel>`)

A side panel (`ts/simulator/traffic/trafficPanel.ts`) lists every placed car
and is a pure view over the simulator's `#cars` array:

| Column / control | Content                                             |
| ---------------- | --------------------------------------------------- |
| Colour swatch    | Car colour (grey when crashed)                      |
| Name             | `Car N`                                             |
| Status           | 🟢 alive / 💥 crashed                               |
| Speed            | Live `car.speed`                                    |
| Distance         | `Math.round(car.fitness)` (accumulated travel)      |
| Config (caret)   | Expandable, read-only view of the car's full config |
| Remove (✕)       | Drops a single car                                  |
| Clear            | Drops all cars                                      |
| Pause            | Toggles the simulation (drives `isPaused()`)        |

`setCars(cars)` rebuilds the list when membership changes (spawn / remove /
clear); `refresh()` updates the live values in place every render frame without
destroying expand state.

### Interactions

| Listener     | Effect                                                       |
| ------------ | ------------------------------------------------------------ |
| Select (row) | Track that car — viewport offset + `camera.move()` follow it |
| Remove (✕)   | Splice the car out of `#cars` and rebuild the list           |
| Clear        | Empty `#cars` and rebuild the list                           |
| Pause        | Freeze `update()` (canvas keeps redrawing)                   |

### Differences from the training simulator

| Aspect         | Training `TrainingSimulator`      | `TrafficSimulator`                       |
| -------------- | --------------------------------- | ---------------------------------------- |
| Population     | Generated by the training manager | Hand-placed by the user (click to spawn) |
| Goal           | Evolve toward best fitness        | None — emergent traffic                  |
| Car-vs-car     | No (cars ignore each other)       | Yes (with wreck ghosting)                |
| Side panel     | `<training-panel>`                | `<traffic-panel>`                        |
| Tracking       | Toolbar tracking mode (best/keys) | Stats-panel selection                    |
| Toolbar extras | —                                 | Spawn Car picker; tracking group hidden  |

---

## Layout Management (`ts/simulator/training/rendering/layoutManager.ts`)

### Constants

```typescript
const LAYOUT_CONTROL_PANEL_WIDTH = 200; // Training panel (left side)
const LAYOUT_NETWORK_PANEL_WIDTH = 300; // Network + minimap panel (right side)
const LAYOUT_SMALL_VIEW_WIDTH = 300; // Secondary view width
```

### Layout Modes

```typescript
type LayoutMode = 'topview-big' | 'camera-big';
```

| Mode          | Game Canvas            | Camera Canvas          |
| ------------- | ---------------------- | ---------------------- |
| `topview-big` | Main view (large)      | Secondary (300px wide) |
| `camera-big`  | Secondary (300px wide) | Main view (large)      |

### Resize Logic

```typescript
function resizeSimulatorLayout(canvases, panelState, viewport): void {
  // 1. Calculate available width = window - controlPanel - rightPanel
  //    (the network visualizer reserves width; a floating mini-map does not)
  // 2. Split remaining between gameCanvas and cameraCanvas based on layout mode
  // 3. Show/hide rightPanel based on showNetwork || showMiniMap
  // 4. Allocate network canvas height (full or partial if minimap shown)
  // 5. Float the mini-map (bottom-left overlay) when the visualizer is hidden
  // 6. Update viewport center if it exists
}
```

### Mini-map Placement

The mini-map has two placements driven by the network-visualizer toggle:

| Network visualizer | Mini-map placement                                          |
| ------------------ | ----------------------------------------------------------- |
| Visible            | Inline, stacked under the network canvas in the right panel |
| Hidden             | Floating overlay, fixed in the **bottom-left** corner       |

When floating, the mini-map is taken out of flow (`#miniMapCanvas.floating`,
`position: fixed`) so it no longer reserves the 300px right-panel width — the
top-down/3D views expand to use the freed space (matching the world editor's
floating mini-map style).

### Panel Visibility

| Panel              | Toggle                         | Default |
| ------------------ | ------------------------------ | ------- |
| Network visualizer | `<layout-toolbar>` toggle      | Visible |
| Mini-map           | `<layout-toolbar>` toggle      | Visible |
| 3D Camera          | `<layout-toolbar>` toggle      | Visible |
| Right panel        | Auto (shown if network OR map) | Visible |

> The right panel only reserves layout width when the **network visualizer** is
> shown. A map-only state keeps the panel element present (so its canvas still
> renders) but collapses it to zero width via the floating mini-map overlay.

---

## Car Renderer (`ts/simulator/training/rendering/carRenderer.ts`)

### `drawSimulatorCars(ctx, cars, bestPool, viewportTop, viewportBottom, drawMasks, poolColor, prevPoolCars, prevPoolColor, viewportLeft, viewportRight)`

Draws cars in layered order for visual clarity. Each car's `draw()` method is called with `CarDrawOptions` — no external state mutation:

```typescript
interface CarDrawOptions {
  showSensor?: boolean; // Draw sensor rays (default: false)
  showMask?: boolean; // Use sprite image vs colored polygon (default: true)
  colorOverride?: string; // Override car color without mutating car.color
  alpha?: number; // Opacity (only set when differing from the batch default)
  showName?: boolean; // Draw rank label (#1, #2, etc.)
}
```

```
Layer 1: Regular AI cars
  - globalAlpha set to 0.2 ONCE for the whole batch (not per car)
  - car.draw(ctx, { showMask: drawMasks })
  - Skip pool cars and KEYS car
  - Viewport culled on BOTH axes (only draw if x AND y within visible bounds)

Layer 2: Previous pool cars (from last generation)
  - car.draw(ctx, { colorOverride: 'lime', showMask: true, showName: true })
  - Skip cars that are also in current pool

Layer 3: Current pool cars
  - car.draw(ctx, { colorOverride: 'gold', showMask: true, showName: true, showSensor: isBest })
  - Only best car (#1) gets sensor ray rendering
  - Drawn lowest-rank first so best is on top

Layer 4: KEYS car (if present)
  - car.draw(ctx, { showMask: drawMasks })
  - Always visible
```

### Rendering performance: cached mask sprites

`drawMasks` is enabled while `carCount <= 5000`. The mask is no longer rebuilt
per frame: `Car` keeps one shared sprite image plus a static cache of
pre-composited, color-tinted sprites keyed by `${color}|${width}|${height}`. The
expensive fill + `destination-atop` + `multiply` compositing happens **once** per
unique key; thereafter every car of that color/size draws with a single
`drawImage`. This is what keeps masked rendering cheap at large populations (the
threshold was raised from 500 to 5000 after this change). Damaged cars (or cars
drawn before the sprite image has loaded) fall back to the plain car image.

---

## Pool Manager (`ts/simulator/training/genetics/poolManager.ts`)

Pure functions for car population management:

### `createCarsForTraining(count, type, config, startInfo): Car[]`

Creates N identical cars at the start position with given physics/sensor config. All cars start with randomly initialized brains.

### `brainsCompatible(a, b): boolean`

Checks that two networks have identical topology (same number of levels; same
input and output size at each level). Used as a guard in `applyPoolToCars` before
any brain assignment.

### `applyPoolToCars(cars, pool, mutationRate): void`

Applies saved brains to the car population. Before each assignment, topology
compatibility is checked — if the stored brain does not match the freshly-created
car's architecture (e.g. user changed hidden layers), the assignment is silently
skipped and the car keeps its randomly-initialized correct-topology brain:

- First K cars (K = pool.length): exact copy of stored brain, **if compatible**
- Remaining cars: `NeuralNetwork.toMutatedFromPool(brains, mutationRate)`, **if compatible**

This fixes the bug where changing hidden layers had no visible effect — new cars
were built with the correct topology but then immediately overwritten with
incompatible stored brains.

### `getSortedAICars(cars, evaluateFitness): Car[]`

Returns AI cars sorted by fitness (best first). Excludes KEYS cars. Used by the
infrequent paths (save, next-generation) that need a full ordering.

### `getTopAICars(cars, evaluateFitness, k): Car[]`

Returns just the top `k` AI cars by fitness, highest first, in a single
partial-selection pass — **no full sort and no filtered-array allocation**.
Equivalent to `getSortedAICars(...).slice(0, k)` but far cheaper for the
**per-frame** `updateBestCarAndPool` call, where `k` (pool size, ≤20) is tiny
relative to the population (thousands). Verified equivalent to the full-sort
reference over randomized trials.

### `getTopCarInfoPool(cars, evaluateFitness, poolSize): CarInfo[]`

Returns the top K car configurations as `CarInfo[]` for storage/next generation.

---

## Storage Manager (`ts/simulator/training/genetics/storageManager.ts`)

### `loadPoolFromStorage(fallbackConfig?): CarInfo[]`

```
1. Try unified key: localStorage.getItem('bestPool')
2. If found: parse and return

3. Legacy migration (auto-triggered on first load):
   - Read 'bestBrains' or 'bestBrain' (old format: just networks)
   - Read 'bestCarInfo' (old format: physics only)
   - Combine into unified CarInfo[] pool
   - Write to 'bestPool', delete legacy keys
   - Log migration message

4. If nothing found: return []
```

### `savePoolToStorage(pool: CarInfo[]): void`

Writes `JSON.stringify(pool)` to `localStorage['bestPool']`.

### `discardStoredPool(): void`

Removes `bestPool` and all legacy keys from localStorage.

### `loadRaceCars(): CarInfo[]` / `saveRaceCars(pool: CarInfo[]): void`

Race-only car list persistence under the `raceCars` key. Used by the race "Load
car(s)" button so race-loaded cars never overwrite the training pool. The
simulator/training mode remains the sole owner of `bestPool`.

### Store seeding (multi-select)

On startup the training panel seeds the pool from the store's active cars when
no `bestPool` exists. With multi-select store cars, the panel uses
`StoreManager.getActiveCars()`:

- If all selected cars share identical params (`CarLoader.allParamsMatch`), the
  whole selection seeds the pool (`savePoolToStorage(activeCars)`).
- Otherwise it alerts and seeds only the first selected car.
