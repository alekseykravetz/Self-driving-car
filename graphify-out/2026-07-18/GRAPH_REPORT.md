# Graph Report - Self-driving-car (2026-07-18)

## Corpus Check

- 210 files · ~212,212 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 2667 nodes · 5409 edges · 164 communities (140 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `3075a604`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- entry.js
- entry.ts
- world.ts
- raceSimulator.js
- utils.js
- Car
- world.js
- Point
- StoreManager
- point.js
- devDependencies
- NetworkVisualizer
- Segment
- GraphEditor
- TrainingPanelElement
- StoreManager
- WorldToolbarElement
- TrainingPanelElement
- worldGenerator.ts
- Consolidate Keyboard Routing into KeyboardManager
- camera.ts
- Movement Model
- Normalize `private` → `#` Private Fields
- types.ts
- worldEditor.js
- raceSimulator.ts
- Fix Import Type Annotations
- WorldEditor
- Light
- Light
- RaceSimulator
- carBrainAdapter.ts
- CarInfo
- Fix Layer Violation: Extract `CarBrainAdapter.trainStep()`
- cars
- Remove Dead Barrel File `ts/utils.ts`
- TrainingSimulator
- RaceSimulator
- CarBrainAdapter
- compilerOptions
- trafficSimulator.ts
- WorldLayersToolbarElement
- TrainingInitModalElement
- WorldTrainingStrategy
- SpatialHashGrid
- TrafficControlGrid
- Car Class (`ts/car/car.ts`)
- Serialization
- CarDrawData
- Architectural Violations & Concerns
- Controls
- LayoutToolbarElement
- utils.ts
- HeatmapGrid
- AnimationLoopToolbarElement
- CameraControls
- osm.ts
- layoutManager.ts
- MarkingEditor
- migrate-worlds.mjs
- SimulatorShell
- WorldTrainingStrategy
- carPhysics.ts
- simulatorShell.ts
- WorldGenerator
- CameraControls
- controls.ts
- SensorRaycaster
- Viewport System
- graphify.js
- publish-site.sh
- ES Modules Refactoring — `module: "none"` → `module: "nodenext"`
- Project Architecture
- Online Imitation Learning (`NeuralNetwork.trainStep`)
- Self-Driving Car Simulator
- Architecture Fix Tasklist
- Implementation
- Camera & 3D Rendering
- AI Architect Audit Report
- HumanTrainingPanelElement
- Task 08 — Add scale indicator with zoom value in viewport (main canvas + mini-map)
- Racing Mode
- Task 01 — World Layers panel, lazy generation & lean world persistence
- Implementation Steps
- Implementation
- Implementation Steps
- Implementation
- Main Simulator — World Mode (`ts/simulator/training/trainingSimulator.ts`)
- Task Planning Workflow
- 1. Architectural Violations & Concerns
- Feature A1: Traffic Light Perception for AI Cars
- Units & Conversions
- AI Architect Agent Instruction Profile
- Task 01 — Neural-network visualizer: interactivity, meaningful animation & readable colors
- AI Architect Agent Instruction Profile
- Implementation Steps
- What changes
- Feature C1: Spatial Congestion Heatmap
- HumanTrainingConfigModalElement
- Keyboard Architecture
- Store System
- architect.md
- CarInfo
- Ray/Rendering/Data Model per Sophistication Mode
- Redesign: Unified State-Aware Sensor (Replaces B1 / A1)
- KeyboardManager
- Simple Road Simulator (Simple Mode)
- Training Manager (`ts/simulator/training/trainingPanel.ts`)
- opencode.json
- 1. Feature Expansion Axes
- AGENTS.md — Self-Driving Car Simulator
- Live Traffic Jam Simulator (`ts/simulator/traffic/trafficSimulator.ts`)
- Sound System
- Human Backpropagation Simulator (`ts/simulator/humanTraining/humanBackpropSimulator.ts`)
- Simulators & Training Environments
- ShortcutsToolbarElement
- CorridorEditor
- reviewer.md
- Docs Sync Workflow
- Integrate spatial grid into CarPhysics.assessDamage
- Project Goal
- Pool Manager (`ts/simulator/training/genetics/poolManager.ts`)
- Task 01 — Fix Prettier quote-style drift
- Task 02 — Remove orphaned compiled JS
- Task 03 — Clean stale ESLint allowlist
- Task 05 — Standardize error handling
- Task 06 — Migrate legacy save formats
- Task 07 — Split god classes
- AI Agent Refactor Plan
- EditorToolbarElement
- Accuracy display
- Layout Management (`ts/simulator/rendering/layoutManager.ts`)
- Storage Manager (`ts/simulator/training/genetics/storageManager.ts`)
- planner.md
- Task 04 — Extract shared JSON/legacy parser
- Subtask 1 — Harden Neural Network Serialization
- Subtask 2 — Introduce a Car Factory/Deserializer
- Subtask 3 — Extract Car Physics from the Main Car Class
- Subtask 4 — Extract Car Rendering and Sprite Caching
- Subtask 5 — Extract Car Brain Adapter for Control Mapping
- Subtask 6 — Isolate Sensor Raycasting Logic
- Subtask 7 — Decouple Simulator Shell from Page-Specific DOM Queries
- Subtask 8 — Extract Race UI from Race Gameplay Logic
- Subtask 9 — Split World Toolbar Responsibilities
- Subtask 10 — Separate World Generation from World State
- Subtask 11 — Review TypeScript Module Configuration
- ~~Remove unsafe NeuralNetwork.mutateFromPool()~~ **COMPLETED**
- What `Sensor.update()` populates — per mode
- README.md
- Extract draw methods from math primitives
- Move DEFAULT_CAR_CONFIG from ts/math/utils.ts to ts/car/config.ts
- Refactor Race to extend SimulatorShell
- Extract magic numbers to named constants
- Changes
- Fix script tag ordering in HTML files
- Split TrainingSimulator (714 lines)
- CarRenderer
- dependencies
- Issue 1 — Classified ray doesn't draw second dot on border
- Issue 2 — Sophistication select not syncing/disabling in training init modal
- Issue 3 — Traffic simulator doesn't use right brain/size for classified cars
- Assistant (Plan · DeepSeek V4 Pro · 61.5s)

## God Nodes (most connected - your core abstractions)

1. `Point` - 161 edges
2. `Car` - 79 edges
3. `Segment` - 68 edges
4. `Viewport` - 58 edges
5. `World` - 58 edges
6. `CarInfo` - 53 edges
7. `StoreManager` - 50 edges
8. `Graph` - 44 edges
9. `Classified vs Traffic sensor rays & training sync issues` - 43 edges
10. `TrainingPanelElement` - 40 edges

## Surprising Connections (you probably didn't know these)

- `migrate()` --indirect_call--> `scale()` [INFERRED]
  scripts/migrate-worlds.mjs → ts/math/utils.ts
- `PointWithBlueness` --inherits--> `Point` [EXTRACTED]
  ts/car/controls/markerDetector.ts → ts/math/primitives/point.ts
- `TrafficControlHit` --references--> `Point` [EXTRACTED]
  ts/math/trafficControlGrid.ts → ts/math/primitives/point.ts
- `Camera` --references--> `Point` [EXTRACTED]
  ts/camera/camera.ts → ts/math/primitives/point.ts
- `SimulatorShell` --references--> `Camera` [EXTRACTED]
  ts/simulator/core/simulatorShell.ts → ts/camera/camera.ts

## Import Cycles

- None detected.

## Communities (164 total, 24 thin omitted)

### Community 0 - "entry.js"

Cohesion: 0.08
Nodes (36): Envelope, PolygonBounds, average(), lerp(), mulberry32(), translate(), IMiniMapCar, drawEnvelope() (+28 more)

### Community 1 - "entry.ts"

Cohesion: 0.15
Nodes (18): ControlType, ShortestPathPoint, GridSegment, MiniMap, WORLD_LAYER_BUTTONS, PointDrawOptions, LayoutMode, CachedLayout (+10 more)

### Community 2 - "world.ts"

Cohesion: 0.09
Nodes (12): ScaleIndicator, Viewport, ViewportMode, CrossingEditor, MarkingEditor, ParkingEditor, StartEditor, StopEditor (+4 more)

### Community 3 - "raceSimulator.js"

Cohesion: 0.14
Nodes (19): CarCallbacks, CarOptions, DEFAULT_CAR_CONFIG, DEFAULT_HIDDEN_LAYERS, loadSimLayerVisibility(), createCarsForTraining(), getSortedAICars(), getTopAICars() (+11 more)

### Community 4 - "utils.js"

Cohesion: 0.24
Nodes (3): ToolbarAssetSelectors, stripFileExtension(), smNormalizeWorldId()

### Community 5 - "Car"

Cohesion: 0.24
Nodes (6): formatElapsedTime(), formatKmhFromPxPerFrame(), formatMetersFromWorldPixels(), framesToSeconds(), pxPerFrameToKmh(), worldPixelsToMeters()

### Community 7 - "Point"

Cohesion: 0.13
Nodes (20): add(), cross(), distance(), dot(), formatDegrees(), getFake3dPoint(), getNearestPoint(), getNearestSegment() (+12 more)

### Community 8 - "StoreManager"

Cohesion: 0.08
Nodes (18): SM_ARRAY_LS_KEYS, SM_TRACKED_LS_KEYS, smCountItems(), smGenId(), smPersist(), smWorldMarkers(), StoreManager, AssetSource (+10 more)

### Community 9 - "point.js"

Cohesion: 0.25
Nodes (9): SensorRaycaster, TaggedHit, SensorTrafficControl, nearestEdgeOffset(), polysIntersect(), TrafficControlEntry, TrafficControlHit, TrafficControlState (+1 more)

### Community 10 - "devDependencies"

Cohesion: 0.04
Nodes (46): concurrently, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, globals, onchange, author (+38 more)

### Community 11 - "NetworkVisualizer"

Cohesion: 0.07
Nodes (8): Level, NeuralNetwork, ArrowDir, ConnectionEdge, Hover, NetworkLayout, NetworkVisualizer, NeuronNode

### Community 12 - "Segment"

Cohesion: 0.07
Nodes (19): Graph, Point, Segment, angle(), MiniMapDrawOptions, drawSegment(), SegmentDrawOptions, DragState (+11 more)

### Community 14 - "TrainingPanelElement"

Cohesion: 0.29
Nodes (3): spFormatHiddenLayers(), spFormatSize(), StorePanelElement

### Community 15 - "StoreManager"

Cohesion: 0.40
Nodes (5): Class Structure, Mini-Map (`ts/mini-map/miniMap.ts`), Rendering, Usage in Race, Usage in Simulator

### Community 16 - "WorldToolbarElement"

Cohesion: 0.06
Nodes (6): BorderMode, ToolbarModeControls, ToolbarViewportMode, TrackingMode, WorldToolbarElement, RacePanel

### Community 17 - "TrainingPanelElement"

Cohesion: 0.11
Nodes (3): applyPoolToCars(), brainsCompatible(), TrainingPanelElement

### Community 18 - "worldGenerator.ts"

Cohesion: 0.12
Nodes (13): Camera, extrudeCarShape(), extrudePolygons(), extrudeTreeShapes(), getCentroid(), movePointsInward(), ICameraPoint, ICameraRenderOptions (+5 more)

### Community 19 - "Consolidate Keyboard Routing into KeyboardManager"

Cohesion: 0.15
Nodes (12): 1. `ts/simulator/core/simulatorShell.ts` — move `v` key to KeyboardManager, 2. `ts/simulator/training/trainingInitModal.ts` — Escape via KeyboardManager push/pop, 3. `ts/simulator/humanTraining/humanTrainingConfigModal.ts` — same push/pop pattern, 4. `ts/car/controls/controls.ts` — route KEYS controls through KeyboardManager, Acceptance criteria, Brain / persistence considerations, Consolidate Keyboard Routing into KeyboardManager, Context (read first) (+4 more)

### Community 20 - "camera.ts"

Cohesion: 0.04
Nodes (45): 1. Visual Theme & Atmosphere, 2. Color Palette & Roles, 3. Typography Rules, 4. Component Stylings, 5. Layout Principles, 6. Depth & Elevation, 7. Do's and Don'ts, 8. Responsive Behavior (+37 more)

### Community 21 - "Movement Model"

Cohesion: 0.17
Nodes (12): 1. Acceleration, 2. Speed Capping, 3. Friction (always applied), 4. Steering, 5. Position Update (CarPhysics.update / CarPhysics.move), Acceleration & Friction Reference, Default Parameters, Key Behaviors (+4 more)

### Community 22 - "Normalize `private` → `#` Private Fields"

Cohesion: 0.17
Nodes (11): 1. `ts/store/storeManager.ts`, 2. `ts/neural-network/visualizer.ts`, Acceptance criteria, Brain / persistence considerations, Context (read first), Docs to update, Goal, Implementation (+3 more)

### Community 23 - "types.ts"

Cohesion: 0.11
Nodes (19): AI Integration, Car Drawing (`draw`), Car Physics & Perception, Class Structure, Collision Detection, Collision Response (`handleCollisionWithRoadBorders`), Damage Assessment (`#assessDamage`), Default Sensor Configuration (+11 more)

### Community 24 - "worldEditor.js"

Cohesion: 0.05
Nodes (42): Base Class, Building (`building.ts`), Building Generation (`wgGenerateBuildings`), Building Parameters, Class Structure, Class Structure, Corridor Editor (`corridorEditor.ts`), Corridors (`ts/world/corridor.ts`) (+34 more)

### Community 25 - "raceSimulator.ts"

Cohesion: 0.05
Nodes (37): Assistant (Plan · DeepSeek V4 Pro · 11.6s), Assistant (Plan · DeepSeek V4 Pro · 12.4s), Assistant (Plan · DeepSeek V4 Pro · 12.5s), Assistant (Plan · DeepSeek V4 Pro · 13.7s), Assistant (Plan · DeepSeek V4 Pro · 159.8s), Assistant (Plan · DeepSeek V4 Pro · 160.4s), Assistant (Plan · DeepSeek V4 Pro · 246.0s), Assistant (Plan · DeepSeek V4 Pro · 25.5s) (+29 more)

### Community 26 - "Fix Import Type Annotations"

Cohesion: 0.18
Nodes (10): 1. `ts/car/brain/carBrainAdapter.ts` — line 1, 2. `ts/car/controls/cameraControls.ts` — line 1, Acceptance criteria, Brain / persistence considerations, Context (read first), Docs to update, Fix Import Type Annotations, Goal (+2 more)

### Community 27 - "WorldEditor"

Cohesion: 0.15
Nodes (3): Editor, saveLayerVisibility(), WorldEditor

### Community 28 - "Light"

Cohesion: 0.05
Nodes (37): 1. Strengthen the Layered Architecture, 2. Enforce explicit serialization boundaries, 3. Convert large classes into smaller collaborators, 4. Refine custom element boundaries using Atomic Design, 5. Reduce global DOM coupling in `SimulatorShell`, AI Architect Audit Report, 🚨 Architectural Violations & Concerns, 🌟 Commendable Implementations (+29 more)

### Community 29 - "Light"

Cohesion: 0.13
Nodes (4): CYCLE_ORDER, LightEditor, Light, TrafficManager

### Community 30 - "RaceSimulator"

Cohesion: 0.22
Nodes (5): beep(), explode(), SoundEngine, taDaa(), buildRoadBorders()

### Community 31 - "carBrainAdapter.ts"

Cohesion: 0.18
Nodes (7): Brain, BrainControlOutput, IntersectionPoint, encodeTrafficState(), Sensor, ObstacleType, SensorReading

### Community 32 - "CarInfo"

Cohesion: 0.19
Nodes (6): getRandomColor(), updateSimpleCars(), updateSimpleTraffic(), generateInitialTraffic(), generateTrafficRow(), trafficCarOptions()

### Community 33 - "Fix Layer Violation: Extract `CarBrainAdapter.trainStep()`"

Cohesion: 0.18
Nodes (10): 1. `ts/car/brain/carBrainAdapter.ts` — add `trainStep` method, 2. `ts/car/car.ts` — replace all `NeuralNetwork` references, Acceptance criteria, Brain / persistence considerations, Context (read first), Docs to update, Fix Layer Violation: Extract `CarBrainAdapter.trainStep()`, Goal (+2 more)

### Community 34 - "cars"

Cohesion: 0.10
Nodes (19): ashkelon-kohav-hazafon.world, barnea.world, best-1_b6_s3.5_rc5_rl150.car, best-2_b16_s5_rc11_rl150.car.car, best-2_b6_s3.5_rc5_rl150.car, best_b16_s5_rc11_rl150.car, best_b16x16_s8_rc15_rl200.car, best_b6_s3_rc5_rl150.car (+11 more)

### Community 35 - "Remove Dead Barrel File `ts/utils.ts`"

Cohesion: 0.18
Nodes (10): 1. Delete `ts/utils.ts`, 2. Update `AGENTS.md`, Acceptance criteria, Brain / persistence considerations, Context (read first), Docs to update, Goal, Implementation (+2 more)

### Community 36 - "TrainingSimulator"

Cohesion: 0.13
Nodes (3): SimpleSimState, SimpleTrainingStrategy, TrainingSimulator

### Community 37 - "RaceSimulator"

Cohesion: 0.27
Nodes (3): CarControls, RaceSimulator, queryTrafficControlsNearCar()

### Community 39 - "compilerOptions"

Cohesion: 0.11
Nodes (17): eslint.config.mjs, compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, importHelpers, module, moduleResolution (+9 more)

### Community 46 - "Car Class (`ts/car/car.ts`)"

Cohesion: 0.29
Nodes (7): Car Class (`ts/car/car.ts`), Class Structure, Human Backpropagation Fields, Learning toggle (L key), Panel info displays, Rolling-window accuracy, `trainStep` return value

### Community 47 - "Serialization"

Cohesion: 0.40
Nodes (5): `Car.fromInfo(opts, info?)` (preferred), `Car.load(info: CarInfo)` (legacy), `Car.toInfo(): CarInfo`, File Format (`.car` files), Serialization

### Community 49 - "Architectural Violations & Concerns"

Cohesion: 0.05
Nodes (35): 10. html/world.html — Missing SpatialGrid (Low Severity), 10. Normalize private keyword usage to # private fields for any class that doesn't need subclass access (e.g., TrainingSimulator's private mode could be #mode), 1. Refactor Race to extend SimulatorShell, 1. ts/games/race.ts — Template Method Pattern Violation (High Severity), 1. ts/math/spatialGrid.ts — Excellent Spatial Index Implementation, 2. Extract draw methods from math primitives, 2. ts/car/rendering/carRenderer.ts — Well-Executed Flyweight Pattern, 2. ts/math/primitives/point.ts — Domain Leakage (Medium Severity) (+27 more)

### Community 54 - "HeatmapGrid"

Cohesion: 0.14
Nodes (6): HeatmapCell, HeatmapGrid, VehiclePosition, HeatmapRenderer, occupancyColor(), VisibleWorldRect

### Community 64 - "CameraControls"

Cohesion: 0.20
Nodes (4): CameraControls, Marker, MarkerDetector, PointWithBlueness

### Community 65 - "osm.ts"

Cohesion: 0.20
Nodes (10): Osm, OsmData, OsmElement, OsmNodeElement, OsmPoint, OsmWayElement, OsmWayTags, ParsedRoads (+2 more)

### Community 66 - "layoutManager.ts"

Cohesion: 0.06
Nodes (35): `containsPoint(p: Point): boolean` — Ray Casting Algorithm, Conversion Process, `directionVector(): Point`, `distanceToPoint(p: Point): number`, `drawEnvelope` (`envelopeRenderer.ts`), `drawPoint` (`pointRenderer.ts`), `drawPolygon` (`polygonRenderer.ts`), `drawSegment` (`segmentRenderer.ts`) (+27 more)

### Community 69 - "MarkingEditor"

Cohesion: 0.06
Nodes (35): `bestPool` Format, Car Config Status, Car Files (`.car`), CarLoader (`ts/car/loader/carLoader.ts`), Current Storage Schema, Data Flow Summary, Discard (🗑️ button), File Formats (+27 more)

### Community 70 - "migrate-worlds.mjs"

Cohesion: 0.31
Nodes (10): \_\_dirname, isV2(), lerp(), main(), migrate(), mulberry32(), r1(), r2() (+2 more)

### Community 71 - "SimulatorShell"

Cohesion: 0.21
Nodes (3): saveSimLayerVisibility(), SimulatorShell, resizeSimulatorLayout()

### Community 72 - "WorldTrainingStrategy"

Cohesion: 0.06
Nodes (32): Activation, Activation, AI Mode — Neural network control, Architecture, Camera Controls (`ts/car/controls/cameraControls.ts`), Canvas Rotation (Immersive Feedback), Car Driving (Race / Simulator — KEYS mode), Class Structure (+24 more)

### Community 77 - "carPhysics.ts"

Cohesion: 0.50
Nodes (3): CarState, ControlsState, CarPhysics

### Community 78 - "simulatorShell.ts"

Cohesion: 0.07
Nodes (29): AI Product Architect — Feature Recommendation Report, Appendix: Feature Delivery Order, Architectural Implementation Strategy, Architectural Implementation Strategy, Architectural Implementation Strategy, Architectural Implementation Strategy, Architectural Implementation Strategy, Core Concept (+21 more)

### Community 79 - "WorldGenerator"

Cohesion: 0.29
Nodes (3): wgGenerateLaneGuides(), wgGenerateSeparatorBorders(), WorldGenerator

### Community 87 - "CameraControls"

Cohesion: 0.09
Nodes (4): Car, tpConfigHtml(), TrafficPanelElement, TrainingManagerOptions

### Community 95 - "controls.ts"

Cohesion: 0.07
Nodes (26): 📊 10. Summary Statistics, 🧭 11. Improvement Opportunities (Quick Wins), 📦 1. Project Overview, 🧰 2. Technology Stack, 3.1 Plain Classes vs Custom Elements vs Free Functions, 3.2 Recurring Design Patterns, 3.3 Class Size & Complexity, 🧱 3. Class & Module Patterns (+18 more)

### Community 96 - "SensorRaycaster"

Cohesion: 0.07
Nodes (26): 📊 10. Summary Statistics, 🧭 11. Improvement Opportunities (Quick Wins), 📦 1. Project Overview, 🧰 2. Technology Stack, 3.1 Plain Classes vs Custom Elements vs Free Functions, 3.2 Recurring Design Patterns, 3.3 Class Size & Complexity, 🧱 3. Class & Module Patterns (+18 more)

### Community 98 - "Viewport System"

Cohesion: 0.10
Nodes (20): Class Structure, Class Structure, Coordinate System, Display Modes, Event Listener Setup, Integration, Mouse Down (initiate pan), Mouse Move (update offset during drag) (+12 more)

### Community 106 - "ES Modules Refactoring — `module: "none"` → `module: "nodenext"`"

Cohesion: 0.08
Nodes (23): 1.1 tsconfig.json, 1.2 ESLint config — strip globals, 1.3 serve.json — MIME / CORS, 2.1 Map all cross-file references, 2.2 Rule for import paths, 2.3 Pattern per file, 2.4 Circular dependency check, 2.5 Generate config checklists (+15 more)

### Community 107 - "Project Architecture"

Cohesion: 0.06
Nodes (36): 1. Mathematical Foundations (`ts/math/`), 2. Car System (`ts/car/`), 3. Neural Network (`ts/neural-network/`), 4. World Editor (`ts/world/`), 5. Simulators & Training (`ts/simulator/training/`, `ts/world/simple/`), 5b. Shared Simulator Utilities (`ts/simulator/`), 5d. Reusable Simulator Core (`ts/simulator/core/`, `ts/simulator/traffic/`, `ts/simulator/racing/`), 5e. Reusable Loaders (`ts/world/loader/`, `ts/car/loader/`) (+28 more)

### Community 109 - "Online Imitation Learning (`NeuralNetwork.trainStep`)"

Cohesion: 0.05
Nodes (38): Algorithm, Autopilot toggle, Bias sign convention, Brain Application (`applyPoolToCars`), Car configuration, Colour palette (diverging amber ↔ cyan), Configurable Architecture, Configurable Parameters (via UI) (+30 more)

### Community 110 - "Self-Driving Car Simulator"

Cohesion: 0.09
Nodes (22): Available Commands, Build System, Car Files (`.car`), Car Physics, Contributing, Documentation, Features, How It Works (+14 more)

### Community 111 - "Architecture Fix Tasklist"

Cohesion: 0.09
Nodes (21): 10. Fix Brain/Sensor Desync in `car.ts:load()`, 1. Delete Stale Duplicate LayoutManager, 2. Extract Domain Constants from `ts/math/utils.ts` into `ts/math/worldUnits.ts`, 3. Fix Layer Violation: `ts/math/graph/graph.ts` Imports Rendering, 4. Fix Layer Violation: `ts/math/heatmapGrid.ts` Imports `Car` Type, 5. Fix ES2022 Private Field Violations, 5a. `ts/car/physics/carPhysics.ts:26`, 5b. `ts/neural-network/network.ts:179` (+13 more)

### Community 112 - "Implementation"

Cohesion: 0.09
Nodes (21): 10. `ts/simulator/humanTraining/entry.ts` — new, 11. `html/human-training.html` — new, 12. `index.html` — new landing card, 13. `styles/style.css` — new panel + landing card styles, 1. `ts/neural-network/network.ts` — port `trainStep` from the branch, 2. `ts/car/car.ts` — learning hook, autopilot, accuracy output, 3. `ts/neural-network/visualizer.ts` — output-neuron match highlighting, 4. `ts/simulator/core/simulatorShell.ts` — pass `match` through (+13 more)

### Community 113 - "Camera & 3D Rendering"

Cohesion: 0.10
Nodes (20): 3D Extrusion, 3D Projection (`#projectPoint`), Buildings (`#extrude`), Camera & 3D Rendering, Camera Class (`ts/camera/camera.ts`), Camera Movement, Cars (`#extrudeCar`), Debug Drawing (`draw`) (+12 more)

### Community 114 - "AI Architect Audit Report"

Cohesion: 0.10
Nodes (20): 1. Layer Isolation & Import Hygiene, 2. Structural & Folder Boundaries (FSD), 3. Design Pattern Evaluation, 4. Code Standards & Style Adherence, 5. Structural Reorganization Recommendations, AI Architect Audit Report, Anti-Patterns (Bad), Appendix: Files Reviewed (+12 more)

### Community 116 - "Task 08 — Add scale indicator with zoom value in viewport (main canvas + mini-map)"

Cohesion: 0.10
Nodes (19): 1. Extend viewport interfaces, 2. Create scale indicator component, 3. Integrate into viewport rendering, 4. Visual design, 5. Responsive behavior, 6. Add to rendering pipeline, 7. Testing & refinement, Acceptance Criteria (+11 more)

### Community 118 - "Racing Mode"

Cohesion: 0.11
Nodes (17): Animation Loop, Car Generation, Car Loading, Class Structure, Collision Handling, Control Mode Integration, Countdown System, File Loading in Race (+9 more)

### Community 119 - "Task 01 — World Layers panel, lazy generation & lean world persistence"

Cohesion: 0.11
Nodes (17): A. World Layers model, B. Lazy / decoupled generation, C. Lean persistence + tree prototype/instance model, Current state (what exists today), D. Two new tree types, Data model summary (before → after), E. Editor: World Layers panel, F. Existing store worlds — migration (+9 more)

### Community 120 - "Implementation Steps"

Cohesion: 0.11
Nodes (17): 1. Create `ts/car/sensors/sensorReading.ts`, 2. Extend raycaster with tagged hit detection, 3. Rewrite `Sensor` class, 4. Update `CarBrainAdapter`, 5. Update `Car` + `CarInfo`, 6. Update `compareCarInfoParams` (carLoader.ts), 7. Wire simulators, 8. Update UI (+9 more)

### Community 121 - "Implementation"

Cohesion: 0.11
Nodes (17): 1. `ts/car/controls/controls.ts` — add `frozen` flag, 2. `ts/car/car.ts` — wire `frozen` to autopilot, add brain-change flag, add learning-state getter, 3. `ts/neural-network/network.ts` — `trainStep` returns boolean, 4. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — rolling accuracy, L-key toggle, panel info wiring, 5. `ts/simulator/humanTraining/humanTrainingPanel.ts` — new panel API methods, 6. `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — redesigned template, 7. `ts/panels/keyboardManager.ts` — add `setToggleActive` method, 8. `ts/panels/latchedToggle.ts` — no changes needed (+9 more)

### Community 122 - "Implementation Steps"

Cohesion: 0.12
Nodes (16): 1. Normalize displayed file names (no extensions), 2. Car loader "load from file" icon parity, 3. Multi-select selected-cars summary + tooltip, 4. Shortcuts toolbar size consistency, 5. Viewport touchpad mode icon update, 6. Training panel layout + speed metrics, 7. World editor toolbar order, storage section, labels, and delete icon, 8. Documentation updates (+8 more)

### Community 123 - "Implementation"

Cohesion: 0.12
Nodes (16): 1. `ts/car/car.ts` — reset controls when autopilot is turned off, 2. `ts/panels/keyboardManager.ts` — add `latchOnly` option for press-to-toggle behavior, 3. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — set `latchOnly: true` on L key binding, 4. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — fix traffic overlap in `#regenTraffic`, 5. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — build brain inspector data each frame, 6. `ts/simulator/humanTraining/humanTrainingPanel.ts` — add `setBrainInfo` method, 7. `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — add brain inspector section + fix "How it works" text, 8. `styles/style.css` — fix panel text color + add brain inspector styles (+8 more)

### Community 124 - "Main Simulator — World Mode (`ts/simulator/training/trainingSimulator.ts`)"

Cohesion: 0.12
Nodes (16): Animation Loop (Pseudocode), Border Modes, Fitness (World Mode), Initialization Flow, IWorld Interface, Main Simulator — World Mode (`ts/simulator/training/trainingSimulator.ts`), Pause Behavior, Performance: Spatial Filtering (+8 more)

### Community 125 - "Task Planning Workflow"

Cohesion: 0.12
Nodes (15): Cost model summary, Required sections, Reviewer verdict handling, Step 1 — Capture the raw request, Step 2 — Interview (hybrid: question tool first, free-form after), Step 3 — Write the plan to `tasks/<slug>.md`, Step 4 — STOP for review, Step 5 — Hand off to build (only after user says proceed) (+7 more)

### Community 126 - "1. Architectural Violations & Concerns"

Cohesion: 0.12
Nodes (15): 1. Architectural Violations & Concerns, 2. Commendable Implementations, 3. Structural Reorganization Recommendations, AI Architecture Audit Report — Self-Driving Car Simulator, CRITICAL: Circular Dependencies, CRITICAL: Layer 2 Upward Import (Layer Boundary Violation), Immediate Priority, Low Priority / Nice-to-Have (+7 more)

### Community 127 - "Feature A1: Traffic Light Perception for AI Cars"

Cohesion: 0.12
Nodes (15): 1. Add `TrafficControlGrid` to spatial indexing, 2. Extend `Sensor.update()` signature, 3. Update sensor readings output, 4. Add `trafficAwareness` flag to `CarInfo`, 5. Update `CarBrainAdapter`, 6. Serialization, 7. Sensor-Ray Rendering, Acceptance Criteria (+7 more)

### Community 128 - "Units & Conversions"

Cohesion: 0.13
Nodes (14): Acceleration / Friction Units, Car Size Scale, Core Constants, Elapsed Time Display, FPS Counter, Helper Functions, Helper Functions (Use These), OSM Geographic Scale (+6 more)

### Community 129 - "AI Architect Agent Instruction Profile"

Cohesion: 0.13
Nodes (14): 1. Core Architectural Constraints to Enforce, 2. Structural & Folder Boundary Auditing (FSD & Atomic Design), 3. Design Pattern Evaluation (Good vs. Bad), 4. Code Standards & Style Adherence, 5. Output Reporting Schema, AI Architect Agent Instruction Profile, Anti-Patterns to Flag (Bad), Architectural Violations & Concerns (+6 more)

### Community 130 - "Task 01 — Neural-network visualizer: interactivity, meaningful animation & readable colors"

Cohesion: 0.13
Nodes (14): A. Colors — dedicated, high-contrast palette (do NOT change shared `getRGBA`), Acceptance criteria, B. Animation — signal-flow pulses (replace the global dash scroll), C. Hover interactivity, Current state (what exists today), D. Extras — INCLUDED in scope (previously nice-to-have), Decisions (locked), Files likely affected (+6 more)

### Community 131 - "AI Architect Agent Instruction Profile"

Cohesion: 0.13
Nodes (14): 1. Core Architectural Constraints to Enforce, 2. Structural & Folder Boundary Auditing (FSD & Atomic Design), 3. Design Pattern Evaluation (Good vs. Bad), 4. Code Standards & Style Adherence, 5. Output Reporting Schema, AI Architect Agent Instruction Profile, Anti-Patterns to Flag (Bad), 🚨 Architectural Violations & Concerns (+6 more)

### Community 132 - "Implementation Steps"

Cohesion: 0.13
Nodes (14): 1. Add override API to `Light`, 2. Add override methods to `TrafficManager`, 3. Click interaction in World Editor, 4. Global green wave hotkey, 5. Shortcuts toolbar, 6. Rendering, 7. Persistence, Acceptance Criteria (+6 more)

### Community 134 - "What changes"

Cohesion: 0.14
Nodes (13): 1. `<world-layers-toolbar>` — Button becomes a toggle, 2. `WorldEditor` — Wire toggle into the draw loop, 2a. New field, 2b. Change callback registration (in `#addEventListeners`, line ~287), 2c. Modify the `draw()` loop (lines 500–510), 2d. `regenerateItems()` stays as-is (lines 484–493), 3. CSS — Toggle visual style for the regenerate button, 4. Edge cases (+5 more)

### Community 135 - "Feature C1: Spatial Congestion Heatmap"

Cohesion: 0.14
Nodes (13): 1. Create `HeatmapGrid` data structure (new file: `ts/math/heatmapGrid.ts`), 2. Create `HeatmapRenderer` (new file: `ts/rendering/heatmapRenderer.ts`), 3. Wire into simulators, 4. Add toggle UI, 5. Persistence, Acceptance Criteria, Core Concept, Feature C1: Spatial Congestion Heatmap (+5 more)

### Community 138 - "Keyboard Architecture"

Cohesion: 0.15
Nodes (12): Architecture rules, Files, Human Backpropagation Simulator (static set), Keyboard Architecture, LatchedToggle (`ts/panels/latchedToggle.ts`), Lifecycle, Overview, ShortcutBinding (+4 more)

### Community 139 - "Store System"

Cohesion: 0.15
Nodes (13): Active Selection, Adding New Assets, Architecture, Asset sources, Backward Compatibility, Car Files (`.car`), Components, Data Flow (+5 more)

### Community 141 - "architect.md"

Cohesion: 0.15
Nodes (12): 1. Core Architectural Constraints to Enforce, 2. Structural & Folder Boundary Auditing (FSD & Atomic Design), 3. Design Pattern Evaluation, 4. Code Standards & Style Adherence, 5. Output Reporting Schema, Anti-Patterns to Flag (Bad), Architectural Violations & Concerns, Commendable Implementations (+4 more)

### Community 142 - "CarInfo"

Cohesion: 0.20
Nodes (7): CarInfo, CarLoader, compareCarInfoParams(), normalizeStateAware(), parseCarFileContent(), HumanTrainingConfigResult, TrainingInitDefaults

### Community 143 - "Ray/Rendering/Data Model per Sophistication Mode"

Cohesion: 0.17
Nodes (12): basic, Brain Input (computeControls) - NOT AFFECTED, classified (after fix), classified (current - BROKEN), Does this affect the traffic light data for the brain?, `#drawClassified` — visual superset of `#drawTraffic`:, Drawing after fix, Ray/Rendering/Data Model per Sophistication Mode (+4 more)

### Community 144 - "Redesign: Unified State-Aware Sensor (Replaces B1 / A1)"

Cohesion: 0.17
Nodes (11): Backward compatibility, Brain input per ray, Bugs Fixed, Drawing, Files Changed, Implementation Order, Key Design Decisions, Motivation (+3 more)

### Community 147 - "Simple Road Simulator (Simple Mode)"

Cohesion: 0.18
Nodes (11): Access, Architecture, Dynamic Traffic (`generateTrafficRow`), Fitness (Simple Mode), Initial Traffic (`generateInitialTraffic`), Purpose, Simple Mode Update Loop (`ts/simulator/training/modes/simpleModeBehavior.ts`), Simple Road Simulator (Simple Mode) (+3 more)

### Community 148 - "Training Manager (`ts/simulator/training/trainingPanel.ts`)"

Cohesion: 0.18
Nodes (11): Class Structure, Configuration Flow, Control Panel UI, Custom Element Pattern, Genetic Algorithm Workflow, Key Design Decisions, Pool Statistics Table, Statistics Display (+3 more)

### Community 149 - "opencode.json"

Cohesion: 0.10
Nodes (19): agent, build, model, default_agent, mcp, playwright, command, enabled (+11 more)

### Community 150 - "1. Feature Expansion Axes"

Cohesion: 0.18
Nodes (10): 1. Feature Expansion Axes, 2. Evaluation Criteria for New Features, 3. Output Reporting Schema, A. Traffic Simulation Complexity & Environment Behavior, AI Product Architect Agent Instruction Profile, B. Agent Perception & Sophistication (Sensors & Braking), C. Scalability, Diagnostics, & Traffic Analytics, D. Game Modes & UX Controls (+2 more)

### Community 151 - "AGENTS.md — Self-Driving Car Simulator"

Cohesion: 0.20
Nodes (9): AGENTS.md — Self-Driving Car Simulator, Architecture rules, Build & dev, Entry points, Graphify, Key commands, Key gotchas, Persistence (+1 more)

### Community 153 - "Live Traffic Jam Simulator (`ts/simulator/traffic/trafficSimulator.ts`)"

Cohesion: 0.20
Nodes (10): Access, Architecture, Car picker (unified Car selector), Collision & ghosting, Differences from the training simulator, Interactions, Live Traffic Jam Simulator (`ts/simulator/traffic/trafficSimulator.ts`), Purpose (+2 more)

### Community 154 - "Sound System"

Cohesion: 0.20
Nodes (9): Architecture, Available Sound Functions, `beep(frequency, waveType?)`, Browser Compatibility, `explode()`, Sound System, `taDaa()`, Usage in Race Mode (+1 more)

### Community 157 - "Human Backpropagation Simulator (`ts/simulator/humanTraining/humanBackpropSimulator.ts`)"

Cohesion: 0.22
Nodes (9): Access, Architecture, Car lifecycle, Differences from the training simulator, Human Backpropagation Simulator (`ts/simulator/humanTraining/humanBackpropSimulator.ts`), Learning toggle (L key), Panel info, Persistence (+1 more)

### Community 158 - "Simulators & Training Environments"

Cohesion: 0.22
Nodes (9): Animation loop contract, Animation Loop Toolbar (`ts/simulator/panels/animationLoopToolbar.ts`), Car Renderer (`ts/simulator/training/rendering/carRenderer.ts`), `drawSimulatorCars(ctx, cars, bestPool, viewportTop, viewportBottom, drawMasks, poolColor, prevPoolCars, prevPoolColor, viewportLeft, viewportRight, keysShowSensor)`, Rendering performance: cached mask sprites, Responsibilities split, Simulator Shell (`ts/simulator/core/simulatorShell.ts`), Simulators & Training Environments (+1 more)

### Community 160 - "CorridorEditor"

Cohesion: 0.18
Nodes (3): ShortcutBinding, ShortcutDef, CorridorEditor

### Community 162 - "reviewer.md"

Cohesion: 0.25
Nodes (7): Input you receive, Output format, Phase: code, Phase: docs, Phase: full, Rules, Workflow

### Community 163 - "Docs Sync Workflow"

Cohesion: 0.25
Nodes (7): Docs Sync Workflow, Existing docs (as of this writing), Step 1 — Identify touched surfaces, Step 2 — Update each touched doc, Step 3 — Decide if a new doc is warranted, Step 4 — AGENTS.md conventions, Step 5 — Report

### Community 164 - "Integrate spatial grid into CarPhysics.assessDamage"

Cohesion: 0.25
Nodes (7): Files modified, Impact, Integrate spatial grid into CarPhysics.assessDamage(), Performance note, Problem, Resolution (Option 2 — adopted), What changed

### Community 165 - "Project Goal"

Cohesion: 0.29
Nodes (6): Fitness model, Non-goals, Project Goal, Scaling targets, Vision, What "production-ready" means here

### Community 166 - "Pool Manager (`ts/simulator/training/genetics/poolManager.ts`)"

Cohesion: 0.29
Nodes (7): `applyPoolToCars(cars, pool, mutationRate): void`, `brainsCompatible(a, b): boolean`, `createCarsForTraining(count, type, config, startInfo): Car[]`, `getSortedAICars(cars, evaluateFitness): Car[]`, `getTopAICars(cars, evaluateFitness, k): Car[]`, `getTopCarInfoPool(cars, evaluateFitness, poolSize): CarInfo[]`, Pool Manager (`ts/simulator/training/genetics/poolManager.ts`)

### Community 167 - "Task 01 — Fix Prettier quote-style drift"

Cohesion: 0.29
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 01 — Fix Prettier quote-style drift

### Community 168 - "Task 02 — Remove orphaned compiled JS"

Cohesion: 0.29
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 02 — Remove orphaned compiled JS

### Community 169 - "Task 03 — Clean stale ESLint allowlist"

Cohesion: 0.29
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 03 — Clean stale ESLint allowlist

### Community 170 - "Task 05 — Standardize error handling"

Cohesion: 0.29
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 05 — Standardize error handling

### Community 171 - "Task 06 — Migrate legacy save formats"

Cohesion: 0.29
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 06 — Migrate legacy save formats

### Community 172 - "Task 07 — Split god classes"

Cohesion: 0.29
Nodes (7): Acceptance criteria, Goal, Notes, Problem, Resolution, Suggested approach (incremental, one file at a time), Task 07 — Split god classes

### Community 173 - "AI Agent Refactor Plan"

Cohesion: 0.29
Nodes (6): AI Agent Refactor Plan, Definition of Done for Each Subtask, Global Guardrails, Purpose, Recommended Execution Order, Structural Reorganization Recommendations

### Community 178 - "Accuracy display"

Cohesion: 0.33
Nodes (6): Accuracy display, Balanced sampling under-scores straight frames, Decision-point bonus, Experience replay buffer, Per-output learning rates, Weight stability

### Community 179 - "Layout Management (`ts/simulator/rendering/layoutManager.ts`)"

Cohesion: 0.33
Nodes (6): Constants, Layout Management (`ts/simulator/rendering/layoutManager.ts`), Layout Modes, Mini-map Placement, Panel Visibility, Resize Logic

### Community 180 - "Storage Manager (`ts/simulator/training/genetics/storageManager.ts`)"

Cohesion: 0.33
Nodes (6): `discardStoredPool(): void`, `loadPoolFromStorage(fallbackConfig?): CarInfo[]`, `loadRaceCars(): CarInfo[]` / `saveRaceCars(pool: CarInfo[]): void`, `savePoolToStorage(pool: CarInfo[]): void`, Storage Manager (`ts/simulator/training/genetics/storageManager.ts`), Store seeding (multi-select)

### Community 181 - "planner.md"

Cohesion: 0.33
Nodes (5): Agents at your disposal, Always load these skills before acting, Decision rule for incoming requests, Repo facts (do not re-derive), Temperature

### Community 182 - "Task 04 — Extract shared JSON/legacy parser"

Cohesion: 0.33
Nodes (6): Acceptance criteria, Goal, Notes, Problem, Steps, Task 04 — Extract shared JSON/legacy parser

### Community 183 - "Subtask 1 — Harden Neural Network Serialization"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 1 — Harden Neural Network Serialization, What to Implement

### Community 184 - "Subtask 2 — Introduce a Car Factory/Deserializer"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 2 — Introduce a Car Factory/Deserializer, What to Implement

### Community 185 - "Subtask 3 — Extract Car Physics from the Main Car Class"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 3 — Extract Car Physics from the Main Car Class, What to Implement

### Community 186 - "Subtask 4 — Extract Car Rendering and Sprite Caching"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 4 — Extract Car Rendering and Sprite Caching, What to Implement

### Community 187 - "Subtask 5 — Extract Car Brain Adapter for Control Mapping"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 5 — Extract Car Brain Adapter for Control Mapping, What to Implement

### Community 188 - "Subtask 6 — Isolate Sensor Raycasting Logic"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 6 — Isolate Sensor Raycasting Logic, What to Implement

### Community 189 - "Subtask 7 — Decouple Simulator Shell from Page-Specific DOM Queries"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 7 — Decouple Simulator Shell from Page-Specific DOM Queries, What to Implement

### Community 190 - "Subtask 8 — Extract Race UI from Race Gameplay Logic"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 8 — Extract Race UI from Race Gameplay Logic, What to Implement

### Community 191 - "Subtask 9 — Split World Toolbar Responsibilities"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 9 — Split World Toolbar Responsibilities, What to Implement

### Community 192 - "Subtask 10 — Separate World Generation from World State"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 10 — Separate World Generation from World State, What to Implement

### Community 193 - "Subtask 11 — Review TypeScript Module Configuration"

Cohesion: 0.33
Nodes (6): Acceptance Criteria, Agent Prompt, Files, Goal, Subtask 11 — Review TypeScript Module Configuration, What to Implement

### Community 194 - "~~Remove unsafe NeuralNetwork.mutateFromPool()~~ **COMPLETED**"

Cohesion: 0.33
Nodes (5): Impact, Problem, Remediation, ~~Remove unsafe NeuralNetwork.mutateFromPool()~~ **COMPLETED**, Resolution

### Community 196 - "What `Sensor.update()` populates — per mode"

Cohesion: 0.40
Nodes (5): `basic`, `classified` — **after fix**, `classified` — **current (broken)**, `traffic`, What `Sensor.update()` populates — per mode

### Community 198 - "Extract draw methods from math primitives"

Cohesion: 0.40
Nodes (4): Extract draw methods from math primitives, Impact, Problem, Remediation

### Community 199 - "Move DEFAULT_CAR_CONFIG from ts/math/utils.ts to ts/car/config.ts"

Cohesion: 0.40
Nodes (4): Impact, Move DEFAULT_CAR_CONFIG from ts/math/utils.ts to ts/car/config.ts, Problem, Remediation

### Community 200 - "Refactor Race to extend SimulatorShell"

Cohesion: 0.40
Nodes (4): Changes, Impact (resolved), Problem (resolved), Refactor Race to extend SimulatorShell

### Community 201 - "Extract magic numbers to named constants"

Cohesion: 0.40
Nodes (4): Extract magic numbers to named constants, Impact, Problem, Remediation

### Community 202 - "Changes"

Cohesion: 0.40
Nodes (4): Changes, Files converted (19 files), Normalize private fields to ES2022 # syntax ✓, Preserved (cannot use `#`)

### Community 203 - "Fix script tag ordering in HTML files"

Cohesion: 0.40
Nodes (4): Fix script tag ordering in HTML files, Impact, Problem, Remediation

### Community 204 - "Split TrainingSimulator (714 lines)"

Cohesion: 0.40
Nodes (4): Impact, Problem, Remediation, Split TrainingSimulator (714 lines)

### Community 206 - "dependencies"

Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 208 - "Issue 1 — Classified ray doesn't draw second dot on border"

Cohesion: 0.67
Nodes (3): 1a. Store border hit alongside classified hit in the sensor (`sensor.ts`), 1b. Update `#drawClassified()` to draw continuation ray and wall dot (`sensor.ts:338-403`), Issue 1 — Classified ray doesn't draw second dot on border

### Community 209 - "Issue 2 — Sophistication select not syncing/disabling in training init modal"

Cohesion: 0.67
Nodes (3): 2a. Also disable the `<select>` when locked, 2b. Verify sync is working, Issue 2 — Sophistication select not syncing/disabling in training init modal

### Community 210 - "Issue 3 — Traffic simulator doesn't use right brain/size for classified cars"

Cohesion: 0.67
Nodes (3): 3a. Polygon not regenerated after dimension change, 3b. Brain deserialization can silently fail, Issue 3 — Traffic simulator doesn't use right brain/size for classified cars

## Knowledge Gaps

- **1202 isolated node(s):** `$schema`, `default_agent`, `.opencode/skills`, `model`, `type` (+1197 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Point` connect `Segment` to `entry.js`, `entry.ts`, `world.ts`, `raceSimulator.js`, `world.js`, `Point`, `point.js`, `GraphEditor`, `worldGenerator.ts`, `Light`, `carBrainAdapter.ts`, `CorridorEditor`, `TrainingSimulator`, `RaceSimulator`, `CarDrawData`, `utils.ts`, `CameraControls`, `osm.ts`, `carPhysics.ts`, `WorldGenerator`, `CameraControls`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `StoreManager` connect `StoreManager` to `entry.ts`, `world.ts`, `raceSimulator.js`, `utils.js`, `RaceSimulator`, `CarInfo`, `TrainingPanelElement`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `TrainingSimulator` connect `TrainingSimulator` to `entry.js`, `entry.ts`, `raceSimulator.js`, `SimulatorShell`, `TrainingInitModalElement`, `WorldTrainingStrategy`, `Segment`, `KeyboardManager`, `TrainingPanelElement`, `RaceSimulator`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `default_agent`, `.opencode/skills` to the rest of the system?**
  _1203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `entry.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07565392354124749 - nodes in this community are weakly interconnected._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09134906231094979 - nodes in this community are weakly interconnected._
- **Should `raceSimulator.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13825757575757575 - nodes in this community are weakly interconnected._
