# Task 05 — Standardize error handling

**Effort:** medium · **Status:** done

## Problem

Error handling is inconsistent. `StoreManager.init` throws on bad fetch responses, but the
loaders and direct `localStorage.getItem(...)` + `JSON.parse(...)` reads frequently have no
error path — they either return `null` silently or parse unguarded. Only 15 `try` blocks
exist across the whole source.

## Goal

Introduce a consistent safe-parse / safe-read helper and apply it to the unguarded reads.

## Steps

1. Add a safe-parse helper to `ts/utils.ts`, e.g.:
   ```ts
   function safeJsonParse<T>(raw: string | null): T | null {
     if (raw == null) return null;
     try {
       return JSON.parse(raw) as T;
     } catch {
       return null;
     }
   }
   ```
2. Find unguarded reads (the `bestPool` and `world` keys especially) in:
   - `ts/ai-training/storageManager.ts`, `simulator.ts`, `trainingManagerPanel.ts`
   - `ts/games/race.ts`
   - `ts/world-editor/editors/worldEditor.ts`
3. Replace bare `JSON.parse(localStorage.getItem(...))` with the helper.
4. Decide and document the failure policy (silent `null` vs. user-facing message) and apply
   it consistently.

## Acceptance criteria

- A single safe-parse helper exists and is reused.
- No bare `JSON.parse(localStorage.getItem(...))` left in the listed files.
- Corrupt/missing localStorage values no longer throw uncaught errors.

## Notes

- Pair this with Task 04 so the shared parser also uses the safe-parse helper.
