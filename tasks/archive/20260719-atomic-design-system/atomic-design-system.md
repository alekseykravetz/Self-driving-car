# Atomic Design System

## Goal

Restructure the project's UI architecture following Atomic Design (Brad Frost methodology):

- **Atoms**: Smallest reusable building blocks (buttons, inputs, labels, badges, icons)
- **Molecules**: Simple groups of atoms functioning together (stat rows, toggle rows, button groups, asset pickers)
- **Organisms**: Complex UI sections composed of molecules/atoms (toolbar panels, training panel, modals, store panel)
- **Templates**: Page-level layouts (simulator layout, landing page, race layout, world editor layout)
- **Pages**: Specific page instances with real content (simulator.html, traffic.html, etc.)

Two workstreams: CSS restructure + TS file restructure.

## Phase 1 — CSS Design Tokens

### 1a. Create `styles/tokens.css`

CSS custom properties covering every color, spacing, font, radius, shadow, and transition used in the project.

```css
:root {
  /* ══════════════════════════════════════════════
     Colors
     ══════════════════════════════════════════════ */
  /* Backgrounds */
  --color-bg-app: #0f0f14;
  --color-bg-surface: rgba(15, 15, 20, 0.92);
  --color-bg-canvas: #2a5;
  --color-bg-overlay: rgba(0, 0, 0, 0.6);
  --color-bg-toolbar: rgba(0, 0, 0, 0.6);
  --color-bg-dark: #000;
  --color-bg-surface-raised: rgba(255, 255, 255, 0.04);
  --color-bg-hover: rgba(255, 255, 255, 0.08);
  --color-bg-active: rgba(255, 255, 255, 0.12);

  /* Text */
  --color-text-primary: #e8e8e8;
  --color-text-secondary: #888;
  --color-text-muted: rgba(255, 255, 255, 0.5);
  --color-text-dim: rgba(255, 255, 255, 0.4);
  --color-text-inverse: #000;

  /* Accent */
  --color-accent-green: #7ddf7d;
  --color-accent-green-strong: #5cb85c;
  --color-accent-red: #d9534f;
  --color-accent-yellow: #f0ad4e;
  --color-accent-blue: #5cb8ff;
  --color-accent-indigo: #6366f1;

  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.08);
  --color-border-default: rgba(255, 255, 255, 0.15);

  /* ══════════════════════════════════════════════
     Typography
     ══════════════════════════════════════════════ */
  --font-ui: Arial, sans-serif;
  --font-mono: 'Courier New', monospace;
  --font-display: 'Inter', sans-serif;

  --text-xs: 9px;
  --text-sm: 10px;
  --text-base: 11px;
  --text-md: 12px;
  --text-lg: 13px;
  --text-xl: 14px;
  --text-2xl: 16px;
  --text-3xl: 24px;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-extrabold: 800;

  --tracking-wide: 0.5px;
  --tracking-wider: 1px;

  /* ══════════════════════════════════════════════
     Spacing (4px base unit)
     ══════════════════════════════════════════════ */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* ══════════════════════════════════════════════
     Border Radius
     ══════════════════════════════════════════════ */
  --radius-sm: 3px;
  --radius-md: 5px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;

  /* ══════════════════════════════════════════════
     Shadows / Outlines
     ══════════════════════════════════════════════ */
  --shadow-sm: 0 0 3px rgba(92, 184, 92, 0.6);
  --shadow-md: 0 6px 18px rgba(0, 0, 0, 0.5);

  /* ══════════════════════════════════════════════
     Transitions
     ══════════════════════════════════════════════ */
  --transition-fast: 0.15s;
  --transition-normal: 0.2s;

  /* ══════════════════════════════════════════════
     Sizing
     ══════════════════════════════════════════════ */
  --size-btn-lg: 38px;
  --size-btn-sm: 32px;
  --size-btn-icon: 32px;
  --size-indicator: 32px;
}
```

### 1b. Replace all raw values across CSS with `var()` references

- Every hex color → `var(--color-*)`
- Every px value for spacing/padding/margin/gap → `var(--space-*)`
- Every font-size → `var(--text-*)`
- Every border-radius → `var(--radius-*)`
- Every font-family → `var(--font-*)`
- Every font-weight → `var(--weight-*)`
- Every transition duration → `var(--transition-*)`

