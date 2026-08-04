# Marking Direction — One Canonical Convention

**Date:** 2026-08-04
**Slug:** marking-direction-canonical
**Elicited from:** "Our markings (hand-placed and OSM-imported) keep facing the
wrong direction. The rule is simple but we can't get it right — we flip 180°
several times until it looks OK, and it still breaks on different road types.
Even a `start` marking that _looks_ correct spawns the car in the wrong
direction. Stop fixing it patch-by-patch and redesign it so direction facing is
correct forever."

## Core Intent

Replace the app's **inverted, compensated** direction convention with **one
canonical rule** applied everywhere:

> **A marking's `directionVector` is the real direction of travel / facing** —
> the way a car drives along that lane, the way the driver reads the painted
> text, and the way a `start` car spawns and moves.

No module may add or subtract 180° to "make it look right". Every conversion
from a direction vector to (a) a car heading and (b) a canvas draw rotation goes
through **one shared helper**, so the convention lives in exactly one place.

## Root Cause (why it keeps breaking)

There is not one bug — there is one bad convention that forces compensating
flips in every consumer:

1. **The heading formula inverts.** Every spawn site uses
   `θ = -angle(dv) + π/2`. Given the car physics forward vector
   `(-sin θ, -cos θ)` (`ts/car/physics/carPhysics.ts` L51–52), this makes the
   car face **`-dv`** (opposite the marking's `directionVector`). So `dv` has
   never meant "the way the car goes" — it means "the way the car goes,
   backwards", and everything downstream flips to undo it.

2. **Lane guides are built backwards on purpose.**
   `laneGuidesForSegment` (`ts/world/generation/worldGenerator.ts` L103–131)
   makes one-way lanes point `p2→p1` (against traffic) so the inverting formula
   flips them forward. Compensation #1.

3. **Two different bases for "direction".** Manual markings
   (`ts/world/editors/markingEditor.ts` L102) take `dv = segment.directionVector()`
   (raw `p1→p2`). Start/Stop/Yield editors snap to **lane guides** (the backward
   ones). The same field means different things depending on how it was placed.

4. **`anchor.flipped` is silently dropped on load.**
   `loadMarking` (`ts/world/markings/markingLoader.ts` L49–57) restores
   `p1/p2/offset/lateral` but **not** `flipped`. So after save/load,
   `Marking.reanchor` (`ts/world/markings/marking.ts` L131–150) resets every
   marking's direction to the raw segment `p1→p2` and re-derives it against the
   nearest **road segment** — not the **lane guide** a `start` was authored on.
   This is the "start looks good but spawns wrong after the sim runs / after
   reload" bug.

5. **OSM stacks negations to reconcile with all of the above.**
   `osm.ts` `approachFacingDir` returns "toward oncoming traffic", then the
   caller **negates** it (L534–538) to match the lane-guide convention; then
   `osmDirectionalMarkings.ts` negates again for facing. This is the "flip 180°
   several times until it looks good" loop.

## The Redesign (mechanically small, conceptually complete)

The entire fix reduces to: **flip the single `π/2` sign that encodes
"backwards", centralize it, point lane guides along travel, and delete the OSM
negations** — plus fix `flipped` persistence.

### One shared helper (new `ts/math/direction.ts`, pure math)

```ts
/** Car heading (0 = up, per carPhysics) so the car FACES ALONG `dir`. */
export function carAngleFromDirection(dir: Point): number {
  return -angle(dir) - Math.PI / 2; // was -angle(dir) + π/2  (faced -dir)
}

/** Canvas rotation so an up-facing sprite/text FACES ALONG `dir`. */
export function drawRotationFromDirection(dir: Point): number {
  return angle(dir) + Math.PI / 2; // was angle(dir) - π/2      (faced -dir)
}
```

Verification (y-down world, forward `= (-sin θ, -cos θ)`):
`θ = -angle(dir) - π/2 ⟹ forward = dir` (car faces **along** dir). The draw
rotation is the negative of the heading (`draw = -θ`), matching the existing
sprite/text pipeline — so the live `Car` sprite renderer is **not** touched.

### Lane guides point ALONG travel

`laneGuidesForSegment` returns guides whose `directionVector()` is the lane's
**actual** travel direction (negate today's output):

- **One-way:** all lanes `p1→p2` (with the flow).
- **Two-way:** the lane on the driver's right of centre travels one way, the
  other the opposite — preserve today's physical per-lane assignment, just
  stored as the true travel direction.

### Editors are uniform

All marking editors (including the generic `MarkingEditor`) snap
`directionVector` to the **lane guide** the marking sits on, so hand-placed
markings and OSM markings share one base. `dv` = the lane's travel direction.

### OSM emits the real travel direction

`osm.ts` and `osmDirectionalMarkings.ts` emit `directionVector` =
the approaching driver's travel direction (into the junction). **All negations
removed.** Marking `draw()` uses `drawRotationFromDirection`, so the text reads
for that driver automatically.

### `flipped` fixed

`loadMarking` persists `anchor.flipped`. `reanchor` keeps using it. With the
canonical convention, `flipped` means exactly "faces opposite to the anchored
segment `p1→p2`" and round-trips correctly.

## Scope

### Entry Points Affected

- All five pages render `World` markings and spawn cars from `start`:
  `html/world.html`, `html/simulator.html`, `html/traffic.html`,
  `html/race.html`, `html/human-training.html`.

### Layers Affected

- `ts/math/` — **new** `direction.ts` (shared helper).
- `ts/world/generation/worldGenerator.ts` — `laneGuidesForSegment` points along
  travel.
- `ts/world/markings/` — `start.ts`, `stop.ts`, `yield.ts` draw via the helper;
  `markingLoader.ts` persists `flipped`.
- `ts/world/editors/markingEditor.ts` — snap direction to lane guide (uniform).
- `ts/math/osm-importer/osm.ts` + `ts/world/osmDirectionalMarkings.ts` — remove
  the compensating negations; emit true travel direction.
- `ts/simulator/**` — every spawn site
  (`trainingSimulator.ts`, `humanBackpropSimulator.ts`, `raceSimulator.ts`,
  `trafficSimulator.ts` `#headingAt`/`#getStartInfo`) uses
  `carAngleFromDirection`.
- `ts/world/simple/simpleWorld.ts` — hard-coded start direction updated for the
  canonical rule.
- `ts/world/world.ts` — bump save `version` 2 → 3; **runtime migration** of
  older markings on load.
- `scripts/` — **new** one-time migration script for `saves/` and `store/world`
  on disk (chosen option).
- `tests/unit/**` + `tests/visual/baselines/**` — updated expectations and
  regenerated baselines.
- `docs/` — `Physics.md` / `WorldEditor.md` / `AGENTS.md` bullets updated to the
  canonical rule.

### Change Type

**Both.** Behavioral: markings/cars now face the true travel direction on every
road type (1–8 lanes, one-way and two-way), and `start` spawns match what is
drawn. Visual: some markings/glyphs render rotated 180° from before (now
correct), so visual baselines change.

### Backward Compatibility

- **Preserved via migration, not by keeping the bug.** Saved worlds store `dv`
  in the OLD (inverted) convention. Two migrations cover all sources:
  1. **Runtime** (`World.load`): when `info.version` is not current, negate each
     marking `directionVector` and recompute `anchor.flipped` before
     reanchoring. Covers `localStorage` (`editorWorld`, `loadedWorlds`) and any
     old file a user loads.
  2. **Offline script:** rewrite committed `saves/*.world` and `store/world/*.world`
     in place (with backups), bumping them to `version: 3`.
- Trained brains (`bestPool`, `raceCars`, `humanTrainedCar`) are **unaffected** —
  only spawn heading changes, not network I/O.

## Acceptance Criteria

1. A hand-placed `start` on any road type both **draws** and **spawns** a car
   facing the lane's travel direction — before and after save/reload, and after
   editing the underlying graph.
2. OSM-imported `stop`/`yield` text reads for the approaching driver, and
   `light` heads face oncoming traffic, on one-way and multi-lane (1–8) roads —
   with **zero** `±π` flips in `osm.ts` / `osmDirectionalMarkings.ts`.
3. Cars in the traffic simulator spawn facing along the road (flow direction on
   one-way roads) with no special-case `+π`.
4. There is exactly **one** definition each of `carAngleFromDirection` and
   `drawRotationFromDirection`; no `-angle(dv)` or `angle(dv) ± π/2` literals
   remain in markings, editors, simulators, or OSM code.
5. Existing `saves/` and `store/world` worlds load and render correctly (markings
   face the right way) after the offline migration; old `localStorage` worlds are
   migrated at load time.
6. `npm test` passes; visual baselines regenerated and reviewed.

## Out of Scope

- `Controls` keyboard car (WASD) — unrelated to marking direction.
- Any change to the neural network, sensors, or car physics math.
- Lane-count / road-width behavior (already correct).

## Open Item

- **Sample OSM world for end-to-end verification:** use
  `saves/ashkelon-barnea-osm-data.json` (user-provided; contains traffic-signal
  junctions and parking-tagged ways — exercises both special cases below).
  Fallbacks: `saves/ashkelon-osm-data.json`, `saves/kohav-hazafon-osm-data.json`.

## Special cases explicitly covered

- **Traffic-light placement is preserved, only its stored facing is
  canonicalized.** `placeApproachMarking` keeps its approach-arm resolution and
  the upstream slide to the stop line; it now stores `directionVector` = travel
  direction (into the junction) instead of the upstream vector. `Light.draw` is
  a symmetric perpendicular bar, so the head looks the same — the fix is
  convention consistency plus keeping the special placement intact.
- **Parking (left/right lane) is out of scope and untouched.** Parking is
  segment metadata (`parkingLeft` / `parkingRight`), not a marking, and its side
  is derived from the raw `Segment.directionVector()` + `perpendicular`, which
  this migration does not change. The offline/runtime migrations never read or
  write parking metadata.
