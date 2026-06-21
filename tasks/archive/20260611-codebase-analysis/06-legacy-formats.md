# Task 06 — Migrate legacy save formats

**Effort:** medium · **Status:** done

## Problem

Two file formats are still supported in parallel: pure JSON (in `store/`) and the legacy
wrapper format (`World.load({...})` / `let carInfo = {...}`, in `saves/`). Supporting both
keeps duplicate parse paths alive and complicates the loaders.

## Goal

Migrate all legacy `saves/` assets to pure JSON, then drop legacy-wrapper support.

## Steps

1. Inventory `saves/` files still in the legacy wrapper format (`.world`, `.car`, brain blobs).
2. Convert each to pure JSON (write a one-off script or load+re-save via the editor).
3. Move/confirm the converted assets live under `store/` and are listed in
   `store/manifest.json`.
4. Once nothing depends on the wrapper format, remove the legacy parse branch from
   `WorldLoader`, `CarLoader`, and the shared parser from Task 04.
5. Test that every world/car in the manifest still loads.

## Acceptance criteria

- No asset relies on the legacy wrapper format.
- Loaders no longer contain legacy-format branches.
- All store assets load from pure JSON.

## Notes

- Do this **after** Task 04 (shared parser) so there's one place to remove the legacy branch.
- Keep backups of `saves/` before converting (do not delete originals until verified).