## Phase 2 — Split CSS into atomic files

### 2a. Create directory structure

```
styles/
  index.css              — @import chain (tokens → atoms → molecules → organisms → templates → pages)
  tokens.css             — design tokens (from Phase 1)
  atoms/
    _base.css            — *, *::before, *::after, body, html resets, scrollbar
    _button.css          — .btn, .btn-lg, .btn-sm, .btn-primary, .btn-danger, .btn-danger-outline, .btn-warning-outline, .btn-success-outline, .race-panel-btn, .store-action-btn, .store-delete-btn, .store-export-btn, .file-input-label, .asset-load-btn
    _input.css           — input[type=number], input[type=text], input[type=file], input[type=checkbox], .num-btn
    _label.css           — .ctrl-label, .section-title, .controls-group-label, .ctrl-label.secondary, .view-toggle-label, .store-panel-title, .ti-title, .ti-subtitle, .ti-section-title
    _badge.css           — .status-dot, .status-dot.green, .status-dot.red, .status-dot.orange, .cfg-chip, .cfg-chip-emoji, .cfg-chip-value, .store-tab-count, .store-source, .store-marker
    _key-indicator.css   — .key-indicator, .key-indicator.active, .key-indicator.flash, .key-indicator.clickable, .key-indicator[data-tooltip]:hover::after
    _toolbar-btn.css     — .toolbar-btn, .toolbar-btn:hover, .toolbar-btn.active, .toolbar-btn:disabled, .toolbar-btn[data-tooltip]:hover::after
  molecules/
    _stat-row.css        — .stat-row, .stat-row-toggle, .stat-row-toggle.disabled, .stat-emoji, .stat-label, .stat-value, .stat-row-double
    _toggle-row.css      — .toggle-row, .ctrl-checkbox, .ctrl-checkbox label, .ht-checkbox-label
    _num-input-row.css   — .num-input-row, .num-input-row-sm, .num-btn, .idle-range-wrap
    _btn-group.css       — .btn-group, .btn-group-large, .btn-row, .btn-row > *
    _param-grid.css      — .param-grid, .car-config-grid, .car-config-grid .ctrl-wide, .ti-param-grid
    _controls-group.css  — .controls-group, .controls-group-label, .controls-separator, .border-mode-group, .time-display-group, .fps-display, .elapsed-time, .reset-time-btn
    _asset-picker.css    — .asset-picker, .asset-popover, .asset-popover[hidden], .asset-load-btn, .asset-list, .asset-item, .asset-item-name, .asset-item-src, .asset-empty
    _collapsible.css     — .section-title-toggle, .collapse-caret, .car-config-section, .car-config-summary
    _view-toggles.css    — .view-toggles, .view-toggle-label, .view-toggle-label input[type=checkbox], .view-toggles checkbox
    _shortcuts-keys.css  — .shortcuts-keys
    _world-layers-keys.css — .world-layers-keys
  organisms/
    _toolbar-panel.css   — .toolbar-panel, #simulatorToolbar, #topControls, #layoutToolbar, #animationLoopToolbar, #racePanel, #shortcutsToolbar, #worldLayersToolbar, #shortcutsToolbar .shortcuts-groups, #worldLayersToolbar .world-layers-groups
    _modals.css          — training-init-modal, human-training-config-modal, .ti-overlay, .ti-dialog, .ti-header, .ti-section, .ti-source-list, .ti-source, .ti-source.disabled, .ti-source-text, .ti-source-name, .ti-source-desc, .ti-config-note
    _training-panel.css  — #trainingManagerPanel, #statsPanel, .panel-section, .pool-table and all pool-table sub-rules, .ctrl, training-panel, human-training-panel
    _traffic-panel.css   — #trafficStatsPanel, .traffic-count, .traffic-empty, .traffic-cars-list, .traffic-car-row, .traffic-car-row.selected, .traffic-car-row.crashed, .traffic-car-head, .traffic-car-swatch, .traffic-car-name, .traffic-car-status, .traffic-car-remove, .traffic-car-metrics, .traffic-car-config
    _store-panel.css     — store-panel (all store-* classes, .store-table, .store-tabs, .store-tab, .store-row-active, .store-empty, .store-actions)
    _human-training.css  — .ht-key, .ht-key.match, .ht-key.mismatch, .ht-key.idle, .ht-key-grid, .ht-key-cell, .ht-key-pct, .ht-weight-dot, .ht-weight-dot.pulse, .ht-brain-inspector, .ht-brain-layer, .ht-brain-layer-title, .ht-brain-row, .ht-brain-label, .ht-brain-weights, .ht-brain-weight-row, .ht-brain-val, .ht-brain-val.pos, .ht-brain-val.neg, #htAccuracyPct, .ht-howto, .ht-banner, .ht-learning-state, .ht-learning-state.learning, .ht-learning-state.paused, .ht-hint, .ht-info-row, .ht-info-label, .ht-info-value, .ht-slider-label, .ht-slider-row, .ht-status
    _world-layers.css    — #worldLayersToolbar .layer-toggle, #regenerateItemsBtn.stale, #regenerateItemsBtn.busy, @keyframes worldLayersPulse
  templates/
    _simulator-layout.css — #simulatorLayout, #simulatorLayout canvas, #rightPanel, #rightPanel.hidden, #gameCanvas, #networkCanvas, #miniMapCanvas, #miniMapCanvas.floating, #cameraCanvas, #topControls .file-input-label
    _landing-page.css    — .landing-header, .landing-title, .landing-logo, .landing-header h1, .landing-header .subtitle, .landing-sections, .landing-card, .landing-card:hover, .card-icon, .landing-card h2, .card-desc, .card-links, .card-btn, .card-btn:hover, .card-btn .btn-icon, .card-btn span, .card-btn strong, .card-btn small
    _race-layout.css     — #racePanel, .race-panel-btn, .miniMap, #statistics, .stat, #counter, #ironManCanvas
    _world-editor.css    — from styles/world/styles.css: editor-toolbar, #myCanvas, #controls, .editor-mode-btn, .group-title, .checkbox-label, .controls-divider, #osmPanel, body world-editor styles
  pages/
    _mobile.css          — all @media (max-width: 768px) rules consolidated
    _world.css           — world-specific overrides that don't fit elsewhere (e.g., different body background)
```

