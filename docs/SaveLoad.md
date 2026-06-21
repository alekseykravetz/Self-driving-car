# Save & Load System

The project uses two persistence mechanisms: browser localStorage for training state, and file-based I/O for sharing worlds and trained cars.

---

## LocalStorage Persistence

### Current Storage Schema

| Key                 | Type                 | Content                                                      | Written By                    |
| ------------------- | -------------------- | ------------------------------------------------------------ | ----------------------------- |
| `bestPool`          | `CarInfo[]`          | Array of top-K car configs with brains + physics             | TrainingManager.save()        |
| `raceCars`          | `CarInfo[]`          | Cars loaded via the race "Load car(s)" button (race-only)    | Race.#handleCarsLoaded        |
| `editorWorld`       | World JSON           | World saved by the world editor (was the legacy `world` key) | WorldEditor.save()            |
| `loadedWorlds`      | `LoadedWorldEntry[]` | User-loaded `.world` files (`{ id, name, data }`)            | StoreManager.addLoadedWorld() |
| `loadedCars`        | `LoadedCarEntry[]`   | User-loaded `.car` files (`{ id, name, data }`)              | StoreManager.addLoadedCar()   |
| `store:activeWorld` | `string`             | Id of the active world (`store:`/`loaded:`/`editor`)         | StoreManager                  |
| `store:activeCar`   | `string[]`           | JSON array of active car ids (multi-select)                  | StoreManager                  |

> **Id scheme:** `store:activeWorld` and `store:activeCar` store prefixed **ids**,
> not bare filenames: `store:<filename>` for bundled assets, `loaded:<genId>` for
> user-loaded files, and `editor` for the editor world. Legacy bare-filename
> values are normalized to `store:<filename>` on read.
>
> **Quota fallback:** `loadedWorlds`/`loadedCars` are persisted only when they
> fit; on `QuotaExceededError` the entry is kept in memory for the session
> (lost on refresh). The legacy `world` key is migrated to `editorWorld` once on
> first init.

> **Race vs. training pool separation:** The race reads `bestPool` read-only as
> one of its AI car sources, but its own "Load car(s)" button writes to the
> separate `raceCars` key and never overwrites `bestPool`. The simulator/training
> mode is the sole owner of `bestPool`. The `store:activeCar` key now holds a JSON
> array of ids (multiple cars may be active, or none); a legacy plain-string
> value is still read as a single-element selection.

### `bestPool` Format

```json
[
  {
    "maxSpeed": 3,
    "acceleration": 0.2,
    "friction": 0.05,
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
          "weights": [[-0.5, 0.3, ...], ...]
        },
        {
          "inputs": [1, 0, 1, 0, 0, 1],
          "outputs": [1, 1, 0, 0],
          "biases": [0.1, -0.2, 0.4, -0.6],
          "weights": [[...], ...]
        }
      ]
    }
  },
  // ... more pool members
]
```

Each entry is a complete `CarInfo` — physics config + sensor config + trained brain. This allows reproducing the exact car behavior.

---

## Legacy Migration

Older versions stored brains and car config separately. On first load, `loadPoolFromStorage()` auto-migrates:

### Legacy Keys

| Key           | Old Content                 | Migration Action                    |
| ------------- | --------------------------- | ----------------------------------- |
| `bestBrain`   | Single `NeuralNetwork` JSON | Combined into `bestPool[0].brain`   |
| `bestBrains`  | `NeuralNetwork[]` JSON      | Each becomes a pool entry's brain   |
| `bestCarInfo` | `CarInfo` (no brain field)  | Used as base config for all entries |

### Migration Logic (`storageManager.ts`)

```typescript
function loadPoolFromStorage(fallbackConfig?: CarInfo): CarInfo[] {
  // 1. Try unified key
  const stored = localStorage.getItem('bestPool');
  if (stored) return JSON.parse(stored);

  // 2. Legacy migration
  const legacyBrains = localStorage.getItem('bestBrains');
  const legacyBrain = localStorage.getItem('bestBrain');
  const legacyConfig = localStorage.getItem('bestCarInfo');

  if (legacyBrains || legacyBrain) {
    let brains = legacyBrains
      ? JSON.parse(legacyBrains)
      : [JSON.parse(legacyBrain)];

    const baseConfig = legacyConfig
      ? JSON.parse(legacyConfig)
      : fallbackConfig || DEFAULT_CONFIG;

    // Combine each brain with the base config
    const pool = brains.map((brain) => ({ ...baseConfig, brain }));

    // Write unified key, remove legacy keys
    localStorage.setItem('bestPool', JSON.stringify(pool));
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    return pool;
  }

  return [];
}
```

