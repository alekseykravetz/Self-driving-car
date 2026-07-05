# Move DEFAULT_CAR_CONFIG from ts/math/utils.ts to ts/car/config.ts

**Severity:** Medium
**Source:** Architectural Violation #3
**File:** `ts/math/utils.ts:5-17`

## Problem

`DEFAULT_CAR_CONFIG` (`maxSpeed`, `acceleration`, `friction`, sensor config) lives in `ts/math/utils.ts` — a file meant for pure mathematical utility functions. `WORLD_PIXELS_PER_METER` and `SIMULATION_FPS` are physics constants; car config is domain data.

## Impact

Blurs FSD boundaries. The math module should not define car physics defaults.

## Remediation

- Create `ts/car/config.ts` with `DEFAULT_CAR_CONFIG`, `STEERING_SPEED`, etc.
- Keep math-leaning constants (`WORLD_PIXELS_PER_METER`, `SIMULATION_FPS`) in `ts/math/utils.ts` or a new `ts/physics/constants.ts`