### 2b. Create `styles/index.css`

```css
/* ══════════════════════════════════════════════
   Atomic Design System — Entry Point
   ══════════════════════════════════════════════ */

/* Design tokens (must be first) */
@import './tokens.css';

/* Atoms */
@import './atoms/_base.css';
@import './atoms/_button.css';
@import './atoms/_input.css';
@import './atoms/_label.css';
@import './atoms/_badge.css';
@import './atoms/_key-indicator.css';
@import './atoms/_toolbar-btn.css';

/* Molecules */
@import './molecules/_stat-row.css';
@import './molecules/_toggle-row.css';
@import './molecules/_num-input-row.css';
@import './molecules/_btn-group.css';
@import './molecules/_param-grid.css';
@import './molecules/_controls-group.css';
@import './molecules/_asset-picker.css';
@import './molecules/_collapsible.css';
@import './molecules/_view-toggles.css';
@import './molecules/_shortcuts-keys.css';
@import './molecules/_world-layers-keys.css';

/* Organisms */
@import './organisms/_toolbar-panel.css';
@import './organisms/_modals.css';
@import './organisms/_training-panel.css';
@import './organisms/_traffic-panel.css';
@import './organisms/_store-panel.css';
@import './organisms/_human-training.css';
@import './organisms/_world-layers.css';

/* Templates */
@import './templates/_simulator-layout.css';
@import './templates/_landing-page.css';
@import './templates/_race-layout.css';
@import './templates/_world-editor.css';

/* Pages */
@import './pages/_mobile.css';
@import './pages/_world.css';
```

### 2c. Update all HTML pages

Replace `<link rel="stylesheet" href="/styles/style.css">` with:

```html
<link rel="stylesheet" href="/styles/index.css" />
```

And for world.html, also remove the separate world/styles.css link (now merged).

### 2d. Delete old CSS files

- `styles/style.css` — fully replaced by atomic files
- `styles/world/styles.css` — fully absorbed into templates/\_world-editor.css + pages/\_world.css

## Phase 3 — Move TS files to atomic subdirectories

### 3a. Create directory structure

