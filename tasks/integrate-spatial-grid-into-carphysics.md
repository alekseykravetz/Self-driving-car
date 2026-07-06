# Integrate spatial grid into CarPhysics.assessDamage()

**Severity:** High
**Source:** Architectural Violation #4
**File:** `ts/car/physics/carPhysics.ts:95-138`

## Problem

`assessDamage()` performed a brute-force O(n) scan of all polygons for collision detection, computing bounding boxes and `polysIntersect` for every polygon in the scene. The `SpatialHashGrid` exists at `ts/math/spatialGrid.ts` with an efficient `query()` method, but it was only used in `TrainingSimulator` and `TrafficSimulator` for border filtering, not exposed to `CarPhysics`.

## Impact

With large city-scale maps (thousands of road border segments) and large car populations, every car scans every border segment every frame instead of querying the spatial index.

## Resolution (Option 2 — adopted)

The caller (`worldModeBehavior`, `trafficSimulator`, `Race`) queries the grid and passes **only nearby borders** to `car.update()` as the `polygons` array. This means:

- **CarPhysics no longer needs a grid reference** — `assessDamage()` just iterates the already-filtered `polygons` array it receives.
- **No redundant double-query** — the grid is queried once by the caller for sensor-range obstacle gathering, and the same `polygons` are used for both sensor raycasting and collision detection.
- **Simple mode has no grid overhead** — only 2 road borders exist, so they're passed directly.

### What changed

| Before                                                                                        | After                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `Car.update(polygons, grid?)` passed optional grid to physics                                 | `Car.update(polygons)` — no grid parameter              |
| `CarPhysics.assessDamage()` had a separate grid-query branch                                  | Removed entirely — works solely with `polygons` array   |
| Each simulator had duplicate broad+narrow phase border query logic                            | Shared `queryBordersNearCar()` in `spatialGridUtils.ts` |
| `pointToSegmentDistanceSq` duplicated in 4 files                                              | Single copy in `spatialGridUtils.ts`                    |
| Simple mode built a grid for its 2 full-length borders → rasterization into millions of cells | Simple mode passes `roadBorders` directly, no grid      |

### Files modified

- `ts/simulator/spatialGridUtils.ts` — NEW: shared `buildRoadBorders()`, `queryBordersNearCar()`, `pointToSegmentDistanceSq()`
- `ts/car/physics/carPhysics.ts` — removed `grid?` param from `update()` and `assessDamage()`
- `ts/car/car.ts` — removed `grid?` param from `update()`
- `ts/simulator/training/modes/simpleModeBehavior.ts` — removed `borderGrid?` param
- `ts/simulator/training/modes/worldModeBehavior.ts` — uses `queryBordersNearCar()`, deleted duplicate `pointToSegmentDistanceSq`
- `ts/simulator/training/trainingSimulator.ts` — uses `buildRoadBorders()`, no grid in simple mode
- `ts/simulator/traffic/trafficSimulator.ts` — uses shared utils, deleted `pointSegDistSq`
- `ts/simulator/racing/raceSimulator.ts` — uses shared utils, no grid pass-through to `car.update()`
- `html/simulator.html`, `html/traffic.html`, `html/race.html` — added `spatialGridUtils.js`

### Performance note

The grid query radius (`reach + bodyMargin + cellSize`) is derived from the car's own sensor ray length, so it scales automatically. Cars with long sensors still see every relevant border; the narrow-phase squared-distance filter ensures no false positives.
