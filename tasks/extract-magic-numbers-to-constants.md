# Extract magic numbers to named constants

**Severity:** Low → Medium
**Source:** Architectural Violations #5, #8
**Files:** `ts/car/physics/carPhysics.ts`, `ts/simulator/training/modes/borderCollision.ts`, `ts/simulator/training/modes/simpleModeBehavior.ts`, `ts/simulator/traffic/trafficSimulator.ts`

## Problem

Hardcoded values across physics and simulation code:
- `carPhysics.ts`: `-this.car.maxSpeed / 2` (reverse speed cap ratio), `0.03` (steering angle delta), `1` and `-1` (flip multiplier)
- `borderCollision.ts:32,34`: `car.angle += 0.1` / `car.angle -= 0.1` for collision correction

`0.03` appears both in `carPhysics.ts` and in `borderCollision.ts` (as `0.1` angle correction) — two different steering magic numbers with no clear rationale.

## Impact

Tuning requires code changes. No single source of truth for tuning constants.

## Remediation

Extract to `DEFAULT_CAR_CONFIG` or a dedicated physics config object:
- `STEERING_SPEED = 0.03`
- `REVERSE_SPEED_RATIO = 0.5`
- `COLLISION_ANGLE_CORRECTION = 0.1`
