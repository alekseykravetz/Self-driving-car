# Codebase Analysis — Discovery Report

> **Instructions for Copilot / AI Agent:**
> Scan the entire codebase and generate a full report following the structure below.
> For every pattern, technology, or convention you identify — include a **real code example pulled directly from this project**.
> Do not invent examples. Do not rewrite or improve any code. Only describe what currently exists.
> Where possible, provide **percentage estimates** based on file counts or occurrences.
>
> **Project context (do not assume otherwise):**
> This is a **browser-based, zero-runtime-dependency self-driving-car simulator** written in
> **TypeScript** and compiled to plain JavaScript with `tsc` (no bundler, no framework, no React).
> Source lives in `ts/`, compiled output mirrors it in `js/`, and HTML pages in `html/` load the
> compiled scripts via ordered `<script>` tags. All classes attach to the **global scope** — there
> are no ES `import`/`export` statements at runtime. Rendering is done with the **Canvas 2D API**.
> When evaluating "good" vs "bad", judge against _this_ architecture, not against a React/SPA stack.

---

## 📦 1. Project Overview

Provide a high-level snapshot:

- Total number of files by type (`.ts`, `.js`, `.css`, `.html`, `.json`)
- Source vs compiled-output split (`ts/` vs `js/`) — flag any drift between them
- Total lines of source code (count `ts/` only; `js/` is generated)
- TypeScript version and `tsconfig.json` strictness settings actually in use
- Tooling versions detected (TypeScript, ESLint, Prettier, serve)
- Estimated project age (based on git history if accessible)

---

## 🧰 2. Technology Stack

List **every tool** found in `package.json` (`devDependencies` only — there are no runtime
`dependencies`, so confirm this is still true and flag any that creep in).

For each notable tool:

| Tool       | Version | Purpose               | Usage Scope     |
| ---------- | ------- | --------------------- | --------------- |
| TypeScript | 5.x     | Compile `ts/` → `js/` | ~100% of source |
| ESLint     | 9.x     | Linting (flat config) | All `ts/` files |
| Prettier   | 3.x     | Formatting            | All source      |
| serve      | 14.x    | Static dev server     | Local dev only  |
| ...        | ...     | ...                   | ...             |

Then go deeper on the **key categories** below.

Also document the **build & run pipeline** from `package.json` scripts:

- `npm start` → what does it spawn concurrently?
- How does `tsc:watch`, `serve`, and `fix:all` (format + lint) interact?
- Is there any test runner? (Note explicitly if none exists.)

---

## 🧱 3. Class & Module Patterns

This project has **no React components**. The unit of organization is the **ES class** (attached to
global scope) and, for UI, the **custom HTML element (Web Component)**. Analyze these instead.

### 3.1 Plain Classes vs Custom Elements vs Free Functions

- Provide a percentage split: classes / `HTMLElement` subclasses / modules of free functions
- Note whether files mix multiple top-level classes or stick to one-class-per-file

**Examples of each found in this project:**

```ts
// Plain class (found in: ts/car/car.ts)
class Car {
  x: number;
  y: number;
  speed: number;
  // ...owns its own draw(ctx) method
}
```

```ts
// Custom element / Web Component (found in: ts/panels/toolbarPanel.ts)
class ToolbarPanelElement extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = ToolbarPanelElement.template;
    this.#initBorderModeButtons();
  }
}
```

```ts
// Free-function module (found in: ts/math/utils.ts)
// utility functions attached to global scope, no class wrapper
```

### 3.2 Recurring Design Patterns

Document each pattern, where it lives, and how consistently it's applied:

