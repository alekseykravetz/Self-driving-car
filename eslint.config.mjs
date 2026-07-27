import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default defineConfig([
  {
    ignores: ['js/**', 'storybook-static/**'],
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: { project: null },
      globals: { ...globals.node },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': ts,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.ts', 'vitest.config.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: { project: null },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': ts,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['tests/visual/**/*.spec.ts'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: { project: null },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': ts,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['stories/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: { project: null },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': ts,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'tests/**/*.ts',
      'vitest.config.ts',
      'stories/**/*.ts',
      '.storybook/**/*.ts',
    ],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: { ...globals.browser },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      '@typescript-eslint': ts,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-redeclare': ['error', { builtinGlobals: false }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Layer-1 purity: math/primitives/graph/osm-importer must stay pure and
    // must never import "upward" into higher-layer domains. Enforced here so
    // the architectural invariant is caught by CI/lint, not review alone.
    files: ['ts/math/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/car/**',
                '**/world/**',
                '**/rendering/**',
                '**/neural-network/**',
                '**/simulator/**',
                '**/ui/**',
                '**/store/**',
                '**/race/**',
                '**/traffic/**',
                '**/viewport/**',
                '**/camera/**',
                '**/audio/**',
                '**/mini-map/**',
                '**/input/**',
              ],
              message:
                'Layer-1 purity: ts/math/** must not import from higher layers (car, world, rendering, neural-network, simulator, ui, store, race, traffic, viewport, camera, audio, mini-map, input). Define local types instead (see heatmapGrid.ts VehiclePosition).',
            },
          ],
        },
      ],
    },
  },
]);
