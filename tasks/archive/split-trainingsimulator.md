# Split TrainingSimulator (714 lines)

**Severity:** Medium
**Source:** Architectural Violation #6
**File:** `ts/simulator/training/trainingSimulator.ts`

## Problem

714 lines, the largest file in the codebase. Manages two entirely distinct modes (simple vs world) with separate `update`/`draw` methods (`#updateSimple`, `#drawSimple`, `#updateWorld`, `#drawWorld`), camera tracking, network visualizer wiring, toolbar config, init modal routing, and training metrics. Essentially two simulators in one file.

## Impact

Reduced maintainability; changes to simple mode risk affecting world mode and vice versa.

## Remediation

Either:

- Extract `SimpleTrainingSimulator` and `WorldTrainingSimulator` subclasses
- Or use strategy pattern: `SimpleModeStrategy` / `WorldModeStrategy` objects injected into a single `TrainingSimulator`

The mode files at `ts/simulator/training/modes/` already contain pure functions — promote them to strategies.
