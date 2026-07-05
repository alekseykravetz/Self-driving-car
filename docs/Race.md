# Racing Mode

The `ts/simulator/racing/raceSimulator.ts` module implements a competitive racing mode where the player controls a car and races against AI opponents along a corridor path.

---

## Overview

- **Entry point**: `/html/race.html`
- **URL parameters**: `?mode=phone` (tilt control), `?mode=camera` (webcam control), default = keyboard
- **Core mechanic**: Race from Start marking to Target marking on any loaded world map
- **Player**: 1 KEYS car (or phone/camera-controlled)
- **AI opponents**: one car per entry across three sources — the training pool (`bestPool`, read-only), the store-selected cars, and race-loaded `.car` files (`raceCars`). No mutation is applied in race mode.
- **Win condition**: First car to reach 100% corridor progress

---

## Class Structure

`RaceSimulator` extends `SimulatorShell`, inheriting the four canvases,
viewport, camera, mini-map, toolbar panel references, and render-throttled RAF
loop. DOM assembly, stats updates, and toolbar wiring are delegated to a
dedicated `RacePanel` helper (`ts/simulator/racing/racePanel.ts`).
`RaceSimulator` focuses on race rules, world setup, car generation, and
progression.

```typescript
class RaceSimulator extends SimulatorShell {
  // Inherited from SimulatorShell:
  //   gameCanvas / gameCtx, cameraCanvas / cameraCtx,
  //   miniMapCanvas, networkCanvas / networkCtx
  //   viewport, camera, miniMap (protected)

  controls: Controls | null;
  racePanel: RacePanel;

  // State
  #world: World;
  #cars: Car[] | null;
  #myCar: Car | null;
  #roadBorders: [Point, Point][];
  #frameCount: number;
  #started: boolean; // False during countdown

  constructor(
    gameCanvas,
    networkCanvas,
    miniMapCanvas,
    cameraCanvas,
    host: SimulatorPageHost,
    controls?,
  );
}
```

---

## Race Initialization Flow

```
1. Load world:
   - From `StoreManager.getActiveWorld()` (store/loaded selection)
   - OR from the editor world (`StoreManager.getEditorWorld()` / `editorWorld` key)
   - OR default empty world

2. Create Viewport with saved zoom/offset

3. Generate cars:
   - 1 KEYS car (player) + one AI car per entry across three sources
   - AI sources (all applied as-is, no mutation):
     - `loadPoolFromStorage()` — training results pool (`bestPool`), read-only
     - `StoreManager.getActiveCars()` — cars selected in the world toolbar Car selector (multi-select, multiple or none)
     - `loadRaceCars()` — cars loaded via the race "Load car(s)" button (`raceCars`)
   - Player car: physical params from the first available source (brain not applied)
   - If all three sources are empty: only the player car races

4. Set up corridor:
   - Find Start and Target markings in world
   - world.generateCorridor(startPoint, targetPoint)
   - Use corridor.borders as collision boundaries

5. Create camera: follows player car (myCar)

6. Create mini-map:
   - If corridor exists: use corridor.skeleton as graph
   - Otherwise: use world.graph

7. Generate statistics panel: one entry per car

8. Start countdown (3, 2, 1, GO!)
```

---

## Car Generation

```typescript
generateCars(): Car[] {
  // Find start position from Start marking
  const startMarkings = world.markings.filter(m => m instanceof Start);
  const startPoint = startMarkings[0].center;
  const direction = startMarkings[0].directionVector;
  const startAngle = -angle(direction) + Math.PI / 2;

  // Three independent AI car sources, all applied as-is (no mutation)
  const pool = loadPoolFromStorage();        // training results (read-only)
  const selected = StoreManager.getActiveCars(); // store multi-select
  const raceLoaded = loadRaceCars();         // race "Load car(s)" button
  const aiSources = [...pool, ...selected, ...raceLoaded];

  // Player car physical params: first available source (brain stripped)
  const keyParams = pool[0] ?? selected[0] ?? raceLoaded[0] ?? null;

  // Player (KEYS) car
  const keyCar = new Car({ x: startPoint.x, y: startPoint.y, controlType: 'KEYS', angle: startAngle });
  if (keyParams) { keyCar.load({ ...keyParams, brain: undefined }); keyCar.brain = undefined; }
  keyCar.name = 'Player';

  // One AI car per source entry
  for (const info of aiSources) {
    const car = new Car({ x: startPoint.x, y: startPoint.y, controlType: 'AI', angle: startAngle });
    car.load(info);
    cars.push(car);
  }
}
```

> **Note:** Mutation belongs to training mode only — the race never mutates brains.
> The race "Load car(s)" button writes to the race-only `raceCars` key and never
> overwrites the training pool (`bestPool`).

---

## Countdown System

The countdown is handled by `RacePanel.startCounter(onStarted)`:

```typescript
this.racePanel.startCounter(() => {
  this.started = true; // Cars can now move
});
```

- 3 seconds total countdown
- Beep sound at each number (400 Hz)
- Higher-pitch beep at GO! (600 Hz)
- Cars' `update()` is only called after `started = true`
- Sound effects from `ts/audio/sound.ts`

---

## Progress Tracking

### `updateCarProgress(car: Car)`

Measures how far each car has traveled along the corridor skeleton:

