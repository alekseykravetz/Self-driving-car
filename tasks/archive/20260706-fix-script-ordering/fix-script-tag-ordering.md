# Fix script tag ordering in HTML files

**Severity:** Low
**Source:** Architectural Violation #9
**Files:** `html/simulator.html:86-91`, `html/traffic.html:83-88`, `html/race.html:79-84`
**Status:** ✅ Fixed

## Problem

`car/car.js` script tag appears before `neural-network/network.js` on every page. While this works because `Car` does not reference `NeuralNetwork` until instantiation (which happens later in the inline `<script>`), it violates the declared dependency hierarchy (Layer 3 should precede Layer 4 consumption).

## Impact

Fragile ordering that could break if `Car`'s static initialization ever references `NeuralNetwork`.

## Remediation

Move all `neural-network` script tags before `car` script tags in every HTML file. Files to update:

- `html/simulator.html`
- `html/traffic.html`
- `html/race.html`
- `html/world.html` (if applicable)
