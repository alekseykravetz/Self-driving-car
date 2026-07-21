# Design System & CSS Architecture

The project uses an **Atomic Design** (Brad Frost) methodology for CSS, structured
as a layered design system with design tokens at the foundation.

---

## Overview

```
styles/
  tokens.css              ← Design tokens (CSS custom properties)
  index.css               ← Shared entry: imports tokens + atoms + molecules + common organisms
  atoms/                  ← Smallest reusable styles
  molecules/              ← Compound groups
  organisms/              ← Full feature panels
  templates/              ← Page-level layouts
  pages/                  ← Page-specific overrides
  simulator.css           ← Simulator page entry (training, traffic, human-training)
  landing.css             ← Landing page entry (index.html)
  race.css                ← Race page entry
  world.css               ← World editor page entry
```

Each page HTML loads a page-specific entry CSS (e.g. `/styles/simulator.css`),
which `@import`s `index.css` (the shared core) plus its template. No page
loads raw atom/molecule files individually — the import chain is always
`page.css → index.css → tokens + atoms + molecules + organisms + pages`.

---

## Design Tokens (`styles/tokens.css`)

A single source of truth for every visual property. All values are CSS custom
properties on `:root` — never use raw hex, px, or literal values elsewhere.

### Colors — Backgrounds

| Token                       | Value                    | Usage                            |
| --------------------------- | ------------------------ | -------------------------------- |
| `--color-bg-app`            | `#0f0f14`                | App/page background              |
| `--color-bg-surface`        | `rgba(15,15,20,0.92)`    | Panel surface backgrounds        |
| `--color-bg-surface-raised` | `rgba(255,255,255,0.04)` | Raised card surfaces             |
| `--color-bg-hover`          | `rgba(255,255,255,0.08)` | Hover state                      |
| `--color-bg-active`         | `rgba(255,255,255,0.12)` | Active/pressed state             |
| `--color-bg-overlay`        | `rgba(0,0,0,0.6)`        | Modal overlays                   |
| `--color-bg-toolbar`        | `rgba(0,0,0,0.6)`        | Toolbar backgrounds              |
| `--color-bg-dark`           | `#000`                   | Dark surfaces                    |
| `--color-bg-canvas`         | `#2a5`                   | Simulation canvas (CSS fallback) |
| `--color-bg-input`          | `rgba(255,255,255,0.07)` | Input field backgrounds          |

### Colors — Text

| Token                    | Value                   | Usage                  |
| ------------------------ | ----------------------- | ---------------------- |
| `--color-text-primary`   | `#e8e8e8`               | Primary body text      |
| `--color-text-secondary` | `#888`                  | Muted/secondary text   |
| `--color-text-muted`     | `rgba(255,255,255,0.5)` | Subtle labels          |
| `--color-text-dim`       | `rgba(255,255,255,0.4)` | Disabled/de-emphasized |
| `--color-text-inverse`   | `#000`                  | Text on light bg       |

### Colors — Accent

Semantic accent colors with background and border variants for each:

| Token                          | Value                   | Meaning       |
| ------------------------------ | ----------------------- | ------------- |
| `--color-accent-green`         | `#7ddf7d`               | Success / OK  |
| `--color-accent-green-bg`      | `rgba(92,184,92,0.12)`  |               |
| `--color-accent-green-border`  | `rgba(80,180,80,0.3)`   |               |
| `--color-accent-red`           | `#d9534f`               | Error / crash |
| `--color-accent-red-bg`        | `rgba(217,83,79,0.12)`  |               |
| `--color-accent-red-border`    | `rgba(200,60,60,0.3)`   |               |
| `--color-accent-yellow`        | `#f0ad4e`               | Warning       |
| `--color-accent-yellow-bg`     | `rgba(240,173,78,0.12)` |               |
| `--color-accent-yellow-border` | `rgba(200,150,40,0.3)`  |               |
| `--color-accent-blue`          | `#5cb8ff`               | Info / link   |
| `--color-accent-indigo`        | `#6366f1`               | Selection     |
| `--color-accent-gold`          | `rgba(255,215,0,0.7)`   | Highlight     |
| `--color-accent-orange`        | `#f5a623`               | Stale state   |

### Colors — Borders

