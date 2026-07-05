# Extract draw methods from math primitives

**Severity:** Medium
**Source:** Architectural Violation #2
**Files:** `ts/math/primitives/point.ts:18-46`, `ts/math/primitives/segment.ts`, `ts/math/primitives/polygon.ts`, `ts/math/primitives/envelope.ts`

## Problem

`Point.draw()` embeds Canvas 2D rendering logic directly into a math primitive. This is a cross-cutting concern violation — a pure data structure `({x, y, z})` should not know about `CanvasRenderingContext2D`, `ctx.arc()`, or `strokeStyle`. The same pattern propagates to `Segment.draw()`, `Polygon.draw()`, and `Envelope.draw()`.

## Impact

Makes the math layer dependent on browser Canvas APIs, preventing reuse in headless or non-Canvas contexts.

## Remediation

Extract all `draw` methods from math primitives into a dedicated `ts/rendering/` layer with renderer functions that accept primitives as data. Create:

- `ts/rendering/pointRenderer.ts`
- `ts/rendering/segmentRenderer.ts`
- `ts/rendering/polygonRenderer.ts`
- `ts/rendering/envelopeRenderer.ts`
