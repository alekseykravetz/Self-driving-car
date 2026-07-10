# Graph Report - /Users/alex/Code/Self-driving-car  (2026-07-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2048 nodes · 5940 edges · 104 communities (50 shown, 54 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9571a454`
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
- ToolbarAssetSelectors
- camera.ts
- NetworkVisualizer
- assetSelectors.ts
- types.ts
- worldEditor.js
- raceSimulator.ts
- trainingPanel.js
- WorldEditor
- Light
- Light
- RaceSimulator
- carBrainAdapter.ts
- CarInfo
- drawSegment
- cars
- WorldToolbarElement
- TrainingSimulator
- GraphEditor
- WorldEditor
- compilerOptions
- trafficSimulator.ts
- WorldLayersToolbarElement
- TrainingInitModalElement
- WorldLayersToolbarElement
- TrafficSimulator
- TrainingInitModalElement
- TrainingSimulator
- TrafficSimulator
- Viewport
- LayoutToolbarElement
- LayoutToolbarElement
- AnimationLoopToolbarElement
- utils.ts
- HeatmapGrid
- AnimationLoopToolbarElement
- ToolbarModeControls
- TrafficPanelElement
- CorridorEditor
- ToolbarAssetSelectors
- ToolbarModeControls
- car.js
- ShortcutsToolbarElement
- SimulatorShell
- CameraControls
- osm.ts
- layoutManager.ts
- Car
- RacePanel
- MarkingEditor
- migrate-worlds.mjs
- SimulatorShell
- WorldTrainingStrategy
- CarLoader
- HeatmapGrid
- Sensor
- WorldGenerator
- carPhysics.ts
- simulatorShell.ts
- WorldGenerator
- SpatialHashGrid
- TrafficControlGrid
- NeuralNetwork
- LightEditor
- TrafficManager
- SpatialHashGrid
- TrafficControlGrid
- CameraControls
- SimpleWorld
- CarBrainAdapter
- HeatmapRenderer
- MarkerDetector
- CarPhysics
- CarRenderer
- WorldLoader
- controls.ts
- SensorRaycaster
- Level
- Level
- formatKmhFromPxPerFrame
- graphify.js
- publish-site.sh

## God Nodes (most connected - your core abstractions)
1. `Point` - 159 edges
2. `Car` - 68 edges
3. `Segment` - 68 edges
4. `Viewport` - 58 edges
5. `World` - 56 edges
6. `StoreManager` - 48 edges
7. `Graph` - 44 edges
8. `StoreManager` - 43 edges
9. `CarInfo` - 43 edges
10. `TrainingPanelElement` - 40 edges

## Surprising Connections (you probably didn't know these)
- `TrafficControlHit` --references--> `Point`  [EXTRACTED]
  ts/math/trafficControlGrid.ts → ts/math/primitives/point.ts
- `loadSimLayerVisibility()` --calls--> `safeJsonParse()`  [EXTRACTED]
  ts/simulator/core/simulatorShell.ts → ts/store/serialization.ts
- `movePointsInward()` --calls--> `lerp2D()`  [EXTRACTED]
  js/camera/extrusion.js → js/math/utils.js
- `extrudeTreeShapes()` --calls--> `lerp()`  [EXTRACTED]
  js/camera/extrusion.js → js/math/utils.js
- `wgGenerateTrees()` --calls--> `distance()`  [EXTRACTED]
  js/world/generation/worldGenerator.js → js/math/utils.js

## Import Cycles
- None detected.

## Communities (104 total, 54 thin omitted)

### Community 0 - "entry.js"
Cohesion: 0.09
Nodes (14): angle(), WORLD_LAYER_BUTTONS, SimulatorPageHost, SM_ARRAY_LS_KEYS, SM_TRACKED_LS_KEYS, CYCLE_ORDER, parseWorldFileContent(), Crossing (+6 more)