| Pattern                       | Where used                           | Example location                  |
| ----------------------------- | ------------------------------------ | --------------------------------- |
| Singleton                     | Asset/store access                   | `ts/store/storeManager.ts`        |
| Static factory (`Class.load`) | Deserialization from JSON            | `World.load()`, `Car.load()`      |
| Static helpers on a class     | `NeuralNetwork.feedForward / mutate` | `ts/neural-network/network.ts`    |
| `draw(ctx)` per class         | Every drawable owns its rendering    | `Car`, `Polygon`, `Building`, ... |
| Custom element template       | Static `template` string injected    | `ts/panels/`, `ts/ai-training/`   |
| `#private` fields (ES2022)    | Encapsulation                        | `StoreManager`, panels            |

For each pattern, show one real example:

```ts
// Singleton (found in: ts/store/storeManager.ts)
class StoreManager {
  static #instance: StoreManager | null = null;
  static #initPromise: Promise<StoreManager> | null = null;
  static async init(): Promise<StoreManager> {
    if (StoreManager.#instance) return StoreManager.#instance;
    // ...
  }
}
```

```ts
// Static factory for deserialization (found in: ts/.../*.ts)
static load(info: SomeInfo): SomeClass { /* rebuild instance from plain JSON */ }
```

### 3.3 Class Size & Complexity

- What is the average source file length (lines of code)?
- List the top 5 largest files by size and call out which are "god classes"
  (known candidates: `ts/ai-training/trainingManagerPanel.ts`, `ts/ai-training/simulator.ts`,
  `ts/games/race.ts`, `ts/world-editor/world.ts`, `ts/world-editor/editors/worldEditor.ts`).
- Note classes doing too many things (rendering + state + input + persistence in one class).

---

## 🔄 4. State & Data Flow

There is no Redux/Context/store framework. State flows through **the global scope**, a **singleton
(`StoreManager`)**, **`localStorage`**, and **instance fields passed between classes**. Map it out.

### 4.1 In-Memory / Instance State

```ts
// Example: state held directly on class instances (found in: ts/car/car.ts)
this.speed = 0;
this.damaged = false;
this.fitness = 0;
```

### 4.2 Shared / "Global" State

- How do pages share the active world and car? (Expected: `StoreManager` singleton.)
- Confirm whether the old global `world` / `carInfo` variables are truly gone
  (see note in `ts/types.ts`) or still referenced anywhere.
- Document how classes get their dependencies (constructor injection vs reaching for globals).

```ts
// Active-asset access (found in: ts/store/storeManager.ts)
StoreManager.getActiveWorld();
StoreManager.getActiveCar();
```

### 4.3 Persistence (`localStorage`)

Document every `localStorage` key, who writes it, and who reads it:

| Key                 | Value             | Writer | Reader |
| ------------------- | ----------------- | ------ | ------ |
| `bestPool`          | `CarInfo[]`       | ?      | ?      |
| `world`             | World JSON string | ?      | ?      |
| `store:activeWorld` | filename string   | ?      | ?      |
| `store:activeCar`   | filename string   | ?      | ?      |

Flag any **inconsistent serialization** (raw JSON vs legacy wrapper formats) — e.g. `.world` and
`.car` files that exist in both pure-JSON and legacy `World.load({...})` / `let carInfo = {...}` forms.

### 4.4 Async / Loading Flow

- How are assets loaded at startup? (Expected: `await StoreManager.init()` → `fetch('/store/manifest.json')`.)
- Where does `fetch` happen, and is error handling consistent (`try/catch` vs unhandled)?

```ts
// Asset loading (found in: ts/store/storeManager.ts)
const resp = await fetch('/store/manifest.json');
if (!resp.ok) throw new Error(`manifest fetch failed: ${resp.status}`);
```

---

## 🎨 5. Styling Approaches

Styling is plain CSS in `styles/` plus inline canvas drawing logic. List every method and usage:

| Method                      | Usage % | Notes                                   |
| --------------------------- | ------- | --------------------------------------- |
| Global CSS (`styles/*.css`) | ?       | Class/ID selectors, shared across pages |
| Inline `style.xxx` in TS    | ?       | DOM nodes built by custom elements      |
| Canvas 2D drawing calls     | ?       | `ctx.fillStyle`, `ctx.beginPath`, etc.  |