| Token                        | Value                    | Usage               |
| ---------------------------- | ------------------------ | ------------------- |
| `--color-border-subtle`      | `rgba(255,255,255,0.08)` | Very faint dividers |
| `--color-border-default`     | `rgba(255,255,255,0.15)` | Standard borders    |
| `--color-border-strong`      | `rgba(255,255,255,0.2)`  | Emphasized borders  |
| `--color-border-input`       | `rgba(255,255,255,0.1)`  | Input field borders |
| `--color-border-input-focus` | `rgba(255,200,50,0.6)`   | Input focus ring    |

### Typography

| Token            | Value/Type            | Usage                 |
| ---------------- | --------------------- | --------------------- |
| `--font-ui`      | `Arial, sans-serif`   | General UI text       |
| `--font-mono`    | `'Courier New', mono` | Code/monospace        |
| `--font-display` | `'Inter', sans-serif` | Landing page headings |
| `--text-xs`      | `9px`                 | Tiny labels           |
| `--text-sm`      | `10px`                | Small stats, tooltips |
| `--text-base`    | `11px`                | Default body          |
| `--text-md`      | `12px`                | Section headers       |
| `--text-lg`      | `13px`                | Prominent labels      |
| `--text-xl`      | `14px`                | Sub-headings          |
| `--text-2xl`     | `16px`                | Panel titles          |
| `--text-3xl`     | `24px`                | Page headings         |
| `--text-4xl`     | `40vmin`              | Landing hero text     |

Weights: `--weight-normal` (400), `--weight-medium` (500),
`--weight-semibold` (600), `--weight-bold` (700), `--weight-extrabold` (800).

Letter-spacing: `--tracking-wide` (0.5px), `--tracking-wider` (1px),
`--tracking-widest` (0.05em).

### Spacing

4px base unit:

| Token          | Value |
| -------------- | ----- |
| `--space-0\.5` | 2px   |
| `--space-1`    | 4px   |
| `--space-1\.5` | 6px   |
| `--space-2`    | 8px   |
| `--space-3`    | 12px  |
| `--space-4`    | 16px  |
| `--space-5`    | 20px  |
| `--space-6`    | 24px  |
| `--space-8`    | 32px  |
| `--space-12`   | 40px  |

### Border Radius

| Token          | Value |
| -------------- | ----- |
| `--radius-sm`  | 3px   |
| `--radius-md`  | 5px   |
| `--radius-lg`  | 8px   |
| `--radius-xl`  | 12px  |
| `--radius-2xl` | 16px  |

### Shadows

| Token            | Value                          |
| ---------------- | ------------------------------ |
| `--shadow-sm`    | `0 0 3px rgba(92,184,92,0.6)`  |
| `--shadow-md`    | `0 6px 18px rgba(0,0,0,0.5)`   |
| `--shadow-green` | `0 0 6px rgba(76,223,76,0.6)`  |
| `--shadow-amber` | `0 0 6px rgba(255,176,64,0.6)` |

### Transitions

| Token                 | Value |
| --------------------- | ----- |
| `--transition-fast`   | 0.15s |
| `--transition-normal` | 0.2s  |

### Sizing

| Token                 | Value |
| --------------------- | ----- |
| `--size-btn-lg`       | 38px  |
| `--size-btn-sm`       | 32px  |
| `--size-btn-icon`     | 32px  |
| `--size-indicator`    | 32px  |
| `--size-swatch`       | 12px  |
| `--size-dot`          | 7px   |
| `--size-scrollbar`    | 6px   |
| `--size-checkbox`     | 14px  |
| `--size-checkbox-lg`  | 18px  |
| `--size-input-height` | 32px  |

---

## Atoms (`styles/atoms/`)

Smallest reusable styles — single-element rules and base resets.

| File                 | Scope                                                                |
| -------------------- | -------------------------------------------------------------------- |
| `_base.css`          | Global reset, body, scrollbar, label, button, file-input defaults    |
| `_button.css`        | Button base styles (`.btn`, `.btn-icon`, `.btn-*`)                   |
| `_input.css`         | Input field styles (`input[type=number]`, `.input`, `.input-number`) |
| `_label.css`         | Label styles (`.label`, `.label-*`)                                  |
| `_badge.css`         | Status badge / indicator dot styles                                  |
| `_key-indicator.css` | Keyboard shortcut indicator caps                                     |
| `_toolbar-btn.css`   | Toolbar-specific button sizing and appearance                        |

