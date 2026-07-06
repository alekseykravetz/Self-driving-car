# Units & Conversions

This document is the single reference for project units, conversion constants, and practical examples.

---

## Core Constants

Defined in `ts/math/utils.ts`:

- `WORLD_PIXELS_PER_METER = 14`
- `SIMULATION_FPS = 60`
- `METERS_PER_DEGREE_LATITUDE = 111000` (for OSM projection)

---

## World Distance Scale

The world uses pixel-based geometry with real-world mapping:

- `14 world px = 1 meter`
- `1 world px = 1 / 14 m = 0.07143 m`

Formulas:

- `meters = worldPx / 14`
- `worldPx = meters * 14`

Examples:

- `1 m -> 14 px`
- `3.5 m lane -> 49 px`
- `7.0 m two-lane road -> 98 px`
- `7.5 m two-lane road -> 105 px`
- `100 px road envelope -> 100 / 14 = 7.14 m` (close to typical urban two-lane width)

---

## Car Size Scale

Default car values are in world pixels (from `DEFAULT_CAR_CONFIG` in `ts/car/config.ts`):

- `width = 25 px`
- `height = 63 px`

Converted to meters:

- `widthMeters = 25 / 14 = 1.79 m`
- `lengthMeters = 63 / 14 = 4.50 m`

Useful formulas:

- `carWidthMeters = carWidthPx / 14`
- `carLengthMeters = carLengthPx / 14`
- `carWidthPx = carWidthMeters * 14`
- `carLengthPx = carLengthMeters * 14`

Examples:

- Compact width `1.8 m -> 25.2 px` (use ~25 px)
- Sedan length `4.7 m -> 65.8 px` (use ~66 px)

---

## Physics Constants

Defined in `ts/car/config.ts`:

| Constant                     | Value | Unit      | Description                                                    |
| ---------------------------- | ----- | --------- | -------------------------------------------------------------- |
| `STEERING_SPEED`             | 0.03  | rad/frame | Steering angle delta per frame                                 |
| `REVERSE_SPEED_RATIO`        | 0.5   | (ratio)   | Reverse speed cap as a fraction of `maxSpeed`                  |
| `COLLISION_ANGLE_CORRECTION` | 0.1   | rad       | Angle correction applied when a car collides with road borders |
| `BODY_MARGIN_RATIO`          | 0.5   | (ratio)   | Car body diagonal multiplier for obstacle proximity checks     |

---

## Speed Units

Internal simulation speed unit is `px/frame`.
Human-readable speed is typically `km/h`.

Constants used:

- `FPS = 60`
- `PPM = 14`

Formulas:

- `m/s = pxPerFrame * FPS / PPM`
- `km/h = pxPerFrame * FPS / PPM * 3.6`
- `pxPerFrame = (km/h / 3.6) * PPM / FPS`

At current constants (`FPS=60`, `PPM=14`):

- `km/h = pxPerFrame * 15.428571`
- `pxPerFrame = km/h * 0.0648148`

Examples:

- `1.00 px/frame -> 15.4 km/h`
- `2.00 px/frame -> 30.9 km/h`
- `3.24 px/frame -> 50.0 km/h` (default maxSpeed)
- `5.00 px/frame -> 77.1 km/h`
- `8.00 px/frame -> 123.4 km/h`

And reverse conversion examples:

- `30 km/h -> 1.94 px/frame`
- `50 km/h -> 3.24 px/frame`
- `90 km/h -> 5.83 px/frame`

---

## Time Units

Simulation time is frame-based and tied to `SIMULATION_FPS = 60`.

**Time Conversion:**

- `1 frame = 1/60 second`
- `60 frames = 1 second`
- `3600 frames = 1 minute`

### Elapsed Time Display

The `<animation-loop-toolbar>` element displays elapsed simulation time in **HH:MM:SS** format:

- Only counts when simulation is running (paused state resets counting)
- Uses `formatElapsedTime(frames)` helper function
- Accurate frame counting regardless of render interval

### FPS Counter

The toolbar also displays **actual rendering FPS** (frames rendered per second):

- Shows visual refresh rate, NOT simulation speed
- Measured using `performance.now()`, updated once per second
- Reflects the effect of `renderInterval` setting:
  - `renderInterval = 1` → displays ~60 FPS (all frames rendered)
  - `renderInterval = 60` → displays ~1 FPS (only 1 of 60 frames rendered)

**Note:** Physics always runs at full SIMULATION_FPS rate; only the draw pass is throttled by `renderInterval`.

### Helper Functions

- `framesToSeconds(frames)` - Converts simulation frames to seconds
- `formatElapsedTime(frames)` - Formats elapsed time as HH:MM:SS string

Example:

```typescript
const elapsedFrames = 3600; // 60 frames/sec
formatElapsedTime(elapsedFrames); // "00:01:00" (1 minute)
framesToSeconds(elapsedFrames); // 60 (seconds)
```

---

## Acceleration / Friction Units

Internal unit for acceleration and friction is `px/frame^2`.

Formulas:

- `m/s^2 = pxPerFrame2 * FPS^2 / PPM`
- `pxPerFrame2 = m/s^2 * PPM / FPS^2`

At current constants (`FPS=60`, `PPM=14`):

- `pxPerFrame2 = m/s^2 * 0.0038889`
- `m/s^2 = pxPerFrame2 * 257.142857`

Examples:

- Default `acceleration = 0.01 px/frame^2 -> 2.57 m/s^2`
- Default `friction = 0.002 px/frame^2 -> 0.51 m/s^2`
- Net forward (while accelerating) `0.01 - 0.002 = 0.008 px/frame^2 -> 2.06 m/s^2`

---

## OSM Geographic Scale

OSM import converts lat/lon into world pixels using:

- `heightPx = deltaLat * METERS_PER_DEGREE_LATITUDE * WORLD_PIXELS_PER_METER`
- `widthPx = heightPx * (deltaLon / deltaLat) * cos(avgLatitude)`

This preserves approximate metric scale while correcting longitude distortion by latitude.

---

## Helper Functions (Use These)

Already implemented in `ts/math/utils.ts`:

- `worldPixelsToMeters(px)`
- `metersToWorldPixels(meters)`
- `pxPerFrameToKmh(pxPerFrame)`
- `kmhToPxPerFrame(kmh)`
- `formatMetersFromWorldPixels(px)`
- `formatKmhFromPxPerFrame(pxPerFrame)`
- `framesToSeconds(frames)` — Convert frames to seconds
- `formatElapsedTime(frames)` — Format frames as HH:MM:SS

Prefer these helpers instead of repeating conversion math inline.

---

## Quick Reference Table

| Quantity | Internal Unit | Real Unit  | Formula                       |
| -------- | ------------- | ---------- | ----------------------------- |
| Distance | world px      | m          | `m = px / 14`                 |
| Distance | m             | world px   | `px = m * 14`                 |
| Speed    | px/frame      | km/h       | `kmh = pxf * 60 / 14 * 3.6`   |
| Speed    | km/h          | px/frame   | `pxf = (kmh / 3.6) * 14 / 60` |
| Accel    | px/frame^2    | m/s^2      | `mps2 = pxf2 * 60^2 / 14`     |
| Accel    | m/s^2         | px/frame^2 | `pxf2 = mps2 * 14 / 60^2`     |
