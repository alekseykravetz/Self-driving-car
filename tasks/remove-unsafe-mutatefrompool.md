# Remove unsafe NeuralNetwork.mutateFromPool()

**Severity:** Medium
**Source:** Architectural Violation #7
**File:** `ts/neural-network/network.ts:88-99`

## Problem

`mutateFromPool()` directly selects parents from the pool array and passes them to `crossover()` without cloning. Since `crossover()` actually creates a new child (immutable), the parents are not mutated — but the documentation says it "mutates original pool references". The method coexists with `toMutatedFromPool()` (lines 156-171) which explicitly clones first.

## Impact

Code smell. The unsafe `mutateFromPool()` is retained alongside the safe `toMutatedFromPool()`, creating a trap for future developers.

## Remediation

Remove `mutateFromPool()` entirely and rename `toMutatedFromPool()` to `mutateFromPool()`, or make the former delegate to the latter.