For each, show a real example:

```css
/* Global CSS — found in: styles/style.css */
```

```ts
// Inline style set from a custom element (found in: ts/panels/...)
(el as HTMLElement).style.display = 'none';
```

```ts
// Canvas drawing (found in: a draw(ctx) method)
ctx.beginPath();
ctx.fillStyle = this.color;
ctx.fill();
```

Also note:

- Are there shared CSS variables / a theme, or are colors hard-coded in both CSS and TS?
- Are HTML `<template>` strings duplicated across the `templates/` folders?

---

## 🌐 6. Asset Loading & File I/O Patterns

How does the project read/write worlds, cars, brains, and OSM data?

| Pattern                         | Usage | Notes                                            |
| ------------------------------- | ----- | ------------------------------------------------ |
| `fetch` from `/store/` manifest | ?     | Centralized in `StoreManager`                    |
| `WorldLoader` (file input)      | ?     | Parses both pure-JSON and legacy `.world` format |
| `CarLoader` (file input)        | ?     | Parses both pure-JSON and legacy `.car` format   |
| `localStorage` read/write       | ?     | See section 4.3                                  |
| Inline `fetch` in a page/class  | ?     | Flag any that bypass `StoreManager`              |

For each, show a real example, and note inconsistencies in:

- Error handling (`try/catch` vs silent `return null` vs nothing)
- Format handling (does every loader support both legacy and pure-JSON?)
- Duplicate parsing logic across `WorldLoader`, `CarLoader`, and `StoreManager`

---

## 🗂️ 7. Project & Folder Structure

Describe the structure and patterns observed.

```
ts/                     # TypeScript source (edit here)
├── math/               #   primitives, graph, osm-importer
├── car/                #   car + sensors + controls
├── neural-network/     #   network + visualizer
├── world-editor/       #   world model, editors, items, markings
├── camera/             #   3D projection / extrusion
├── viewport/           #   pan/zoom
├── mini-map/
├── ai-training/        #   simulator, training panel, pool/storage managers
├── games/              #   race
├── store/              #   StoreManager singleton + panel
├── world-loader/ , car-loader/
├── simple-world/ , shared/ , panels/
├── types.ts , utils.ts , sound.ts
js/                     # compiled output (do NOT edit — mirrors ts/)
html/                   # entry pages, load /js/*.js via ordered <script>
styles/                 # global CSS
store/  saves/          # JSON assets + legacy saves
docs/                   # architecture & module docs
```

Identify:

- Is the structure **feature-based**, **type-based**, or **mixed**?
- Does every `ts/` file have a matching compiled `js/` file (and vice-versa)? Flag orphans.
- Are `templates/` folders consistent across `panels/`, `ai-training/`, `store/`?
- Is there anything in `js/` that has no `ts/` source (e.g. `js/camera_new_ai_ver.js`)?

---

## 📝 8. Naming Conventions

Describe conventions detected (verify against `eslint.config.mjs` and Prettier config):

| Category        | Dominant Convention      | Consistency | Example                           |
| --------------- | ------------------------ | ----------- | --------------------------------- |
| Classes         | PascalCase               | ?           | `StoreManager`                    |
| Custom elements | `XxxElement` + kebab tag | ?           | `<toolbar-panel>`                 |
| Functions/vars  | camelCase                | ?           | `loadPoolFromStorage`             |
| Private fields  | `#` prefix (ES2022)      | ?           | `#instance`                       |
| Files           | camelCase `.ts`          | ?           | `storeManager.ts`                 |
| CSS classes     | ?                        | ?           | ?                                 |
| Constants       | UPPER_SNAKE_CASE         | ?           | `ACTIVE_WORLD_KEY`                |
| Quote style     | single vs double         | ?           | (project pref: **single quotes**) |

Flag files that break these conventions and where they are.
**Note:** the agreed Prettier setting is `singleQuote: true` — flag any double-quoted strings as drift.

---

## ⚠️ 9. Anti-Patterns & Problem Areas

