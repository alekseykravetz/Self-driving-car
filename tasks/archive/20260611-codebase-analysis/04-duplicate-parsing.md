# Task 04 — Extract shared JSON/legacy parser

**Effort:** medium · **Status:** done

## Problem

JSON-vs-legacy normalization logic is duplicated across three places:

- `ts/world-loader/worldLoader.ts` (pure JSON **and** legacy `World.load({...})`)
- `ts/car-loader/carLoader.ts` (pure JSON **and** legacy `let carInfo = {...}`)
- `ts/store/storeManager.ts`

Each maintains its own copy of the parse/normalize code — a prime DRY violation.

## Goal

Extract a single shared parser/normalizer and have all three call sites use it.

## Steps

1. Read the three files and identify the exact shared logic (format detection,
   legacy-wrapper stripping, JSON parse).
2. Create a shared helper (e.g. in `ts/store/` or `ts/utils.ts`) such as:
   - `parseWorldInput(text: string): World`
   - `parseCarInput(text: string): CarInfo`
     (or one generic normalizer if the shapes allow).
3. Replace the duplicated logic in each call site with calls to the helper.
4. Ensure error handling is consistent (see Task 05).
5. Manually test loading: a pure-JSON world, a legacy `.world`, a pure-JSON car,
   and a legacy `.car`.

## Acceptance criteria

- One source of truth for JSON/legacy parsing.
- `WorldLoader`, `CarLoader`, and `StoreManager` all delegate to it.
- All four format variants still load correctly.

## Notes

- Remember: classes are runtime globals loaded via ordered `<script>` tags — place the
  helper so its `<script>` loads before its consumers.