```typescript
updateCarProgress(car: Car): void {
  if (!this.world.corridor) return;
  if (car.finishTime) return;  // Already finished

  car.progress = 0;

  // Find which skeleton segment the car is closest to
  const carPoint = new Point(car.x, car.y);
  const carSegment = getNearestSegment(carPoint, this.world.corridor.skeleton);

  // Sum lengths of all segments before the current one
  for (const segment of this.world.corridor.skeleton) {
    if (segment.equals(carSegment)) {
      // Project car position onto this segment
      const projection = segment.projectPoint(carPoint);
      car.progress += new Segment(segment.p1, projection.point).length();
      break;
    } else {
      car.progress += segment.length();
    }
  }

  // Normalize to [0, 1]
  const totalDistance = corridor.skeleton.reduce((acc, seg) => acc + seg.length(), 0);
  car.progress /= totalDistance;

  // Check finish
  if (car.progress >= 1) {
    car.progress = 1;
    car.finishTime = this.frameCount;
    if (car === this.myCar) taDaa();  // Victory sound for player
  }
}
```

### Statistics Display

Each car gets a progress bar in the statistics panel, managed by `RacePanel.updateStatistics()`:

```typescript
this.racePanel.createStatistics(this.cars); // setup (on init)
this.racePanel.updateStatistics(this.cars); // refresh (each frame)
```

---

## Collision Handling

The race uses `handleCollisionWithRoadBorders()` from `ts/simulator/training/modes/borderCollision.ts`:

```typescript
// Each frame:
for (const car of this.cars) {
  car.update(this.roadBorders);
  if (car.damaged) {
    handleCollisionWithRoadBorders(car, this.world.corridor.borders);
  }
}
```

Cars bounce off corridor walls instead of stopping — this keeps the race going even when cars make mistakes.

---

## Animation Loop

RaceSimulator inherits the shell's render-throttled `requestAnimationFrame` loop
(`SimulatorShell.animate(time)`). Physics (car updates, progress tracking,
viewport offset) happens in `update()`, called every frame. Rendering (world
draw, camera render, mini-map) happens in `draw(_time)`, called once per
`renderInterval` frames (default: every frame).

```typescript
protected update(): void {
  // 1. Car physics — update all cars against road borders
  if (this.#started) {
    for (const car of this.#cars) {
      car.update(borders);
    }
  }

  // 2. Viewport tracking — follow the tracked car
  if (trackTarget) {
    this.viewport.offset.x = -trackTarget.x;
    this.viewport.offset.y = -trackTarget.y;
  }

  // 3. Progress tracking + sort by corridor progress
  for (const car of this.#cars) this.#updateCarProgress(car);
  if (this.#world.corridor) this.#cars.sort(...);

  // 4. Refresh statistics panel
  this.racePanel.updateStatistics(this.#cars);

  // 5. Camera tracking
  this.camera?.move(trackTarget);
}

protected draw(_time: number): void {
  // 1. Reset viewport, render world (top-down with viewport)
  this.viewport.reset();
  this.#world.draw(this.gameCtx, { viewPoint, cars, bestCar, ... });

  // 2. Render mini-map
  this.miniMap.draw({ viewPoint, cars });

  // 3. Render 3D camera view
  this.camera.render(this.cameraCtx, this.#world, { keyCar, cars, traffic });
}
```

The loop is started by calling `this.animate(0)` at the end of the
RaceSimulator constructor. The countdown timer (3-2-1-GO!) sets `#started =
true`, after which `update()` begins stepping car physics each frame.

---

## Race Panel UI (`ts/simulator/racing/racePanel.ts`)

The `RacePanel` class handles all DOM construction and UI wiring for the race
page. It is created and owned by `RaceSimulator`:

```typescript
class RacePanel {
  constructor();
  configureToolbar(config): void; // toolbar selector wiring
  createPanel(onRestart): void; // dynamic restart button
  createStatistics(cars): void; // per-car stat entries
  updateStatistics(cars): void; // refresh values each frame
  startCounter(onStarted): void; // 3-2-1-GO! countdown
}
```

The panel is built dynamically at runtime:

```
┌─────────────────────────┐
│ Cars: [10]  🔄 Restart  │
└─────────────────────────┘
```

- **Restart button**: Reinitializes race with current world + car count

---

## Control Mode Integration

| Mode     | URL Parameter  | Control Object                     | Steering                    |
| -------- | -------------- | ---------------------------------- | --------------------------- |
| Keyboard | (default)      | `Controls('KEYS')`                 | Arrow keys / WASD           |
| Phone    | `?mode=phone`  | `PhoneControls(canvas)`            | Device tilt + touch         |
| Camera   | `?mode=camera` | `CameraControls(canvas, detector)` | Blue marker webcam tracking |

---

## File Loading in Race

### World Loading

Via `WorldLoader` (binds to `#loadWorldInput` in `<world-toolbar>`):

```typescript
new WorldLoader((worldInfo) => this.#initializeRace(worldInfo));
```

Loading a new world reinitializes the entire race (new corridor, new cars, new countdown).

### Car Loading

Via `CarLoader` (binds to `#loadCarInput` in `<world-toolbar>`):

```typescript
new CarLoader((carInfos: CarInfo[]) => {
  localStorage.setItem('bestPool', JSON.stringify(carInfos));
  this.#initializeRace(this.world); // Restart with new brain pool
});
```

Loading car files updates the pool in localStorage and restarts the race so AI opponents use the new brains.

---

## Sound Effects

| Event              | Sound Function | Description                |
| ------------------ | -------------- | -------------------------- |
| Countdown tick     | `beep(400)`    | Low beep at 3, 2, 1        |
| GO!                | `beep(600)`    | Higher-pitch beep          |
| Player finishes    | `taDaa()`      | Victory fanfare (two-tone) |
| Collision (future) | `explode()`    | Multi-oscillator explosion |
