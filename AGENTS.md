# AGENTS.md — Self-Driving Car Simulator

## Build & dev

- **No bundler** — `tsc` compiles `ts/` → `js/` (mirrored structure). HTML loads compiled `.js` via `<script>` tags in dependency order.
- **`npm start`** runs three concurrent watchers: `tsc --watch`, `serve -p 9090`, and auto-format+lint.
- **Never edit `js/` directly.** Source of truth is `ts/`.
- **Always run `npm run fix:all` (format + lint) before committing.** ESLint config has a large `allowedUnusedVars` list — if you add a new global class/function, add it there plus in the globals map.

## Architecture rules

- **No runtime dependencies.** Everything (NN, physics, geometry, rendering) is hand-rolled. Don't add npm packages.
- **Global scope only.** No `import`/`export` at runtime — all classes attach to `window`. TypeScript `module: "none"`.
- **Canvas 2D API only** — no WebGL or Three.js.
- **Private members use `#` prefix** (ES2022 private fields).
- **Serialization pattern:** `static load(info)` factory + instance method.

## Key gotchas

- **Script load order** — if you get "X is not defined" in the browser, the `<script>` tag for X is missing or in the wrong order in the relevant HTML file. Update all HTML files that need the new module.
- **Car angle:** 0 = facing up, positive = clockwise. **Sensor readings** are `1 - offset` before feeding to network.
- **`Polygon.union()`** is complex — mutations can break road rendering.
- **3D uses Painter's algorithm** (sort by distance, draw back-to-front).
- **Neural network uses binary step activation** (not sigmoid/ReLU).

## Key commands

| Command | Purpose |
|---|---|
| `npm start` | Full dev: tsc watch + server + lint/format |
| `npm run tsc:watch` | Compile TS on save only |
| `npm run serve` | Static server on :9090 |
| `npm run lint` | ESLint auto-fix |
| `npm run format` | Prettier (singleQuote: true) |
| `npm run fix:all` | format + lint |
| `npm run publish:site` | Deploy via here.now (scripts/publish-site.sh) |

## Entry points

- `html/simulator.html` — Training (world mode by default, `?mode=simple` for simple road)
- `html/traffic.html` — Live Traffic Jam
- `html/race.html` — Racing (`?mode=camera` or `?mode=phone`)
- `html/world.html` — World editor

## Testing

- No automated tests — validation is visual. Open the relevant HTML page in a browser.
- World files in `saves/` use v2 schema (`version: 2`, `decoration` instead of baked tree/building arrays).

## Persistence

| localStorage key | Content |
|---|---|
| `bestPool` | Top-K car configs with brains |
| `raceCars` | Cars loaded via race "Load car(s)" |
| `editorWorld` | World saved by editor |
| `store:activeWorld` / `store:activeCar` | Active store selection |