List **observed problems**, specific to this architecture.

### 9.1 God Classes / Oversized Files

Files doing too much (rendering + input + state + persistence). Known candidates to verify:

```
ts/ai-training/trainingManagerPanel.ts   — largest file
ts/ai-training/simulator.ts
ts/games/race.ts
ts/world-editor/world.ts
ts/world-editor/editors/worldEditor.ts
```

### 9.2 Duplicate Code

Look specifically for:

- Parsing logic duplicated across `WorldLoader`, `CarLoader`, `StoreManager`
- Near-identical `draw(ctx)` / projection math copied between `Simulator`, `Race`, `Camera`, `MiniMap`
- Repeated HTML template strings across the `templates/` folders
- Copy-pasted collision / geometry helpers that should live in `ts/math/`

### 9.3 Global-Scope Coupling

Since all classes are globals, flag:

- Classes reaching directly for global singletons/variables instead of receiving them via constructor
- Hidden load-order dependencies (a class that breaks if its `<script>` tag moves)
- Any lingering use of removed globals (`world`, `carInfo`)

### 9.4 Inconsistent Error Handling

```ts
// Flag fetch/JSON parsing with no error path, vs silent `return null`, vs thrown errors
```

### 9.5 Legacy / Deprecated Patterns

- Dual file formats still supported (pure JSON **and** legacy `World.load({...})` / `let carInfo = {...}`)
- Files in `saves/` using the old wrapper format
- Orphaned compiled JS without TS source (e.g. `js/camera_new_ai_ver.js`)
- Any `any` types that defeat TypeScript's checking
- Cross-check against `docs/` — note where code has drifted from documented architecture

### 9.6 Dead & Unused Code

List classes, functions, files, or assets defined/shipped but never referenced
(check both `ts/` source and the `<script>` tags in `html/`).

---

## 📊 10. Summary Statistics

Provide a consolidated overview table (fill in real numbers):

| Metric                          | Value |
| ------------------------------- | ----- |
| Total `.ts` source files        | ?     |
| Total `.js` compiled files      | ?     |
| `.ts`/`.js` parity (orphans?)   | ?     |
| Total source LOC (`ts/`)        | ?     |
| Plain classes                   | ?     |
| Custom elements (`HTMLElement`) | ?     |
| Files > 400 lines               | ?     |
| Files with `any` usage          | ?     |
| Test coverage                   | none? |
| Runtime dependencies            | 0?    |
| `localStorage` keys in use      | ?     |
| Distinct `fetch` call sites     | ?     |

---

## 🧭 11. Improvement Opportunities (Quick Wins)

Based on the analysis, identify **low-risk, high-value** changes to make first:

| Area              | Current State                                  | Suggested Direction                         | Effort |
| ----------------- | ---------------------------------------------- | ------------------------------------------- | ------ |
| Duplicate parsing | Loaders + StoreManager repeat logic            | Extract shared parser into `ts/...`         | ?      |
| God classes       | `simulator.ts`, `trainingManagerPanel.ts` huge | Split rendering vs state vs input           | ?      |
| Legacy formats    | Dual JSON + wrapper formats                    | Migrate `saves/` to pure JSON, drop wrapper | ?      |
| Global coupling   | Classes reach for globals                      | Constructor injection of dependencies       | ?      |
| `any` usage       | Some types bypass checking                     | Replace with real interfaces in `types.ts`  | ?      |
| Quote-style drift | Mixed single/double quotes                     | Enforce `singleQuote: true` via Prettier    | low    |
| Orphaned JS       | `js/` files without `ts/` source               | Remove or restore source                    | low    |

---

## 📌 Notes for Next Step

This document is **Step 1 — Discovery**.

Once reviewed, the next document to create is:

> `code-standards.md` — the agreed single standard for this project going forward, with
> conventions, refactor rules, examples, and a checklist for code reviews — tailored to this
> zero-dependency TypeScript + Canvas architecture (not React).
