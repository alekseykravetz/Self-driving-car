# Refactor Race to extend SimulatorShell

**Severity:** High
**Source:** Architectural Violation #1
**File:** `ts/games/race.ts`

## Problem

Race manages its own full canvas lifecycle (constructor sets up `gameCanvas`, `cameraCanvas`, `miniMapCanvas`, owns raw `requestAnimationFrame` loop at `ts/games/race.ts:358-361`), completely duplicating the scaffolding already abstracted in `SimulatorShell`. It does not extend `SimulatorShell`.

362 lines of tightly-coupled code that bypasses the architectural template pattern.

## Impact

Duplicated code for viewport reset, camera management, animation loop, canvas resize wiring. Any improvement to `SimulatorShell`'s render-throttled RAF loop or responsive layout must be manually replicated in `Race`.

## Remediation

- Move `ts/games/race.ts` → `ts/simulator/racing/raceSimulator.ts` (extends `SimulatorShell`)
- Move `ts/games/racePanel.ts` → `ts/simulator/racing/racePanel.ts`
- Extract generic canvas/viewport/camera/animation from Race into the shared shell
- Race-specific logic (corridor progress, car generation, countdown, statistics panel) should live in `update()` and `draw()` overrides