```
ts/
  ui/
    atoms/
      keyboardManager.ts   (from ts/panels/keyboardManager.ts)
      latchedToggle.ts      (from ts/panels/latchedToggle.ts)
    molecules/
      shortcutsToolbar.ts   (from ts/panels/shortcutsToolbar.ts)
      shortcutsToolbarTemplate.ts (from ts/panels/templates/shortcutsToolbarTemplate.ts)
      worldLayersToolbar.ts (from ts/panels/worldLayersToolbar.ts)
      worldLayersToolbarTemplate.ts (from ts/panels/templates/worldLayersToolbarTemplate.ts)
      worldToolbar.ts       (from ts/panels/worldToolbar.ts)
      worldToolbarTemplate.ts (from ts/panels/templates/worldToolbarTemplate.ts)
      editorToolbar.ts      (from ts/panels/editorToolbar.ts)
      editorToolbarTemplate.ts (from ts/panels/templates/editorToolbarTemplate.ts)
      layoutToolbar.ts      (from ts/simulator/panels/layoutToolbar.ts)
      layoutToolbarTemplate.ts (from ts/simulator/panels/templates/layoutToolbarTemplate.ts)
      animationLoopToolbar.ts (from ts/simulator/panels/animationLoopToolbar.ts)
      animationLoopToolbarTemplate.ts (from ts/simulator/panels/templates/animationLoopToolbarTemplate.ts)
      assetSelectors.ts     (from ts/panels/assetSelectors.ts)
      modeControls.ts       (from ts/panels/modeControls.ts)
    organisms/
      trainingPanel.ts      (from ts/simulator/training/trainingPanel.ts)
      trainingPanelTemplate.ts (from ts/simulator/training/templates/trainingPanelTemplate.ts)
      trainingInitModal.ts  (from ts/simulator/training/trainingInitModal.ts)
      trainingInitModalTemplate.ts (from ts/simulator/training/templates/trainingInitModalTemplate.ts)
      humanTrainingPanel.ts (from ts/simulator/humanTraining/humanTrainingPanel.ts)
      humanTrainingPanelTemplate.ts (from ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts)
      humanTrainingConfigModal.ts (from ts/simulator/humanTraining/humanTrainingConfigModal.ts)
      humanTrainingConfigModalTemplate.ts (from ts/simulator/humanTraining/templates/humanTrainingConfigModalTemplate.ts)
      trafficPanel.ts       (from ts/simulator/traffic/trafficPanel.ts)
      trafficPanelTemplate.ts (from ts/simulator/traffic/templates/trafficPanelTemplate.ts)
      storePanel.ts         (from ts/store/storePanel.ts)
      storePanelTemplate.ts (from ts/store/templates/storePanelTemplate.ts)
```

### 3b. Update all import paths

Every file that imports from the old paths must be updated. Here is the full consumer map:

