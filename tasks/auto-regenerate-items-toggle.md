# Task — Auto-Regenerate Items Toggle in World Editor

**Effort:** medium · **Priority:** high · **Status:** pending

> Restore the on-the-fly buildings/trees regeneration toggle that was removed in July 2026
> (commit `d62ba2b`) due to performance issues. The world editor is now fast enough on large
> maps, so the toggle can be re-enabled.

---

## Background

The original world editor had a **"Generate" checkbox** that, when checked, regenerated buildings
and trees **synchronously inside the animation loop** on every graph edit. This was removed in the
"World Layers" refactor (task `20260701-world-layers`) because the O(n²) building collision filter
and tree rejection sampling froze the editor on large worlds.

Since then:

- Road geometry regeneration was split out as **cheap** (envelopes, borders, lane guides, separator
  borders) and still runs every frame on graph change.
- Building/tree placement was split out as **expensive** and moved to a manual "Regenerate items"
  button (♻️) on the `<world-layers-toolbar>`. When the graph changes, the button glows orange
  (`.stale`) to signal that items are out of date.
- A `setTimeout(0)` in `regenerateItems()` yields to the renderer so the busy state CSS paints
  before the synchronous generation work.

Now the editor handles large maps well, so we can bring back the auto-regenerate toggle.

---

## What changes

### 1. `<world-layers-toolbar>` — Button becomes a toggle

**File:** `ts/panels/worldLayersToolbar.ts`

| Change                                                                                              | Detail                                                                 |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Replace `#onRegenerate` callback with `#onAutoRegen: ((on: boolean) => void) \| null`               | Toggle carries a boolean state                                         |
| Replace `setRegenerateListener()` → `setAutoRegenListener(cb)`                                      | Callback receives `true` when toggled ON, `false` when OFF             |
| Button click toggles an `#autoRegen: boolean = false` flag, calls `#onAutoRegen` with the new state | Each click flips the state                                             |
| Save the `#autoRegen` field                                                                         | Used by `setStale()` to suppress stale indicator when auto-regen is on |
| Button gets `.active` class when ON (same as layer toggles)                                         | Visual feedback                                                        |
| `setStale(stale)` ignores stale when `#autoRegen === true`                                          | No orange glow when items are being auto-regenerated                   |
| `setBusy()` unchanged                                                                               | Still flashes busy on initial regeneration if needed                   |
| `#syncButtons()` applies `.active` class to the regenerate button when `#autoRegen` is true         | Called from `setAutoRegen()` and `#render()`                           |

**API surface (replace):**

```
setRegenerateListener(cb: () => void)          // REMOVE
setAutoRegenListener(cb: (on: boolean) => void) // ADD
```

**New private field:**

```
#autoRegen: boolean = false
```

**New public method (optional but clean):**

```
setAutoRegen(on: boolean): void   // set state from outside + sync button
```

---

### 2. `WorldEditor` — Wire toggle into the draw loop

**File:** `ts/world/editors/worldEditor.ts`

#### 2a. New field

```typescript
#autoRegen: boolean = false;
```

#### 2b. Change callback registration (in `#addEventListeners`, line ~287)

```typescript
// OLD:
this.#worldLayersToolbar.setRegenerateListener(() => this.regenerateItems());

// NEW:
this.#worldLayersToolbar.setAutoRegenListener((on) => {
  this.#autoRegen = on;
  if (on) this.regenerateItems();
});
```

When toggled ON, immediately regenerate to catch up any stale items.

#### 2c. Modify the `draw()` loop (lines 500–510)

```typescript
// CURRENT (lines 500-510):
const currentGraphHash = this.#world.graph.hash();
if (currentGraphHash !== this.#oldGraphHash) {
  WorldGenerator.generateRoads(this.#world);
  WorldGenerator.reanchorMarkings(this.#world);
  this.#oldGraphHash = currentGraphHash;
  if (this.#world.buildings.length || this.#world.trees.length) {
    this.#worldLayersToolbar?.setStale(true);
  }
}

// NEW:
const currentGraphHash = this.#world.graph.hash();
if (currentGraphHash !== this.#oldGraphHash) {
  WorldGenerator.generateRoads(this.#world);
  WorldGenerator.reanchorMarkings(this.#world);
  this.#oldGraphHash = currentGraphHash;
  if (this.#autoRegen) {
    this.#world.generate({ roads: false, buildings: true, trees: true });
  } else if (this.#world.buildings.length || this.#world.trees.length) {
    this.#worldLayersToolbar?.setStale(true);
  }
}
```

