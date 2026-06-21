# Task 01 — Fix Prettier quote-style drift

**Effort:** low · **Priority:** high (most actionable finding) · **Status:** done

## Problem

There is no Prettier config file, so Prettier 3.5.3 defaults to `singleQuote: false`.
`eslint-plugin-prettier` enforces this as `prettier/prettier: "error"`, so the codebase is
consistently **double-quoted** (~1,067 double-quoted strings across 50 files) — the opposite
of the agreed `singleQuote: true` standard.

## Goal

Configure Prettier with `singleQuote: true` and reformat the whole codebase to match.

## Steps

1. Create `.prettierrc` (or `prettier.config.mjs`) at the repo root:
   ```json
   {
     "singleQuote": true
   }
   ```
2. Run `npm run fix:all` (`prettier --write .` then `eslint --fix`).
3. Confirm ESLint passes with no `prettier/prettier` errors.
4. Review the diff — it should be quotes-only, no logic changes.

## Acceptance criteria

- `.prettierrc` exists with `singleQuote: true`.
- `npm run lint` reports zero `prettier/prettier` errors.
- New code defaults to single quotes.

## Notes

- This is a large but mechanical diff; commit it on its own so review is trivial.
- Keep `singleQuote: true` even if migration templates suggest otherwise (user preference).