### Community 1 - "entry.ts"
Cohesion: 0.13
Nodes (20): Marker, ShortestPathPoint, PolygonBounds, formatDegrees(), formatElapsedTime(), framesToSeconds(), getNearestPoint(), perpendicular() (+12 more)

### Community 2 - "world.ts"
Cohesion: 0.09
Nodes (18): ScaleIndicator, Viewport, ViewportMode, CrossingEditor, CYCLE_ORDER, MarkingEditor, ParkingEditor, StartEditor (+10 more)

### Community 3 - "raceSimulator.js"
Cohesion: 0.06
Nodes (25): beep(), explode(), SoundEngine, taDaa(), getRandomColor(), getRGBA(), MiniMap, RaceSimulator (+17 more)

### Community 4 - "utils.js"
Cohesion: 0.13
Nodes (23): add(), distance(), dot(), formatDegrees(), formatElapsedTime(), formatMetersFromWorldPixels(), framesToSeconds(), getFake3dPoint() (+15 more)

### Community 5 - "Car"
Cohesion: 0.06
Nodes (15): Brain, Car, CarCallbacks, CarOptions, PhoneControls, CarDrawOptions, CarRenderer, HeatmapCell (+7 more)

### Community 6 - "world.js"
Cohesion: 0.08
Nodes (17): Envelope, lerp(), mulberry32(), translate(), drawEnvelope(), drawPolygon(), Corridor, wgGenerateTrees() (+9 more)

### Community 7 - "Point"
Cohesion: 0.07
Nodes (14): PointWithBlueness, Point, angle(), MiniMapDrawOptions, DragState, Crossing, findAnchorSegment(), Marking (+6 more)

### Community 8 - "StoreManager"
Cohesion: 0.08
Nodes (17): SM_ARRAY_LS_KEYS, SM_TRACKED_LS_KEYS, smCountItems(), smGenId(), smNormalizeWorldId(), smPersist(), smReadActiveCarIds(), smWorldMarkers() (+9 more)

### Community 9 - "point.js"
Cohesion: 0.08
Nodes (15): Camera, extrudeCarShape(), extrudePolygons(), extrudeTreeShapes(), getCentroid(), movePointsInward(), Point, boundsOverlap() (+7 more)

### Community 10 - "devDependencies"
Cohesion: 0.04
Nodes (44): concurrently, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, globals, onchange, author (+36 more)

### Community 11 - "NetworkVisualizer"
Cohesion: 0.07
Nodes (7): NeuralNetwork, ArrowDir, ConnectionEdge, Hover, NetworkLayout, NetworkVisualizer, NeuronNode

### Community 12 - "Segment"
Cohesion: 0.08
Nodes (7): Graph, Segment, distance(), MiniMap, Corridor, removeCorridorCap(), SimpleWorld

### Community 13 - "GraphEditor"
Cohesion: 0.08
Nodes (3): ShortcutsToolbarElement, CorridorEditor, GraphEditor

### Community 14 - "TrainingPanelElement"
Cohesion: 0.12
Nodes (3): createCarsForTraining(), getTopAICars(), TrainingPanelElement

### Community 15 - "StoreManager"
Cohesion: 0.08
Nodes (7): smCountItems(), smGenId(), smNormalizeWorldId(), smPersist(), smReadActiveCarIds(), smWorldMarkers(), StoreManager

### Community 16 - "WorldToolbarElement"
Cohesion: 0.08
Nodes (6): BorderMode, ToolbarViewportMode, TrackingMode, WorldToolbarElement, RacePanel, UnifiedWorldEntry

### Community 17 - "TrainingPanelElement"
Cohesion: 0.11
Nodes (4): discardStoredPool(), downloadCarFiles(), loadPoolFromStorage(), TrainingPanelElement

### Community 18 - "worldGenerator.ts"
Cohesion: 0.10
Nodes (13): Envelope, boundsOverlap(), computePolygonBounds(), Polygon, average(), getIntersection(), mulberry32(), wgGenerateTrees() (+5 more)