Key behavior:

- When auto-regen is ON: buildings and trees are regenerated synchronously in the draw loop,
  only when the graph hash actually changes (not every frame). No stale indicator.
- When auto-regen is OFF: identical to current behavior (roads only, mark stale).

`WorldGenerator.generateRoads()` is called first, then `generate({roads: false, buildings: true, trees: true})`.
This is redundant with the full `generate()` call but keeps the intent clear — roads are cheap and
already done, only the expensive parts are added. An alternative would be to call
`world.generate()` (which defaults to all three) and skip the explicit `generateRoads()` call,
but that would break the clean split in the `draw()` method. Keep the current structure.

**Note:** The synchronous call inside `draw()` is fine now because:

- Building/tree generation only runs when the graph hash changes, not every frame.
- Performance was the only reason it was removed, and that's been resolved.

#### 2d. `regenerateItems()` stays as-is (lines 484–493)

It's still called once when the user toggles auto-regen ON (step 2b), to catch up stale items
with a brief busy indicator flash.

---

### 3. CSS — Toggle visual style for the regenerate button

**File:** `styles/world/styles.css`

No new CSS rules needed. The existing `.toolbar-btn.active` rule already handles the active state
(same class used by layer visibility toggles). The existing `.stale` and `.busy` rules stay
unchanged. The `.busy` class is applied by `setBusy()` during the initial regeneration when
toggling ON; `.stale` is suppressed by `setStale()` when `#autoRegen` is true.

If the `#regenerateItemsBtn` is not already covered by the `.toolbar-btn.active` selector,
add a specific rule:

```css
#worldLayersToolbar #regenerateItemsBtn.active {
  background: #4a90d9;
  color: white;
}
```

(Verify whether `.toolbar-btn.active` already covers it; if so, no change needed.)

---

### 4. Edge cases

| Scenario                               | Behavior                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auto-regen ON, user edits graph        | Roads regenerate on the spot, then buildings+trees regenerate synchronously in the same frame (only when hash changes) |
| Auto-regen OFF, user edits graph       | Roads regenerate, items go stale (orange glow) — identical to current behavior                                         |
| Toggle ON while items are stale        | `regenerateItems()` fires immediately with busy indicator, then auto-regen takes over                                  |
| Toggle OFF while graph hasn't changed  | Items stay fresh; no state change                                                                                      |
| Toggle OFF after a graph edit while ON | Items are already fresh from the last auto-regen; stale never shows                                                    |
| Freshly loaded world                   | `setStale(false)` is called at init; all items are fresh. Auto-regen starts OFF                                        |
| Rapid graph edits with auto-regen ON   | Each hash change triggers one full regeneration; between frames with no hash change, nothing happens                   |
| Very large worlds (barnea, ir-hyain)   | Same O(n²) cost as manual regenerate, but only on hash change — acceptable                                             |

---

### 5. Files changed

| File                              | What                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `ts/panels/worldLayersToolbar.ts` | Toggle button logic, `#autoRegen` field, replace listener API |
| `ts/world/editors/worldEditor.ts` | `#autoRegen` field, draw loop conditional, callback wiring    |
| `styles/world/styles.css`         | (possibly) active state rule for `#regenerateItemsBtn`        |

No changes to `worldGenerator.ts`, `world.ts`, `world.html`, or serialization format.
Auto-regen is an editor-only UI preference and does not persist (same as layer visibility).

---

### 6. Implementation order

1. **`worldLayersToolbar.ts`** — Convert button to toggle, replace listener API, add `#autoRegen`, modify `setStale()` to suppress when ON.
2. **`worldEditor.ts`** — Add `#autoRegen` field, change callback registration, modify `draw()` loop.
3. **`styles/world/styles.css`** — Add `.active` rule if needed.
4. **Verify** — Run `npm run fix:all`, open `html/world.html`, test:
   - Toggle ON → edit graph → buildings/trees regenerate automatically
   - Toggle OFF → edit graph → orange stale glow appears
   - Toggle ON while stale → immediate regeneration → stale clears
   - Toggle OFF/ON with no graph edits → no unnecessary regeneration
   - Large worlds (barnea) — no visible frame drops
