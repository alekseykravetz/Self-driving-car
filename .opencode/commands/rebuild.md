---
description: Wipe the generated js/ folder and recompile ts/ → js/ from scratch (fixes stale compiled files after renames/deletes)
agent: build
---

Run `npm run rebuild` from the project root. This deletes the entire `js/` directory and recompiles every `ts/` file via `tsc`, so any orphaned `.js` files left over from renamed or deleted source files are removed.

Report:
1. Whether `npm run clean` succeeded (the `js/` folder was removed).
2. Whether `tsc` succeeded and how many files it emitted (run `ls js | wc -l` or equivalent if useful).
3. Any TypeScript compile errors.

Use this whenever big refactors leave stale `.js` files behind, or before running tests/visual checks after large structural changes.
