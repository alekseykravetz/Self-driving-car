# Improvement Tasks

Task list derived from `codebase-analysis-report.md` (§9 Anti-Patterns, §11 Quick Wins).
Work top-to-bottom: low-effort wins first, then medium, then high.

| #   | Task                                                           | Effort | Status |
| --- | -------------------------------------------------------------- | ------ | ------ |
| 01  | [Fix Prettier quote-style drift](./01-prettier-quote-style.md) | low    | done   |
| 02  | [Remove orphaned compiled JS](./02-orphaned-js.md)             | low    | done   |
| 03  | [Clean stale ESLint allowlist](./03-eslint-allowlist.md)       | low    | done   |
| 04  | [Extract shared JSON/legacy parser](./04-duplicate-parsing.md) | medium | done   |
| 05  | [Standardize error handling](./05-error-handling.md)           | medium | done   |
| 06  | [Migrate legacy save formats](./06-legacy-formats.md)          | medium | done   |
| 07  | [Split god classes](./07-god-classes.md)                       | high   | done   |

## How to use

1. Pick the next `todo` task.
2. Open its file and follow the steps.
3. Update the **Status** column here when done (`todo` → `in-progress` → `done`).
