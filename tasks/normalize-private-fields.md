# Normalize private fields to ES2022 # syntax

**Severity:** Low
**Source:** Structural Reorganization #9, #10
**Files:** Throughout codebase (e.g., `TrainingSimulator`, `SimulatorShell`)

## Problem

The codebase mixes `private` keyword (TypeScript-only, no runtime enforcement) with ES2022 `#` private fields (true hard-private). `SimulatorShell` correctly uses `#wireNetworkInteractivity`, but other classes still use the `private` keyword for fields that don't need subclass access.

## Impact

Inconsistent visibility conventions. TypeScript `private` fields are still accessible at runtime and can cause name collisions in inheritance chains.

## Remediation

- Convert `private` fields to `#` private fields for any class that doesn't need subclass access
- Keep `protected` for fields that genuinely need to be accessed by subclasses
- Classes to prioritize: `TrainingSimulator` (e.g., `#mode`), and any other module-internal classes
