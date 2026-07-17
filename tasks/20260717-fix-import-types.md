# Fix Import Type Annotations

**Date:** 2026-07-17
**Slug:** fix-import-types
**Entry points affected:** none — shared `ts/` only
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Fix two type-only imports that incorrectly import interfaces as values (not `import type`). While TypeScript elides these at compile time, the `import type` convention improves code hygiene, clarifies intent, and avoids potential circular-dependency issues in the future.

## Context (read first)

- `ts/car/brain/carBrainAdapter.ts` line 1: `import { IntersectionPoint } from '../physics/sensorRaycaster.js'` — `IntersectionPoint` is an interface (`export interface IntersectionPoint extends Point`), imported as a value.
- `ts/car/controls/cameraControls.ts` line 1: `import { MarkerDetector, Marker } from './markerDetector.js'` — `Marker` is an interface (`export interface Marker`), `MarkerDetector` is a class (value).

## Scope

- **In scope:**
  - `ts/car/brain/carBrainAdapter.ts`: change `IntersectionPoint` import to `import type`.
  - `ts/car/controls/cameraControls.ts`: split the import — keep `MarkerDetector` as value import, move `Marker` to `import type`.
- **Out of scope:**
  - No behavioral changes.
  - No other import changes.

## Implementation

### 1. `ts/car/brain/carBrainAdapter.ts` — line 1

Change:

```diff
- import { IntersectionPoint } from '../physics/sensorRaycaster.js';
+ import type { IntersectionPoint } from '../physics/sensorRaycaster.js';
```

### 2. `ts/car/controls/cameraControls.ts` — line 1

Change:

```diff
- import { MarkerDetector, Marker } from './markerDetector.js';
+ import { MarkerDetector } from './markerDetector.js';
+ import type { Marker } from './markerDetector.js';
```

Or use the inline `type` modifier (TypeScript 4.5+):

```diff
- import { MarkerDetector, Marker } from './markerDetector.js';
+ import { MarkerDetector, type Marker } from './markerDetector.js';
```

Both are acceptable. Prefer the inline `type` modifier (single import statement) for minimal diff.

## Brain / persistence considerations

None.

## Acceptance criteria

- `npm run fix:all` passes and `tsc --noEmit` compiles clean — confirming no value-vs-type import mismatches.
- All features continue to work: human backpropagation (uses `CarBrainAdapter`), camera controls (uses `CameraControls`/`MarkerDetector`).

## Docs to update

- `AGENTS.md` — no changes needed (the `import type` convention is already documented in "Import path hygiene").