| Old file                                                 | Imported by                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts/panels/keyboardManager.ts`                           | `ts/world/editors/corridorEditor.ts`, `ts/world/editors/graphEditor.ts`, `ts/world/editors/worldEditor.ts`, `ts/simulator/training/trainingSimulator.ts`, `ts/simulator/training/trainingInitModal.ts`, `ts/simulator/humanTraining/humanBackpropSimulator.ts`, `ts/simulator/humanTraining/humanTrainingConfigModal.ts`, `ts/simulator/traffic/trafficSimulator.ts` |
| `ts/panels/worldToolbar.ts`                              | `ts/simulator/views/simulatorPageHost.ts`, `ts/simulator/racing/racePanel.ts`, `ts/world/editors/worldEditor.ts`, `ts/simulator/core/simulatorShell.ts`                                                                                                                                                                                                              |
| `ts/panels/worldLayersToolbar.ts`                        | `ts/simulator/views/simulatorPageHost.ts`, `ts/world/editors/worldEditor.ts`, `ts/simulator/core/simulatorShell.ts`                                                                                                                                                                                                                                                  |
| `ts/panels/shortcutsToolbar.ts`                          | `ts/world/editors/worldEditor.ts`, `ts/simulator/training/trainingSimulator.ts`, `ts/simulator/humanTraining/humanBackpropSimulator.ts`, `ts/simulator/traffic/trafficSimulator.ts`                                                                                                                                                                                  |
| `ts/panels/editorToolbar.ts`                             | `ts/world/editors/worldEditor.ts`                                                                                                                                                                                                                                                                                                                                    |
| `ts/panels/assetSelectors.ts`                            | Imported in `ts/simulator/entry.ts` (side-effect import)                                                                                                                                                                                                                                                                                                             |
| `ts/panels/modeControls.ts`                              | `ts/simulator/racing/racePanel.ts`, `ts/simulator/traffic/trafficSimulator.ts`, imported in `ts/simulator/entry.ts`                                                                                                                                                                                                                                                  |
| `ts/simulator/panels/layoutToolbar.ts`                   | `ts/simulator/views/simulatorPageHost.ts`, `ts/simulator/core/simulatorShell.ts`, `ts/simulator/rendering/layoutManager.ts`                                                                                                                                                                                                                                          |
| `ts/simulator/panels/animationLoopToolbar.ts`            | `ts/simulator/views/simulatorPageHost.ts`, `ts/simulator/core/simulatorShell.ts`                                                                                                                                                                                                                                                                                     |
| `ts/simulator/training/trainingPanel.ts`                 | `ts/simulator/training/trainingSimulator.ts`, imported in `ts/simulator/entry.ts`                                                                                                                                                                                                                                                                                    |
| `ts/simulator/training/trainingInitModal.ts`             | `ts/simulator/training/trainingSimulator.ts`, imported in `ts/simulator/entry.ts`                                                                                                                                                                                                                                                                                    |
| `ts/simulator/humanTraining/humanTrainingPanel.ts`       | `ts/simulator/humanTraining/humanTrainingEntry.ts`                                                                                                                                                                                                                                                                                                                   |
| `ts/simulator/humanTraining/humanTrainingConfigModal.ts` | `ts/simulator/humanTraining/humanTrainingEntry.ts`                                                                                                                                                                                                                                                                                                                   |
| `ts/simulator/traffic/trafficPanel.ts`                   | `ts/simulator/traffic/trafficSimulator.ts`, imported in `ts/simulator/traffic/entry.ts`                                                                                                                                                                                                                                                                              |
| `ts/store/storePanel.ts`                                 | `ts/store/entry.ts`                                                                                                                                                                                                                                                                                                                                                  |
| Template files                                           | Side-effect imports in `ts/simulator/entry.ts` and other entry points                                                                                                                                                                                                                                                                                                |

### 3c. Update entry point side-effect imports

`ts/simulator/entry.ts` imports many template files and UI modules as side effects. All paths must be updated.

### 3d. Delete old directories after migration

- `ts/panels/` (all files moved, templates/ moved, directory removed)
- `ts/panels/templates/` (absorbed into ts/ui/molecules/)
- `ts/simulator/panels/` (all files moved, directory removed)
- `ts/simulator/panels/templates/` (absorbed)
- `ts/simulator/training/templates/` (absorbed into ts/ui/organisms/)
- `ts/simulator/humanTraining/templates/` (absorbed)
- `ts/simulator/traffic/templates/` (absorbed)
- `ts/store/templates/` (absorbed)

## Phase 4 — Update Docs

### 4a. Update AGENTS.md

Add new conventions:

- CSS follows Atomic Design: tokens → atoms → molecules → organisms → templates → pages
- Custom elements live under `ts/ui/` organized by atomic level
- Use `var(--token-name)` for all design values; never raw hex/px
- All new UI components should follow the atomic hierarchy

### 4b. Remove old conventions

Any references to `ts/panels/`, `styles/style.css`, or `styles/world/styles.css` should be updated to reflect the new paths.

### 4c. Create/update `DESIGN.md`

Document the design token system and atomic hierarchy for future contributors.

## Acceptance Criteria

1. **`npm test` passes** — all 684 tests pass with updated import paths (no test files import from old paths)
2. **`npm run fix:all` passes** — format and lint clean
3. **`npm start` compiles** — tsc produces no errors
4. **All 5 HTML pages load** with correct styling (simulator.html, traffic.html, race.html, world.html, human-training.html)
5. **No visual regressions** — all existing visual baseline tests pass (`npm run test:visual`)
6. **No remaining imports** from old `ts/panels/`, `ts/simulator/panels/`, `ts/simulator/*/templates/` paths
7. **No remaining `<link>` to `style.css` or `world/styles.css`** in any HTML file
8. **CSS design tokens** are used consistently — `grep -r '#[0-9a-fA-F]' styles/` finds only exceptions (legacy `styles/world/styles.css` is gone)
