# Normalize `private` → `#` Private Fields

**Date:** 2026-07-17
**Slug:** normalize-private-fields
**Entry points affected:** none — shared `ts/` only
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Replace remaining TypeScript `private` keyword usages with ES2022 `#` private fields, consistent with AGENTS.md: "Private members use `#` prefix (ES2022 private fields)." The `private` keyword is only enforced at compile time — `#` guarantees true runtime encapsulation.

Two files use `private`:

1. `ts/store/storeManager.ts` (3 instances: `private static instance`, `private static initPromise`, `private constructor`, `private static async load`)
2. `ts/neural-network/visualizer.ts` (5 instances: `private static readonly NODE_RADIUS`, `MARGIN`, `SIGNAL_THRESHOLD`, `EDGE_HIT_TOLERANCE`, `LEGEND_BAND`)

`constructor` cannot use `#` — it remains `private constructor`. All other `private static` members can become `static #`.

## Context (read first)

- `AGENTS.md` — "Private members use `#` prefix (ES2022 private fields)."
- `ts/store/storeManager.ts` — lines 114-115 (`private static instance`, `private static initPromise`), line 128 (`private constructor()`), lines 131-139 (`private static init()`, `private static async load()`).
- `ts/neural-network/visualizer.ts` — lines 101-108 (`private static readonly` constants).

## Scope

- **In scope:**

  - `ts/store/storeManager.ts`: convert `private static` to `static #` for `instance` and `initPromise`. Leave `private constructor()` as-is (constructors cannot be `#`). Convert `private static async load()` to `static async #load()` (updating `this.load()` call in `init()` to reference the new private name). Convert `private static init()` — wait, `init()` is `static async init()` (public), keep that public. The `load()` reference on line 135 calls `this.load()` — since it becomes `#load()`, the call site must be `this.#load()`.
  - `ts/neural-network/visualizer.ts`: convert all 5 `private static readonly` to `static #` (they are constants, no `this.` references to update within the class since they're accessed via `NetworkVisualizer.NODE_RADIUS` or just `NODE_RADIUS` in static context — need to check usage).

- **Out of scope:**
  - No changes to `private constructor()` — JavaScript/TypeScript does not support `#constructor`.
  - No changes to `protected` members (not present in these files).
  - No changes to any other files — these are the only two with `private` keyword usage.

## Implementation

### 1. `ts/store/storeManager.ts`

**Line 114:** Change `private static instance: StoreManager | null = null;` to `static #instance: StoreManager | null = null;`

**Line 115:** Change `private static initPromise: Promise<StoreManager> | null = null;` to `static #initPromise: Promise<StoreManager> | null = null;`

**Line 128:** Keep `private constructor()` as-is. Add a comment like `// Note: constructor intentionally uses `private`— ES2022`#` is not supported on constructors.`

**Line 131-137:** Change `static async init(): Promise<StoreManager> {` to remain public, but update the references:

```diff
-   if (this.instance) return this.instance;
-   if (this.initPromise) return this.initPromise;
-   this.initPromise = this.load();
-   return this.initPromise;
+   if (this.#instance) return this.#instance;
+   if (this.#initPromise) return this.#initPromise;
+   this.#initPromise = this.load();
+   return this.#initPromise;
```

Wait — `this.load()` calls the private `static async load()` method. Let me check: on line 139, `private static async load()` — this needs to become `static async #load()`.

**Line 139:** Change `private static async load(): Promise<StoreManager> {` to `static async #load(): Promise<StoreManager> {`

Then in `init()` (line 135): `this.#initPromise = this.#load();` — use `#load`.

Also check if `instance` and `initPromise` are referenced anywhere else in the class. Let's trace:

- `instance` is set on line 135-136 in the original? No, `instance` is set in `init()` after `load()` completes. Let me read the full method.

Actually, I need to see lines 130-165 to check all references. Let me check:

- `init()` (public, static, async): checks `this.instance`, `this.initPromise`, sets `this.initPromise = this.load()`, returns `this.initPromise`. After load, presumably `this.instance = result`.
- I should verify the exact structure. But the pattern is clear: change `this.instance` → `this.#instance`, `this.initPromise` → `this.#initPromise`, `this.load()` → `this.#load()`.

Also check if `instance` is used outside the class via `StoreManager.instance` — grep for this.

### No external references

Grep confirms zero external references to `StoreManager.instance`, `StoreManager.initPromise`, or `StoreManager.load` — conversion to `#` is safe.

### 2. `ts/neural-network/visualizer.ts`

Lines 101-108: Change all 5 `private static readonly` to `static #`:

```diff
- private static readonly NODE_RADIUS = 18;
+ static readonly #NODE_RADIUS = 18;
```

The constants are accessed within the class via `NetworkVisualizer.NODE_RADIUS` (lines 230, 231, 237, 373, 605, 634, 719). The class already uses `NetworkVisualizer.#pointSegmentDistance(...)` on line 722, confirming that `ClassName.#privateStaticMember` works in this project. Replace all 7 references with `NetworkVisualizer.#` equivalents.

No external references exist — confirmed by grep (zero `NetworkVisualizer.NODE_RADIUS` matches outside `visualizer.ts`).

## Brain / persistence considerations

None.

## Acceptance criteria

- `npm run fix:all` passes and `tsc --noEmit` compiles clean.
- `ts/store/storeManager.ts` has no `private` keyword usage (except on `constructor`). All static members use `#`.
- `ts/neural-network/visualizer.ts` has no `private` keyword usage. All static constants use `#`.
- If any external code referenced `StoreManager.instance` or `NetworkVisualizer.NODE_RADIUS`, appropriate public getters or `public static readonly` replacements are in place.
- Opening all 5 HTML entry points — the pages load without errors and all features work (store, training panels load; network visualizer renders without breaking).

## Docs to update

- `AGENTS.md` — no changes needed (the rule already says to use `#`).
