# Split TrainingPanelElement — Extract Car-Config and Pool-Table Molecules

**Date:** 2026-08-04
**Slug:** split-training-panel-ts
**Entry points affected:** html/simulator.html, html/traffic.html (wherever `<training-panel>` is used)
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/ui/organisms/trainingPanel.ts` (806 lines) is on the architecture audit's
god-object watch-list (see `AGENTS.md` "Anti-Patterns to Flag"). Per the
Atomic Design convention already in place across this codebase (AGENTS.md §
"UI Architecture — Atomic Design" and "TS Component Hierarchy"), an organism
should compose molecules rather than own every sub-feature's DOM/state
directly. Extract two self-contained sub-features into their own molecules:
the collapsible car-config fieldset, and the pool results table. No
behavior change.

## Context (read first)

- [ts/ui/organisms/trainingPanel.ts](../ts/ui/organisms/trainingPanel.ts) —
  read in full.
- [ts/ui/organisms/trainingPanelTemplate.ts](../ts/ui/organisms/trainingPanelTemplate.ts)
  — the HTML template string (`TRAINING_PANEL_TEMPLATE`) that
  `TrainingPanelElement.connectedCallback` injects via `this.innerHTML`. You
  will need to see which DOM element IDs belong to the car-config fieldset
  (`#carMaxSpeed`, `#carAcceleration`, `#carFriction`, `#carWidth`,
  `#carHeight`, `#carRayCount`, `#carRayLength`, `#carRaySpread`,
  `#carRayOffset`, `#carStateAware`, `#carHiddenLayers`, `#carConfigSection`,
  `#carConfigToggle`, `#carConfigSummary`) versus the pool table
  (`#poolTableBody`, `#dot-pool`, `#dot-storage`, `#dot-car-config`) before
  deciding whether the template itself should be split into two
  sub-templates owned by the new molecule files, or left as one template with
  the new molecule classes querying into a container element passed to them.
  Prefer **not** splitting the template file (lower risk, template stays a
  single source of truth for the panel's HTML) — instead have each new
  molecule class accept a **root element** (the `<training-panel>` host, or a
  sub-container within it) in its constructor and do its own
  `root.querySelector(...)` for just its own fields.
- No dedicated unit test file exists for `TrainingPanelElement` today (custom
  element + heavy DOM — verify with
  `file_search` for `trainingPanel*.test.ts` before starting; if one has been
  added since this plan was written, read it and preserve its public API
  usage). Related non-DOM logic already has unit coverage in
  `tests/unit/simulator/training/genetics/poolManager.test.ts` (or similarly
  named) — do not duplicate that coverage; this task is pure UI code motion.
- AGENTS.md § UI Architecture: "Molecules: Single-purpose compound components
  (custom elements with templates)." — the two new files should each define a
  small custom element or a plain class instantiated by the organism; match
  whichever style existing sibling molecules use (see
  `ts/ui/molecules/worldLayersToolbar.ts` for a molecule-with-template
  example, and `ts/ui/atoms/latchedToggle.ts` for a plain-class-no-template
  example — the car-config/pool-table extraction here is closer to the
  latter since it reuses the existing template's markup rather than
  rendering its own).

## Scope

- **In scope:**
  - Extract car-config state + behavior (`getCarSettings`, `setCarSettings`,
    `#parseHiddenLayers`, `#updateCarConfigSummary`, all
    `#car*Input`/`#carConfig*` DOM fields, and the "auto-restart training on
    car param change" listener wiring) into a new class
    `CarConfigPanel` in `ts/ui/molecules/carConfigPanel.ts`.
  - Extract pool-table rendering (`#updatePoolTable`, `#updateStatusDots`,
    `selectedPoolIndices`, the delegated click listener on
    `#poolTableBody`, and the `#poolTableBody`/`#dotPool`/`#dotStorage`/
    `#dotCarConfig` DOM fields) into a new class `PoolTable` in
    `ts/ui/molecules/poolTable.ts`.
  - `TrainingPanelElement` keeps: settings (`getSettings`,
    `setTrainingParams`), simulation controls (`nextGeneration`,
    `newTraining`, `initializeCars`), car creation (`#createCarsWithPool`,
    `#generateCars`), storage (`save`, `discard`,
    `#loadPoolFromStorage`, `#loadInitialCarConfig`), and stats
    (`updateStatsDisplay`, `updateBestCarAndPool`, `refreshPoolUI` —
    `refreshPoolUI` becomes a 2-line delegate calling
    `#poolTable.update(this.bestPool, this.#evaluateFitness)` and
    `#poolTable.updateStatusDots(this.getSettings(), this.getCarSettings())`
    or similar).
  - `TrainingPanelElement.configure()`/`#initDOMElements()` construct
    `#carConfigPanel = new CarConfigPanel(this)` and
    `#poolTable = new PoolTable(this)` (passing `this` — the host element —
    as the root to query into), after `this.innerHTML` has been set.
- **Out of scope:**
  - `TRAINING_PANEL_TEMPLATE` / `trainingPanelTemplate.ts` — do not restructure
    the HTML/CSS, only which TS class reads/writes which DOM nodes within it.
  - Any change to `poolManager.ts` / `storageManager.ts` genetics helpers —
    those are already extracted and are consumed unchanged.
  - `CarLoader.compareCarParams` and the diff-string building in
    `#updateStatusDots` — move verbatim, do not simplify the diff logic.

## Implementation

### `ts/ui/molecules/carConfigPanel.ts` (new file)

- Export class `CarConfigPanel`.
- Constructor takes the host `HTMLElement` (the `<training-panel>` root) and
  does its own `querySelector` for the 11 car-config inputs plus
  `#carConfigSection`/`#carConfigToggle`/`#carConfigSummary`, wires the
  collapse-toggle click listener and the numeric +/- button listeners
  scoped to just its own inputs (reuse the existing `.num-btn` delegation
  logic, filtered to only the car-config inputs it owns — the training-param
  `.num-btn`s for carCount/poolCount/threshold/idleRange stay on
  `TrainingPanelElement`).
- Public methods: `getCarSettings(): CarInfo`, `setCarSettings(info: CarInfo): void`,
  `hiddenLayers: number[]` (getter, mirrors today's `this.hiddenLayers`
  public field — decide whether to keep it as a public field or a getter;
  a getter is preferred per the codebase's general immutability lean, but
  check callers of `TrainingPanelElement.hiddenLayers` first via
  `grep_search` for `.hiddenLayers` before changing its shape).
- Accepts an `onCarParamsChanged: () => void` callback in its constructor
  (or a setter) so `TrainingPanelElement` can still trigger
  `#updateCarConfigSummary()` + `this.newTraining()` on car-param `change`
  events without the molecule needing to know about training restarts.

### `ts/ui/molecules/poolTable.ts` (new file)

- Export class `PoolTable`.
- Constructor takes the host `HTMLElement` and does its own `querySelector`
  for `#poolTableBody`/`#dot-pool`/`#dot-storage`/`#dot-car-config`, wires
  the delegated row-click listener, and owns `selectedPoolIndices: Set<number>`.
- Public methods: `updateTable(pool: Car[], evaluateFitness: (car: Car) => number): void`
  (today's `#updatePoolTable`), `updateStatusDots(settings: {poolSize:number}, carSettings: CarInfo): void`
  (today's `#updateStatusDots`, taking the settings it needs as parameters
  instead of reaching back into `TrainingPanelElement`), and
  `get selectedIndices(): ReadonlySet<number>` /
  `clearSelection(): void` (used by `TrainingPanelElement.nextGeneration`/
  `newTraining`, which today do `this.selectedPoolIndices.clear()`).
- Keep the cached `#cachedStoredPool`/`#cachedStoredPoolValid` fields and the
  `save()`/`discard()` invalidation contract — `TrainingPanelElement.save()`/
  `discard()` must call something like `this.#poolTable.invalidateStoredPoolCache()`
  after writing/clearing localStorage (today this is
  `this.#cachedStoredPoolValid = false`).

### `ts/ui/organisms/trainingPanel.ts`

- Remove the extracted fields/methods; construct `#carConfigPanel` and
  `#poolTable` in `#initDOMElements()`.
- Update every call site (`getCarSettings()`, `setCarSettings()`,
  `hiddenLayers`, `#updatePoolTable()`, `#updateStatusDots()`,
  `selectedPoolIndices`) to delegate to the new molecules. Keep
  `TrainingPanelElement`'s own public method names (`getSettings`,
  `getCarSettings`, `setCarSettings`, `save`, `discard`,
  `updateBestCarAndPool`, `refreshPoolUI`, etc.) unchanged so any external
  caller (simulator shells) needs no changes.

## Brain / persistence considerations

None directly — `hiddenLayers`/`getCarSettings`/`setCarSettings` feed into
`CarInfo`/brain topology inference (`inferHiddenLayers`), but this task moves
that code unchanged; it does not alter the brain-compatibility contract. Do
not change `brainsCompatible()` or `Car.load()`.

## Acceptance criteria

- Opening `html/simulator.html`, the Car Config section still expands/
  collapses, editing any car-config field still triggers `newTraining()`,
  and the pool table still shows/selects rows and downloads `.car` files for
  selected rows exactly as before.
- `npm run rebuild`, `npm run fix:all`, `npx tsc --noEmit`, `npm test` all
  pass with the same test count as before this change (this file currently
  has no dedicated unit test; if any other test imports
  `TrainingPanelElement`, confirm it still passes).

## Docs to update

- None required — no documented convention or behavior changes. If you want
  to record the new molecule pair in the wsng-shared-components-style
  registry for this repo (there isn't one currently, so skip), that would be
  a separate task.