### Community 19 - "ToolbarAssetSelectors"
Cohesion: 0.15
Nodes (5): ToolbarAssetSelectors, stripFileExtension(), spFormatHiddenLayers(), spFormatSize(), StorePanelElement

### Community 20 - "camera.ts"
Cohesion: 0.14
Nodes (14): Camera, extrudeCarShape(), extrudePolygons(), extrudeTreeShapes(), getCentroid(), movePointsInward(), ICameraPoint, ICameraRenderOptions (+6 more)

### Community 22 - "assetSelectors.ts"
Cohesion: 0.16
Nodes (6): stripFileExtension(), spFormatHiddenLayers(), spFormatSize(), StorePanelElement, parseWorldFileContent(), WorldLoader

### Community 23 - "types.ts"
Cohesion: 0.15
Nodes (14): getFake3dPoint(), translate(), IMiniMapCar, drawEnvelope(), drawPolygon(), Tree, TreeInstance, treeLevelPolygon() (+6 more)

### Community 24 - "worldEditor.js"
Cohesion: 0.09
Nodes (9): Osm, degToRad(), invLerp(), CrossingEditor, ParkingEditor, StartEditor, StopEditor, TargetEditor (+1 more)

### Community 25 - "raceSimulator.ts"
Cohesion: 0.17
Nodes (10): add(), dot(), getNearestSegment(), magnitude(), normalize(), rotate(), scale(), subtract() (+2 more)

### Community 26 - "trainingPanel.js"
Cohesion: 0.17
Nodes (14): DEFAULT_CAR_CONFIG, loadSimLayerVisibility(), applyPoolToCars(), brainsCompatible(), getSortedAICars(), getTopCarInfoPool(), inferHiddenLayers(), discardStoredPool() (+6 more)

### Community 27 - "WorldEditor"
Cohesion: 0.15
Nodes (3): Editor, saveLayerVisibility(), WorldEditor

### Community 29 - "Light"
Cohesion: 0.13
Nodes (4): LightEditor, Light, LightState, TrafficManager

### Community 30 - "RaceSimulator"
Cohesion: 0.15
Nodes (7): beep(), explode(), SoundEngine, taDaa(), CarControls, RaceSimulator, buildRoadBorders()

### Community 31 - "carBrainAdapter.ts"
Cohesion: 0.14
Nodes (7): BrainControlOutput, CarBrainAdapter, IntersectionPoint, encodeTrafficState(), Sensor, ObstacleType, SensorReading

### Community 32 - "CarInfo"
Cohesion: 0.12
Nodes (19): CarInfo, DEFAULT_CAR_CONFIG, CarLoader, compareCarInfoParams(), normalizeStateAware(), parseCarFileContent(), applyPoolToCars(), brainsCompatible() (+11 more)

### Community 33 - "drawSegment"
Cohesion: 0.11
Nodes (4): Graph, drawPoint(), drawSegment(), Start

### Community 34 - "cars"
Cohesion: 0.10
Nodes (19): ashkelon-kohav-hazafon.world, barnea.world, best-1_b6_s3.5_rc5_rl150.car, best-2_b16_s5_rc11_rl150.car.car, best-2_b6_s3.5_rc5_rl150.car, best_b16_s5_rc11_rl150.car, best_b16x16_s8_rc15_rl200.car, best_b6_s3_rc5_rl150.car (+11 more)

### Community 39 - "compilerOptions"
Cohesion: 0.11
Nodes (17): eslint.config.mjs, compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, importHelpers, module, moduleResolution (+9 more)

### Community 40 - "trafficSimulator.ts"
Cohesion: 0.26
Nodes (11): TaggedHit, SensorTrafficControl, GridSegment, TrafficControlEntry, TrafficControlHit, TrafficControlState, pointToSegmentDistanceSq(), queryBordersNearCar() (+3 more)

