# Integrate spatial grid into CarPhysics.assessDamage()

**Severity:** High
**Source:** Architectural Violation #4
**File:** `ts/car/physics/carPhysics.ts:95-138`

## Problem

`assessDamage()` performs a brute-force O(n) scan of all polygons for collision detection, computing bounding boxes and `polysIntersect` for every polygon in the scene. The `SpatialHashGrid` exists at `ts/math/spatialGrid.ts` with an efficient `query()` method, but it's only used in `TrainingSimulator` and `TrafficSimulator` for border filtering, not exposed to `CarPhysics`.

## Impact

With large city-scale maps (thousands of road border segments) and large car populations, every car scans every border segment every frame instead of querying the spatial index.

## Remediation

Either:

- Expose grid to `Car.update(polygons, grid?)` and pre-filter via spatial query
- Or: have the caller (`worldModeBehavior`, `trafficSimulator`, `Race`) query the grid and pass only nearby borders to `car.update()`

Match the pattern already used in `worldModeBehavior.ts:62-85` and `trafficSimulator.ts:290-301`.