---

## Molecules (`styles/molecules/`)

Compound groups — composed from atoms to form reusable UI patterns.

| File                     | Components / Usage                                               |
| ------------------------ | ---------------------------------------------------------------- |
| `_stat-row.css`          | Label + value rows (training panel stats)                        |
| `_toggle-row.css`        | Label + toggle switch rows                                       |
| `_num-input-row.css`     | Label + number input rows (parameter editors)                    |
| `_btn-group.css`         | Button groups (radio-style toolbar groups, mode selectors)       |
| `_param-grid.css`        | Grid layout for parameter columns                                |
| `_controls-group.css`    | Control group wrappers (border/tracking mode groups)             |
| `_asset-picker.css`      | World/car asset picker popovers                                  |
| `_collapsible.css`       | Collapsible section (`.collapsible-header`, `.collapsible-body`) |
| `_view-toggles.css`      | Viewport mode toggles (mouse vs touchpad)                        |
| `_shortcuts-keys.css`    | Shortcut key cap display (keyboard toolbar)                      |
| `_world-layers-keys.css` | World layer visibility key indicators                            |

---

## Organisms (`styles/organisms/`)

Full feature panel styles — complex compositions with their own layout and state.

| File                  | Tag / Component                                          |
| --------------------- | -------------------------------------------------------- |
| `_toolbar-panel.css`  | `<world-toolbar>` — the shared floating toolbar          |
| `_modals.css`         | `<training-init-modal>`, `<human-training-config-modal>` |
| `_training-panel.css` | `<training-panel>` — full training UI                    |
| `_traffic-panel.css`  | `<traffic-panel>` — Live Traffic Jam stats panel         |
| `_store-panel.css`    | `<store-panel>` — landing page asset viewer              |
| `_human-training.css` | `<human-training-panel>` — human backprop panel          |
| `_world-layers.css`   | `<world-layers-toolbar>` — layer visibility controls     |

---

## Templates (`styles/templates/`)

Page-level layout shells — define the grid/flex arrangement for each page type.

| File                    | Used by             | Layout                              |
| ----------------------- | ------------------- | ----------------------------------- |
| `_simulator-layout.css` | simulator, traffic, | Canvases + toolbar + side panels    |
|                         | human-training      |                                     |
| `_landing-page.css`     | index.html          | Centered hero with mode cards       |
| `_race-layout.css`      | race.html           | Canvases + toolbar + race HUD       |
| `_world-editor.css`     | world.html          | Full-screen canvas + editor toolbar |

---

## Pages (`styles/pages/`)

Page-specific overrides and responsive rules.

| File          | Scope                                     |
| ------------- | ----------------------------------------- |
| `_mobile.css` | Mobile-responsive overrides for all pages |

---

## Page Entry Points

Each page loads a single entry CSS that imports the shared core plus its template:

| Entry CSS       | Page(s)                       | Imports                               |
| --------------- | ----------------------------- | ------------------------------------- |
| `simulator.css` | simulator.html, traffic.html, | `index.css` + `_simulator-layout.css` |
|                 | human-training.html           |                                       |
| `landing.css`   | index.html                    | `index.css` + `_landing-page.css`     |
| `race.css`      | race.html                     | `index.css` + `_race-layout.css`      |
| `world.css`     | world.html                    | `index.css` + `_world-editor.css`     |

`index.css` is the shared core — it imports tokens (first), then all atoms,
all molecules, all common organisms, and page overrides. The template CSS is
loaded separately by each page entry to keep layout concerns isolated.

---

## Usage Rules

1. **Never use raw hex/rgba values** — use `var(--color-*)` tokens from `tokens.css`
2. **Never use raw px for spacing, fonts, or radii** — use `var(--space-*)`,
   `var(--text-*)`, `var(--radius-*)` tokens
3. **Never import atom/molecule files directly** — always go through `index.css`
4. **Add new CSS files to the correct layer** — atom for single elements, molecule
   for compound groups, organism for full panels, template for page layout,
   pages for page-specific overrides
5. **Register new CSS files in `index.css`** — add the `@import` in the
   appropriate section so all pages pick it up
6. **Template CSS is page-specific** — only import it from the page entry, not
   from `index.css`