### Community 53 - "utils.ts"
Cohesion: 0.23
Nodes (9): polysIntersect(), getRandomColor(), getRGBA(), getIntersectionOffset(), updateSimpleCars(), updateSimpleTraffic(), generateInitialTraffic(), generateTrafficRow() (+1 more)

### Community 54 - "HeatmapGrid"
Cohesion: 0.19
Nodes (4): HeatmapGrid, HeatmapRenderer, occupancyColor(), VisibleWorldRect

### Community 61 - "car.js"
Cohesion: 0.16
Nodes (5): Controls, PhoneControls, SensorRaycaster, polysIntersect(), getIntersectionOffset()

### Community 65 - "osm.ts"
Cohesion: 0.20
Nodes (10): Osm, OsmData, OsmElement, OsmNodeElement, OsmPoint, OsmWayElement, OsmWayTags, ParsedRoads (+2 more)

### Community 66 - "layoutManager.ts"
Cohesion: 0.24
Nodes (7): LayoutMode, CachedLayout, LayoutCanvases, LayoutPanelState, resizeSimulatorLayout(), LayoutCanvases, LayoutPanelState

### Community 70 - "migrate-worlds.mjs"
Cohesion: 0.31
Nodes (10): __dirname, isV2(), lerp(), main(), migrate(), mulberry32(), r1(), r2() (+2 more)

### Community 72 - "WorldTrainingStrategy"
Cohesion: 0.24
Nodes (3): SimpleSimState, WorldTrainingStrategy, drawSimulatorCars()

### Community 73 - "CarLoader"
Cohesion: 0.27
Nodes (4): CarLoader, compareCarInfoParams(), normalizeStateAware(), parseCarFileContent()

### Community 76 - "WorldGenerator"
Cohesion: 0.33
Nodes (3): wgGenerateLaneGuides(), wgGenerateSeparatorBorders(), WorldGenerator

### Community 77 - "carPhysics.ts"
Cohesion: 0.50
Nodes (3): CarState, ControlsState, CarPhysics

### Community 78 - "simulatorShell.ts"
Cohesion: 0.31
Nodes (5): WORLD_LAYER_BUTTONS, loadSimLayerVisibility(), SimulatorPageHost, DEFAULT_LAYER_VISIBILITY, WorldLayerId

### Community 79 - "WorldGenerator"
Cohesion: 0.33
Nodes (3): wgGenerateLaneGuides(), wgGenerateSeparatorBorders(), WorldGenerator

## Knowledge Gaps
- **108 isolated node(s):** `WORLD_LAYER_BUTTONS`, `SIMPLE_MODE_CONFIG`, `SM_TRACKED_LS_KEYS`, `SM_ARRAY_LS_KEYS`, `CYCLE_ORDER` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Point` connect `Point` to `entry.ts`, `world.ts`, `Car`, `Segment`, `GraphEditor`, `worldGenerator.ts`, `camera.ts`, `types.ts`, `raceSimulator.ts`, `Light`, `RaceSimulator`, `carBrainAdapter.ts`, `TrainingSimulator`, `trafficSimulator.ts`, `TrafficSimulator`, `utils.ts`, `CameraControls`, `osm.ts`, `layoutManager.ts`, `carPhysics.ts`, `WorldGenerator`, `SensorRaycaster`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `StoreManager` connect `StoreManager` to `CarInfo`, `entry.ts`, `world.ts`, `trafficSimulator.ts`, `assetSelectors.ts`, `raceSimulator.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `StoreManager` connect `StoreManager` to `entry.js`, `raceSimulator.js`, `ToolbarAssetSelectors`, `worldEditor.js`, `trainingPanel.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `IMPORTANT: keep the reminder string free of backticks and $(...) constructs.`, `WORLD_LAYER_BUTTONS`, `SIMPLE_MODE_CONFIG` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `entry.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08903908316191596 - nodes in this community are weakly interconnected._
- **Should `entry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12830349531116794 - nodes in this community are weakly interconnected._
- **Should `world.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08766803039158387 - nodes in this community are weakly interconnected._