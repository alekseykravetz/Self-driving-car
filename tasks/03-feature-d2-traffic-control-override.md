# Feature D2: Traffic Control Override

**Priority:** 3 | **Effort:** Small | **Impact:** Low-Medium | **Risk:** None

## Core Concept

Users click a traffic light to toggle its state manually in the world editor and traffic simulator. A "force all lights green" hotkey triggers a grid-wide green wave for experimentation.

## Target Files

- `ts/world/trafficManager.ts` — add override methods
- `ts/world/editors/lightEditor.ts` — click detection on lights
- `ts/simulator/traffic/trafficSimulator.ts` — 'G' hotkey
- `ts/world/markings/light.ts` — add `overridden` field
- `ts/panels/shortcutsToolbar.ts` — document hotkey

## Implementation Steps

### 1. Add override API to `Light`

In `ts/world/markings/light.ts`:

```ts
class Light {
  // ... existing fields
  #overridden: boolean = false;

  get overridden(): boolean;
  override(state: LightState): void;
  releaseOverride(): void;
}
```

When `overridden` is true, `update()` (or the TrafficManager's cycle logic) skips automatic state transitions for that light.

### 2. Add override methods to `TrafficManager`

In `ts/world/trafficManager.ts`:

```ts
class TrafficManager {
  // ... existing fields and methods

  overrideLight(light: Light, state: LightState): void {
    light.override(state);
  }

  releaseOverride(light: Light): void {
    light.releaseOverride();
  }

  releaseAllOverrides(): void {
    // iterate managed lights and release each
  }
}
```

Modify `TrafficManager.update()` (or the per-light cycle loop):

```ts
update(): void {
  for (const light of this.#lights) {
    if (light.overridden) continue;  // skip automatic cycling
    // ... existing state machine logic
  }
}
```

### 3. Click interaction in World Editor

In `ts/world/editors/lightEditor.ts` (or the relevant editor file):

- Add click detection: when user clicks on the canvas, check if click position falls within any placed light's polygon.
- Clicking a placed light cycles its state: `off → green → yellow → red → off`.
- On each click, call `trafficManager.overrideLight(light, newState)`.
- Show a visual indicator when a light is overridden (e.g., a slightly brighter glow or a "MANUAL" badge).

### 4. Global green wave hotkey

In `ts/simulator/traffic/trafficSimulator.ts`:

- Add keyboard handler for 'G' key.
- First press: iterate all `world.markings` that are `Light` instances and call `trafficManager.overrideLight(light, 'green')`.
- Second press: call `trafficManager.releaseAllOverrides()` to restore normal cycling.
- Toggle state tracked in a `#globalGreenWave: boolean` field.

### 5. Shortcuts toolbar

In `ts/panels/shortcutsToolbar.ts` (or the relevant shortcuts display):

Add entry: `G — Toggle global green wave for all traffic lights`

### 6. Rendering

No rendering changes required. `Light.draw()` already displays the current state. Optional UX polish: draw overridden lights with a brighter glow or "MANUAL" indicator.

### 7. Persistence

Ephemeral — override states are not saved with the world. This simplifies the implementation and avoids schema changes. Future extension note: persist `Light.overridden` + `state` in world file if needed.

## Performance Safeguards

- One scan of the markings array for lights (O(markings), typically <200).
- A simple boolean check per light in `TrafficManager.update()`.
- Negligible overhead — no per-frame allocation or loops.

## Acceptance Criteria

- [ ] Clicking a placed light in world editor cycles its state
- [ ] Overridden lights stay at their set state (automatic cycling pauses)
- [ ] Pressing 'G' forces all lights green
- [ ] Pressing 'G' again restores normal cycling for all lights
- [ ] Shortcut shown in the shortcuts toolbar
- [ ] World editor tooltip or visual cue indicates overridden lights
- [ ] No performance impact when no lights are overridden

## References

- `TrafficManager` in `ts/world/trafficManager.ts`
- `Light` class in `ts/world/markings/light.ts`
- World editor handlers in `ts/world/editors/`
- Shortcuts toolbar in `ts/panels/shortcutsToolbar.ts`
