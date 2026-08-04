# Marking Direction — Canonical Convention Migration

**Date:** 2026-08-04
**Slug:** marking-direction-canonical
**Requirements:** `requirements/marking-direction-canonical.md`
**Entry points affected:** All five pages draw `World` markings and spawn cars
from `start` (`world.html`, `simulator.html`, `traffic.html`, `race.html`,
`human-training.html`).
**Save-file impact:** Save `version` bumps 2 → 3. Marking `directionVector` is
re-interpreted (canonical = travel direction). Old worlds are migrated both at
runtime (`World.load`) and offline (`scripts/`). Backups written by the script.
**Backward compat:** Preserved via migration (see Steps 6–7). Brains untouched.

> **This is a large, fully-working app. Do the steps in order. After EACH step,
> run `npm run test:fast` (or the named test) before moving on. Do NOT
> regenerate visual baselines until Step 9, after manual verification.**

---

## The one rule (read first)

`Marking.directionVector` = **the real direction of travel/facing**: the way a
car drives along that lane, the way the driver reads the painted text, the way a
`start` car spawns and moves. Lane guides point ALONG travel. OSM emits the true
travel direction. No module adds/subtracts 180° to "make it look right."

Math (y-down world; car physics forward `= (-sin θ, -cos θ)`,
`carPhysics.ts` L51–52):

- **Car heading so it faces along `dir`:** `θ = -angle(dir) - π/2`
  (was `-angle(dir) + π/2`, which faced `-dir`).
- **Canvas rotation so an up-facing sprite/text faces along `dir`:**
  `φ = angle(dir) + π/2` (was `angle(dir) - π/2`). Note `φ = -θ` — the existing
  sprite/text pipeline relationship is preserved, so the live `Car` sprite
  renderer is NOT touched.

---

## Step 1 — Shared helper (new `ts/math/direction.ts`)

Create a pure module (no DOM/canvas):

```ts
import { Point } from './primitives/point.js';
import { angle } from './utils.js';

/** Car heading (0 = up, per carPhysics) so the car FACES ALONG `dir`. */
export function carAngleFromDirection(dir: Point): number {
  return -angle(dir) - Math.PI / 2;
}

/** Canvas rotation so an up-facing sprite/text FACES ALONG `dir`. */
export function drawRotationFromDirection(dir: Point): number {
  return angle(dir) + Math.PI / 2;
}
```

**Test:** new `tests/unit/math/direction.test.ts`:

- `carAngleFromDirection((0,-1))` → `0` (up).
- A car spawned at `carAngleFromDirection(dir)` has forward `≈ dir` for several
  `dir` (assert `(-sin θ, -cos θ)` equals normalized `dir` within 1e-9).
- `drawRotationFromDirection(dir) === -carAngleFromDirection(dir)`.

## Step 2 — Lane guides point along travel

`ts/world/generation/worldGenerator.ts` `laneGuidesForSegment` (L103–131):
negate today's guide orientation so `directionVector()` is the lane's true
travel direction.

- **One-way:** all lanes `new Segment(p1, p2)` (was `p2, p1`).
- **Two-way:** even `k` → `new Segment(p2, p1)`; odd `k` → `new Segment(p1, p2)`
  (swap of today). Preserves which physical direction each lane travels; only
  the stored orientation flips.

