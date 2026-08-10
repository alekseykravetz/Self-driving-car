# Type-Safety Hardening — Remove Unsafe Casts

**Date:** 2026-08-10
**Slug:** type-safety-hardening
**Entry points affected:** none (internal), but touches audio + input + world
**Save-file impact:** none
**Backward compat:** preserved — runtime behavior identical, only types change.

**Audience:** an AI coding agent with **zero prior context** — everything
needed is in this file.

---

## Goal

There are ~20 unsafe casts (`as any`, `as unknown as X`, `window as any`) in
`ts/`. Each bypasses the type checker. Replace them with proper feature
detection, type guards, or narrow typed interfaces so the compiler protects the
code. Runtime behavior must not change.

Find them all first:

```
grep -rn "as unknown as\|as any\b\|: any\b\|<any>\|@ts-ignore" ts --include="*.ts" | grep -v "\.test\."
```

---

## Known offenders (verify against grep output; fix all, not just these)

### 1. WebKit audio context — `window as any`

- [ts/audio/sound.ts](ts/audio/sound.ts) (~3 casts): `(window as any).webkitAudioContext`.
  Replace with a typed feature-detection shim:
  ```ts
  interface WebkitWindow extends Window {
    webkitAudioContext?: typeof AudioContext;
  }
  const Ctx =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  ```
  (A single narrow interface instead of `any` — still no runtime change.)

### 2. Synthetic touch→mouse event bridge

- [ts/world/editors/editorPointerInput.ts](ts/world/editors/editorPointerInput.ts)
  (~line 45) `as unknown as MouseEvent`. The synthetic object only needs the
  fields the editors read (`offsetX`, `offsetY`, `button`, maybe
  `preventDefault`). Define a `SyntheticMouseEvent` type with exactly those
  fields and have the editor handlers accept `MouseEvent | SyntheticMouseEvent`
  (or a shared minimal interface). Avoid the double-cast.

### 3. Legacy-shape property access without guards

- [ts/world/world.ts](ts/world/world.ts) and
  [ts/simulator/training/trainingSimulator.ts](ts/simulator/training/trainingSimulator.ts):
  `as unknown as { decoration?: ... }` reading legacy save fields. Replace with
  a small typed `LegacyWorldInfo`/`LegacyDecoration` interface and a runtime
  `in`/`typeof` guard before access.
- [ts/camera/camera.ts](ts/camera/camera.ts): `as unknown as { state?: string }`
  reading a light's state. There is a real `Light` type — narrow to it (or add
  a typed accessor) instead of an inline anonymous cast.

### 4. Fullscreen API (race)

- [ts/race/entry.ts](ts/race/entry.ts) (~line 124) vendor fullscreen cast:
  define a typed vendor-prefixed interface (`webkitRequestFullscreen?`, etc.)
  rather than `as any`.

### 5. Opaque `Brain` type

- [ts/car/brain/carBrainAdapter.ts](ts/car/brain/carBrainAdapter.ts):
  `export type Brain = unknown` is intentional per architecture (Car stays
  decoupled from NeuralNetwork). **Do NOT change this one** — it is a
  deliberate design decision documented in AGENTS.md. The `as NeuralNetwork`
  casts at the adapter boundary are the sanctioned bridge. Leave as-is.

---

## Constraints

- No runtime behavior change. If a cast guards a real optional (vendor-prefixed
  API), keep the optional-chaining fallback intact.
- Do not introduce `any` to fix `any`.
- Respect the documented exceptions (the `Brain = unknown` opaque type).

---

## Acceptance criteria

- `npm run rebuild` compiles cleanly with no new `any`/`as unknown as` in the
  touched files (except the sanctioned `Brain` boundary).
- `grep` count of unsafe casts drops meaningfully (target: audio, editor input,
  world/camera legacy reads, race fullscreen all cleaned).
- `npm run fix:all` and `npm test` pass.
- `npm run test:visual` passes with no baseline changes.
