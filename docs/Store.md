# Store System

The Store system provides preloaded assets (worlds, cars) that are bundled with the application and available immediately on all pages. It replaces the old approach of embedding `.world` and `.car` files as `<script>` tags that set global variables.

## Architecture

```
store/
├── manifest.json          # Lists all available world and car files
├── world/
│   └── path_finding.world # Pure JSON world data
└── car/
    └── right_hand_rule_racer.car  # Pure JSON car data
```

### Components

| File                                       | Role                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts/store/types.ts`                        | Type definitions (`StoreManifest`, `StoreWorldEntry`, `StoreCarEntry`, `LocalStorageEntry`, `LoadedWorldEntry`, `LoadedCarEntry`, `UnifiedWorldEntry`, `UnifiedCarEntry`) |
| `ts/store/storeManager.ts`                 | Singleton: fetches manifest + all assets, holds user-loaded assets + editor world, manages active selection by id                                                         |
| `ts/store/storePanel.ts`                   | `<store-panel>` custom element — read-only viewer/manager for the landing page                                                                                            |
| `ts/store/templates/storePanelTemplate.ts` | HTML template for the panel                                                                                                                                               |

### Asset sources

The store aggregates assets from three sources. Each selectable entry carries a
prefixed **id** so selection is unambiguous across sources:

| Source     | World id           | Car id             | Origin                                          |
| ---------- | ------------------ | ------------------ | ----------------------------------------------- |
| **loaded** | `loaded:<genId>`   | `loaded:<genId>`   | User-loaded `.world` / `.car` files             |
| **editor** | `editor`           | —                  | World saved by the world editor (`editorWorld`) |
| **store**  | `store:<filename>` | `store:<filename>` | Bundled assets from `manifest.json`             |

`getAllWorlds()` / `getAllCars()` return entries ordered **loaded → editor →
store**, so the user's own files surface first.

### Data Flow

```
manifest.json → StoreManager.init() → fetches all listed files
                                     → parses worlds (detects start/target markers)
                                     → parses cars (via CarLoader.parseCarFile)
                                     → stores in memory
                                     → auto-selects first world if none active
```

> **Cars are not auto-selected.** The store starts with no active car so the
> race can run with just the player car. The user selects cars explicitly.

Pages access the active selection via:

```typescript
await StoreManager.init(); // Called once in page <script> before constructing app
const worldData = StoreManager.getActiveWorld(); // Static convenience
const carData = StoreManager.getActiveCar(); // First active car (or null)
const cars = StoreManager.getActiveCars(); // All active cars (multi-select)
const allCars = StoreManager.getAllCars(); // Every selectable car across all sources
```

> Worlds and cars are **selected in the in-page world toolbar** (`<world-toolbar>`),
> not in the landing-page `<store-panel>`. The toolbar's Load-World popover and
> Car selector list every entry from `getAllWorlds()` / `getAllCars()`. The Live
> Traffic Jam and Training pages use a **single-select** car selector; the Race
> page uses **multi-select**.

## Adding New Assets

1. Place the file in `store/world/` or `store/car/`
2. Update `store/manifest.json`:
   ```json
   {
     "worlds": ["path_finding.world", "my_new_world.world"],
     "cars": ["right_hand_rule_racer.car", "my_new_car.car"]
   }
   ```
3. The file will be automatically loaded and appear in the Store panel on the main page

## File Formats

### World Files (`.world`)

Pure JSON object with the world state:

```json
{
  "graph": { "points": [...], "segments": [...] },
  "envelopes": [...],
  "roadBorders": [...],
  "buildings": [...],
  "trees": [...],
  "laneGuides": [...],
  "markings": [{ "type": "start", ... }, { "type": "target", ... }],
  "zoom": 1.5,
  "offset": { "x": 100, "y": -200 }
}
```

### Car Files (`.car`)

Pure JSON object matching the `CarInfo` interface:

```json
{
  "acceleration": 0.08,
  "maxSpeed": 8,
  "friction": 0.04,
  "sensor": { "rayCount": 2, "rayLength": 350, "raySpread": 0.8, "rayOffset": -0.4 },
  "brain": { "levels": [...] }
}
```

## Active Selection

The active world and car(s) are persisted to localStorage as **ids** (see the
id scheme in [Asset sources](#asset-sources)):

- `store:activeWorld` — id of the active world (single-select)
- `store:activeCar` — JSON array of active car ids (multi-select, or empty)

Cars support **multiple active selections or none**. The relevant API:

```typescript
mgr.getActiveWorldId(): string | null;   // active world id
mgr.setActiveWorldId(id): void;          // select a world by id
mgr.getActiveCarIds(): string[];         // all selected car ids
mgr.setActiveCarIds(ids): void;          // replace the car selection
mgr.toggleActiveCarId(id): void;         // add if absent, remove if present
mgr.getActiveCars(): CarInfo[];          // all selected cars' data
```

Legacy values are normalized for backward compatibility: a bare filename id is
read as `store:<filename>`, and a plain-string `store:activeCar` value is read
as a single-element selection.

## User-loaded assets

Files loaded at runtime via the toolbar's file pickers are stored separately
from bundled store assets:

- `loadedWorlds` — `LoadedWorldEntry[]` = `{ id, name, data }[]`
- `loadedCars` — `LoadedCarEntry[]` = `{ id, name, data }[]`

`addLoadedWorld(name, data)` / `addLoadedCar(name, data)` persist to
localStorage when the file fits. On `QuotaExceededError` the entry is kept
**in memory only** for the session (lost on refresh) so oversized files still
work. Loading a file does **not** auto-select it.

The world editor's saved world lives under the `editorWorld` key (renamed from
the legacy `world` key, with one-time migration in `init()`).

When a page loads:

1. StoreManager initializes (fetches manifest + assets, hydrates loaded assets + editor world)
2. The page reads the active world/car(s) by id from StoreManager
3. World mode falls back to `getEditorWorld()` when no store/loaded world is active

## Landing Page Panel

The `<store-panel>` on `index.html` is a **read-only viewer/manager** — selection
happens in the world toolbar, not here. It displays three tabs:

| Tab              | Shows                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Worlds**       | Selected (✓), Name, Source (loaded/editor/store), start marker, target marker                                      |
| **Cars**         | Selected (✓), Name, Source, hidden layers, maxSpeed, acceleration, friction, rayCount, rayLength, raySpread        |
| **LocalStorage** | Key name, size, export/delete actions (tracks `bestPool`, `raceCars`, `editorWorld`, `loadedWorlds`, `loadedCars`) |

## Backward Compatibility

- **WorldLoader** still parses old `const world = World.load({...})` format when loading files manually via file picker
- **CarLoader** still parses old `let carInfo = {...}` format when loading files manually
- The `/saves/` folder is preserved but no longer auto-loaded via HTML script tags
- The legacy `world` localStorage key is migrated to `editorWorld` on first init