Update the doc comment above the function to state the canonical rule (cars face
ALONG the guide's `directionVector()`).

**Test:** update `tests/unit/world/generation/worldGenerator.test.ts` lane-guide
direction assertions to the new orientation. Add an assertion that a car spawned
via `carAngleFromDirection(guide.directionVector())` moves from `p1` toward `p2`
on a one-way lane.

## Step 3 — Marking draws via the helper

Replace `ctx.rotate(angle(this.directionVector) - Math.PI / 2)` with
`ctx.rotate(drawRotationFromDirection(this.directionVector))` in:

- `ts/world/markings/start.ts` (L46)
- `ts/world/markings/stop.ts` (L31)
- `ts/world/markings/yield.ts` (L30)

Import from `../../math/direction.js`; drop the now-unused `angle` import if it
becomes unused. `crossing`, `target`, `parking`, `light` draws are symmetric or
non-directional — leave them.

## Step 4 — Uniform editor base (snap to lane guide)

`ts/world/editors/markingEditor.ts` `#handleMouseMove` (L88–108): the generic
`MarkingEditor` currently uses `segment.directionVector()` from
`world.graph.segments`. Make the base target/snap to `world.laneGuides` (like
`StartEditor`/`StopEditor`/`YieldEditor` already do) so ALL markings inherit the
lane's travel direction. Confirm the subclasses that pass `world.laneGuides`
still behave (they should be unchanged). Marking preview `directionVector` =
`laneGuide.directionVector()`.

> If any editor legitimately needs the raw segment (e.g. `LightEditor` places on
> the road, not a lane), keep its target but ensure the emitted `dv` is the
> travel direction. Verify each editor's `targetSegments` in
> `ts/world/editors/*Editor.ts` before changing the base.

## Step 5 — Spawn sites use `carAngleFromDirection`

Replace every `-angle(direction) + Math.PI / 2` (and the traffic variant) with
`carAngleFromDirection(direction)`:

- `ts/simulator/training/trainingSimulator.ts` L192
- `ts/simulator/humanTraining/humanBackpropSimulator.ts` L313
- `ts/simulator/racing/raceSimulator.ts` L94
- `ts/simulator/traffic/trafficSimulator.ts` L542 (`#getStartInfo`) and L285
  (`#headingAt`). For `#headingAt`, the base heading becomes
  `carAngleFromDirection(segment.directionVector())`; the one-way `+π` special
  case (L293) is **removed** — with lane guides / segment direction now meaning
  true travel, one-way cars already face flow. Re-verify with a one-way segment
  that the spawned car drives `p1→p2`.
- `ts/world/simple/simpleWorld.ts` L76: update the hard-coded start
  `directionVector` so the simple-world car still faces up. Face-up means
  `dir = (0,-1)` under the canonical rule (was `(0,1)`); update the value and the
  comment.

**Test:** update simulator heading unit tests
(`tests/unit/simulator/**` referencing the old formula) to the helper.

## Step 6 — OSM emits true travel direction (delete negations)

- `ts/math/osm-importer/osm.ts`:
  - Stop/give-way seed (L530–538): stop negating `approachFacingDir(entry)`.
    Emit `directionVector = approachFacingDir(entry)` **already pointing along
    travel into the junction** — audit `approachFacingDir` (L666+) and make it
    RETURN the travel direction directly (rename/clarify its doc; it currently
    returns "toward oncoming traffic"). The net effect: the emitted seed `dv`
    equals the approaching driver's travel direction.
  - `placeApproachMarking` (L583+) for lights — **SPECIAL PLACEMENT, preserve
    it.** Keep the approach-arm resolution (directedApproach → cluster radial →
    `throughAxis`) and the UPSTREAM slide
    `placed = center + bestUnit * min(width, span*0.5)` UNCHANGED: `bestUnit`
    points from the node toward the approach neighbour = upstream = toward
    oncoming traffic, and that stop-line geometry is correct. Only the STORED
    facing changes — emit `directionVector = normalize(negate(bestUnit))` =
    travel direction INTO the junction (canonical). There is NO existing negation
    to remove here; you are ADDING one to convert the upstream `bestUnit` into
    travel direction. `Light.draw` lays the head out with `perpendicular(dv)`
    (a symmetric bar), so flipping `dv` does not change how the light looks —
    this is convention consistency only. Do NOT change the isolated-signal
    `throughAxis` branch geometry (only orient its sign toward the through road;
    symmetric for the draw).
  - Update the file's direction-convention comments (L656+, and the L93 field
    doc) to the canonical rule.