Migration is transparent — happens automatically on first access. Legacy keys are deleted after successful migration.

---

## File Formats

### World Files (`.world`)

**Format**: Pure JSON object containing the complete world state:

```json
{"graph":{"points":[...],"segments":[...]},"roadWidth":100,...}
```

**Parsing** (WorldLoader):

```typescript
const worldInfo = JSON.parse(content.trim());
```

**Content**: Complete world state including graph, road config, generated geometry, markings, viewport state.

### Car Files (`.car`)

**Format**: Plain JSON matching the `CarInfo` interface:

```json
{
  "maxSpeed": 8,
  "acceleration": 0.08,
  "friction": 0.04,
  "width": 30,
  "height": 50,
  "hiddenLayers": [6],
  "sensor": { "rayCount": 2, "rayLength": 350, "raySpread": 0.8, "rayOffset": -0.4 },
  "brain": { "levels": [...] }
}
```

Parsed by `CarLoader.parseCarFile()`.

### OSM Data Files (`.json`)

**Format**: Standard Overpass API JSON export:

```json
{
  "elements": [
    { "type": "node", "id": 12345, "lat": 31.6, "lon": 34.5 },
    { "type": "way", "id": 67890, "nodes": [12345, ...], "tags": { "highway": "primary" } }
  ]
}
```

---

## WorldLoader (`ts/world/loader/worldLoader.ts`)

### Responsibilities

- Binds to an existing file input element (`#loadWorldInput`) provided by the page
- Reads `.world` files when user selects them
- Parses the world data (pure JSON)
- Invokes a callback with the parsed world info

### Usage

```typescript
new WorldLoader((worldInfo) => {
  this.world = World.load(worldInfo);
  // ... reinitialize everything with new world
});
```

### Integration

The `<world-toolbar>` custom element contains a hidden file input with `id="loadWorldInput"`. WorldLoader binds to this element by ID. Just instantiate `new WorldLoader(callback)` after the panel is in the DOM.

---

## CarLoader (`ts/car/loader/carLoader.ts`)

### Responsibilities

- Finds or creates a file input element (`#loadCarInput`)
- Supports `multiple` file selection
- Parses each file (pure JSON)
- Returns array of all successfully parsed `CarInfo` objects
- Provides static utility methods

### Usage

```typescript
// Training/simulator: loaded cars become the training pool
new CarLoader((carInfos: CarInfo[]) => {
  if (carInfos.length === 0) return;
  savePoolToStorage(carInfos); // writes 'bestPool'
  // ... restart training with new brains
});

// Race: loaded cars become the race-only list (never touches 'bestPool')
new CarLoader((carInfos: CarInfo[]) => {
  if (carInfos.length === 0) return;
  saveRaceCars(carInfos); // writes 'raceCars'
  // ... restart race with the loaded cars
});
```

> **Note:** All `bestPool` writes go through `savePoolToStorage()` in `storageManager.ts`.
> The race uses `saveRaceCars()` / `loadRaceCars()` for its separate `raceCars` key
> and never writes `bestPool`.

### Static Helpers

```typescript
// Parse a single file content string
CarLoader.parseCarFile(content: string): CarInfo | null;

// Check if all cars in a pool have matching physics params
CarLoader.allParamsMatch(cars: CarInfo[]): boolean;

// Compare two car configs (ignoring brain)
CarLoader.compareCarParams(a: CarInfo, b: CarInfo): boolean;
```

---

## Save Operations

### Training Manager → Save (💾 button)

```typescript
// In TrainingPanelElement:
save(): void {
  const pool = getTopCarInfoPool(this.cars, this.evaluateFitness, this.poolSize);
  savePoolToStorage(pool);
}
```

Persists the current generation's top-K performers to localStorage.

### Training Manager → Save Car to File

```typescript
saveCarToFile(): void {
  const bestCarInfo = this.bestCar.toInfo();
  const blob = new Blob([JSON.stringify(bestCarInfo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // Trigger download as .car file
}
```

Downloads the best car as a `.car` JSON file that can be loaded later or shared.

