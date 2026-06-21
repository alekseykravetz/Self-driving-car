# Project Goal

## Vision

The long-term goal of this project is to build a **large-scale urban traffic
simulator**: load a real city's road network (via OpenStreetMap import) and
populate it with a large number of AI-controlled cars in order to study and
surface **potential traffic problems** — congestion points, bottlenecks,
unsafe intersections, and emergent flow patterns.

The self-driving neural-network agents are the means, not the end. They give us
many independent, reactive drivers whose collective behavior approximates real
traffic, so we can experiment with road layouts and observe how the system
behaves at city scale.

## What "production-ready" means here

To support a real city map with many cars, the simulator must remain
**interactive (smooth animation)** as both the map size and the car population
grow. That imposes concrete engineering requirements:

- **Sub-linear spatial queries.** Per-car lookups (border/collision/sensing)
  must not scan the entire map. A spatial index (uniform hash grid) keeps each
  car's border lookup proportional to the segments near it, not the whole
  network. See `ts/math/spatialGrid.ts`.
- **Range-correct perception.** Sensing/collision range is derived from each
  car's actual sensor ray length, so cars with long rays never miss nearby
  borders regardless of any fixed proximity constant.
- **Bounded per-frame work.** Cars far from the area of interest are put
  **idle** (frozen) based on a configurable range, so off-screen population
  doesn't cost CPU every frame. Idle range is tunable from the training panel.
- **Cheap rendering at scale.** Car sprites are pre-composited once and cached
  by color/size, so drawing each car is a single `drawImage` even with
  thousands of cars on screen.

## Fitness model

"Best car" selection is purely fitness-driven and mode-aware:

- **Simple mode** — fitness is how far the car has progressed up the road
  (`startY - car.y`).
- **World / real-map mode** — fitness is the total distance the car has
  travelled (accumulated each frame).

Idle is measured as distance from the current best car, so the simulation keeps
the relevant cluster of cars active and freezes stragglers.

## Scaling targets

- Real OSM-imported city maps (thousands of road-border segments).
- Large car populations (target: thousands of concurrent AI cars).
- Stable frame rate while training and while simply observing traffic.

## Non-goals

- Photorealistic or physically exact vehicle dynamics.
- WebGL/GPU rendering or multi-threaded (web worker) simulation — kept out of
  scope unless a future bottleneck requires it.
- Changing the neural-network or world-generation algorithms; this effort is
  about scaling and performance, not the learning model itself.