- `ts/world/osmDirectionalMarkings.ts` `expandDirectionalMarking`:
  - `directionVector` is now the seed travel direction. Delete the `facing()`
    negation (L60–65) — emit `directionVector = directionVector` (travel) for
    every per-lane placement.
  - Lane selection math (approach segment, driver's-right filter L88–94) stays,
    but re-derive the "keep approaching lanes" test against the new lane-guide
    orientation (guides now point ALONG travel, so `dot(guideDir, seed) > 0`
    selects lanes flowing into the junction — mirror the archived per-lane logic,
    inverted).
  - Update `STOP_LINE_SETBACK_PX` usage: setback is UPSTREAM = `-directionVector`
    (against travel) — verify sign after the convention flip.

**Test:** update `tests/unit/world/osmDirectionalMarkings.test.ts` and the
OSM-direction cases in `tests/unit/math/osm-importer/osm.test.ts` (or wherever
`parseRoads` direction is asserted) to expect travel-direction output with no
negation.

## Step 7 — Save version bump + runtime migration

`ts/world/world.ts`:

- `toInfo()` (L241): `version: 3`.
- `static load(info)` (L157): BEFORE `WorldGenerator.reanchorMarkings(world)`
  (L226), if `info.version !== 3` (undefined/1/2 = legacy), migrate each loaded
  marking:
  1. `m.directionVector = new Point(-m.directionVector.x, -m.directionVector.y)`
  2. if `m.anchor`: recompute
     `segDir = normalize(subtract(anchor.p2, anchor.p1))`,
     `m.anchor.flipped = dot(m.directionVector, segDir) < 0`.
     This makes `reanchor` reproduce the corrected direction.

`ts/world/markings/markingLoader.ts` (L49–57): **persist `flipped`** — add
`flipped: info.anchor.flipped` when building `marking.anchor` (currently
dropped). This is the load half of the round-trip; `setAnchor` already writes it
(`marking.ts` L117).

> Symmetric markings (crossing/target/parking/light) negating `dv` is harmless
> (identical geometry). The uniform negation is intentional — do not special-case.

**Test:** new `tests/unit/world/markingDirectionMigration.test.ts`: build a v2
world JSON with a directional marking, `World.load` it, assert the marking now
faces travel direction and survives a `toInfo`→`load` round-trip (v3, no further
flip). Update `markingLoader.test.ts` to assert `flipped` round-trips.

## Step 8 — Offline migration script (`saves/` + `store/world`)

New `scripts/migrate-marking-direction.mjs` (mirror the structure/CLI of
`scripts/migrate-worlds.mjs`):

- Default dirs: `saves` and `store/world`. Support `--dir <dir>` and `--dry`.
- For each `*.world`: parse; if `version === 3` skip (idempotent); else for every
  entry in `markings[]`:
  1. negate `directionVector`;
  2. if `anchor`: set `anchor.flipped = dot(negatedDir, normalize(p2−p1)) < 0`;
  3. set `version = 3`.
- Back up originals to `<dir>/_predir_backup/` before overwriting.
- Print a per-file summary (markings migrated).

Run it once (`node scripts/migrate-marking-direction.mjs`), commit the rewritten
`saves/*.world` + `store/world/*.world` and their backups. `saves/*-osm-data.json`
are raw OSM (not `.world`) — they re-import through the fixed pipeline, so the
script skips them.

## Step 9 — Manual verification + visual baselines

1. `npm run rebuild && npm start`. In the World Editor:
   - Draw a two-way road and a one-way road (multi-lane). Place `start`, `stop`,
     `yield` on several lanes. Confirm each glyph faces the lane's travel
     direction. Save, reload the page, confirm they still face correctly.
   - Import `saves/ashkelon-barnea-osm-data.json` (the user's sample — has
     traffic-signal junctions and parking-tagged ways). Confirm: stop/yield text
     reads for the approaching driver; traffic lights sit on the correct
     approach arm at the stop line (upstream slide preserved) and face oncoming
     traffic on one-way and multi-lane junctions; parking "P" lanes appear on the
     correct side (unchanged by this task). Fallbacks:
     `saves/ashkelon-osm-data.json`, `saves/kohav-hazafon-osm-data.json`.
2. In `simulator.html` / `traffic.html` / `human-training.html` / `race.html`:
   spawn from a `start` and confirm the car drives the direction the marking
   points (and one-way traffic cars flow `p1→p2`).
3. Only after visual correctness is confirmed:
   `npm run test:visual:update`, review the diffs (markings should be the ONLY
   changes, rotated to correct facing), commit baselines.

## Step 10 — Docs + graph

- Update `docs/Physics.md` (sensor/heading), `docs/WorldEditor.md`, and the
  relevant `AGENTS.md` bullets to state the canonical rule and remove the
  "faces opposite to dv" / "negated" language.
- `npm run fix:all` (format + lint).
- `graphify update .`.

---

## Do NOT touch — parking side geometry (out of scope)

Parking is **not** a marking and is **orthogonal** to this migration — leave it
exactly as-is:

- `parkingLeft` / `parkingRight` are **segment metadata**, not a marking
  `directionVector`. The offline script (Step 8) and runtime migration (Step 7)
  only negate marking `directionVector` + bump `version`; they must **never**
  read or write segment parking metadata.
- `getSegmentEnvelopeGeometry` (`worldGenerator.ts` L76) and `#drawParkingLanes`
  (`world.ts` L487) derive the parking side from the **raw**
  `segment.directionVector()` (p1→p2) and `perpendicular` (`+perp = right of
p1→p2`). The migration changes lane-**guide** orientation and **marking**
  `directionVector`, NOT `Segment.directionVector()` — so left/right parking is
  unaffected. Do not "fix" it to match the new convention.
- `hasParkingSide` in `osm.ts` (and its reverse-one-way side swap) is likewise
  untouched.
- The legacy `Parking` marking (manual `ParkingEditor`) is symmetric; the
  uniform marking-dv negation is harmless (identical square). No special-case.

## Grep guardrails (should return ZERO after this task)

```
-angle\(                     # spawn inversion
angle\([^)]*\) [-+] Math\.PI / 2   # scattered draw/heading flips (outside direction.ts, envelope.ts)
new Point\(-facing            # OSM negation
```

Allowed remaining `± Math.PI / 2`: only `ts/math/direction.ts`,
`ts/math/primitives/envelope.ts` (geometry, unrelated), and
`ts/car/controls/phoneControls.ts` (gyroscope reference).

## Order-of-work summary

1. `direction.ts` + test → 2. lane guides → 3. marking draws →
2. editor base → 5. spawn sites → 6. OSM → 7. version+runtime migration +
   `flipped` → 8. offline script → 9. manual verify + baselines → 10. docs+graph.

Run `npm test` green before Step 9; regenerate baselines only in Step 9.
