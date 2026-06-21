# Task 02 — Remove orphaned compiled JS

**Effort:** low · **Status:** done

## Problem

`js/` is generated from `ts/` by `tsc`, but two compiled files have no TypeScript source:

- `js/camera_new_ai_ver.js`
- `js/shared/sharedInit.js` (the `ts/shared/` folder is empty — its `.ts` source was removed,
  leaving stale output)

## Goal

Eliminate the drift so every `js/` file maps to a `ts/` source.

## Steps

1. Confirm neither orphan is referenced by any HTML `<script>` tag or imported anywhere:
   - Search `html/` and `index.html` for `camera_new_ai_ver` and `sharedInit`.
2. For each orphan, decide:
   - **Dead** → delete the `.js` file.
   - **Still needed** → restore the corresponding `.ts` source under `ts/` so it recompiles.
3. If `ts/shared/` is meant to stay empty, remove it; otherwise restore its source.
4. Run `tsc` and verify `js/` is regenerated cleanly with no leftovers.

## Acceptance criteria

- No `js/` file lacks a matching `ts/` source.
- No HTML page references a deleted file.
- `tsc` build is clean.

## Notes

- Verify the `js/` files are not in-progress work before deleting (check git status).