### World Editor → Save

```typescript
// Serializes full world state as pure JSON
const worldData = JSON.stringify(world);
// Trigger download as .world file (pure JSON, no wrapper)
```

### Discard (🗑️ button)

```typescript
discardStoredPool(): void {
  localStorage.removeItem('bestPool');
  localStorage.removeItem('bestBrain');     // Legacy cleanup
  localStorage.removeItem('bestBrains');    // Legacy cleanup
  localStorage.removeItem('bestCarInfo');   // Legacy cleanup
}
```

### Race Cars (`raceCars`)

Cars loaded via the race "Load car(s)" button are persisted separately from the
training pool:

```typescript
function loadRaceCars(): CarInfo[]; // reads 'raceCars' (or [])
function saveRaceCars(cars: CarInfo[]): void; // writes 'raceCars' (removes key if empty)
```

The `raceCars` key is tracked by the store's localStorage panel, where it can be
exported or deleted alongside `bestPool` and `world`.

---

## Status Indicators

The Training Manager panel shows colored dots indicating localStorage sync state:

### Storage Status

| Color | Meaning                           |
| ----- | --------------------------------- |
| Green | `bestPool` exists in localStorage |
| Red   | No stored pool                    |

### Pool Status

| Color  | Meaning                                           |
| ------ | ------------------------------------------------- |
| Green  | Stored pool size matches current pool size config |
| Orange | Stored pool size differs from config              |
| Red    | No stored pool                                    |

### Car Config Status

| Color  | Meaning                                               |
| ------ | ----------------------------------------------------- |
| Green  | All stored car params match current UI control values |
| Orange | At least one parameter differs                        |
| Red    | No stored car config                                  |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    TRAINING SESSION                          │
│                                                             │
│  Cars drive → Best selected → Pool formed → Save to LS     │
│                                                             │
│  localStorage['bestPool'] ←──── savePoolToStorage(top K)    │
│         │                                                   │
│         └──── loadPoolFromStorage() ────→ Next generation   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    FILE SHARING                              │
│                                                             │
│  Save Car → .car file (JSON) → Share with others           │
│  Load Car → Parse .car → Store in pool → New training      │
│                                                             │
│  Save World → .world file → Share maps                     │
│  Load World → Parse → World.load() → New simulation        │
└─────────────────────────────────────────────────────────────┘
```

---

## Saved Files Reference (`saves/`)

| File                                        | Type  | Description                            |
| ------------------------------------------- | ----- | -------------------------------------- |
| `big_with_target.world`                     | World | Large map with start + target markings |
| `big.world`                                 | World | Large map without target               |
| `barnea.world`                              | World | Barnea neighborhood map                |
| `ir-hyain.world`                            | World | Ir HaYain map                          |
| `kohav-hazafon.world`                       | World | Kohav HaZafon neighborhood             |
| `kohav-hazafon-with-target.world`           | World | Same + race target                     |
| `ashkelon.world`                            | World | Ashkelon city roads                    |
| `path_finding.world`                        | World | Pathfinding demo map                   |
| `right_hand_rule.car`                       | Car   | Trained car (right-hand-rule behavior) |
| `right_hand_rule_racer.car`                 | Car   | Racing variant                         |
| `202606032130_stops_30x50_s3_rc5_rl150.car` | Car   | Trained with specific config in name   |
| `bestBrain.txt` / `bestBrain-new.txt`       | Brain | Legacy brain-only files                |
| `bestBrains.txt` / `bestBrains-top.txt`     | Brain | Legacy multi-brain pools               |
| `ashkelon-osm-data.json`                    | OSM   | Raw OpenStreetMap data (Ashkelon)      |
| `kohav-hazafon-osm-data.json`               | OSM   | Raw OpenStreetMap data (Kohav HaZafon) |

---

## Store System (`store/`)

Preloaded assets bundled with the application. See [Store.md](Store.md) for full documentation.

| File                                  | Type  | Description                         |
| ------------------------------------- | ----- | ----------------------------------- |
| `store/world/path_finding.world`      | World | Default pathfinding map (pure JSON) |
| `store/car/right_hand_rule_racer.car` | Car   | Default racer car (pure JSON)       |

Pages no longer use `<script src="/saves/...">` tags. Instead, `StoreManager.init()` loads assets from the store and provides them synchronously to all app pages.
