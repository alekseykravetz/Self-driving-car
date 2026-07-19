# Design System — Self-Driving Car Simulator

> **Token system**: All visual properties below are available as CSS custom properties in `styles/tokens.css`. Every raw value referenced here maps to a `var(--token-name)` in the codebase. When adding new UI, prefer `var(--color-*)`, `var(--space-*)`, `var(--text-*)`, `var(--radius-*)`, and `var(--size-*)` over hardcoded values.

## 1. Visual Theme & Atmosphere

A dark, data-dense simulator environment that prioritizes clarity and legibility above decorative flourish. The interface is built for prolonged staring — an educational sandbox where neural networks train in real time against a top-down road canvas. Backgrounds are near-black (`#0f0f14`), panels use semi-transparent overlays (`rgba(0,0,0,0.6)`) so the simulation remains visible through all chrome, and every pixel of UI exists only to serve the training loop.

The canvas is the hero: a bright green-grass road surface (`#2a5`) where grey asphalt roads, white lane markings, and colored traffic elements create a clean, schematic viewport. Cars render as simple colored polygons with name labels, sensor rays glow yellow, and the neural network visualizer pulses beside the driving view. The aesthetic is intentionally hand-rolled — no WebGL, no Three.js, just Canvas 2D with filled polygons and matrix transforms. This "from scratch" quality is part of the identity: the UI signals that everything visible is something you could build yourself.

Emoji icons replace SVG iconography throughout — a design choice that gives the interface an informal, accessible character. Floating toolbars with subtly rounded corners and thin white borders (`1px solid rgba(255,255,255,0.15)`) hover over the canvas, while side panels dock at fixed widths (200px controls, 300px network view). The typographic palette is minimal: Arial for labels, monospace for data, and Inter for the landing page.

**Key Characteristics:**

- Dark, near-black backgrounds (`#0f0f14`, `#000`) with semi-transparent UI overlays
- Green grass road canvas (`#2a5`) as the primary bright color area
- Hand-rolled Canvas 2D rendering — educational, schematic, from-scratch aesthetic
- Emoji icons instead of SVG — informal and accessible
- Floating toolbars with `rgba(0,0,0,0.6)` glass overlays
- Side panels at fixed widths (200px / 300px)
- Neural network visualizer with amber-cyan diverging palette on black
- Mono green (#7ddf7d) for positive/active/primary-action states
- Sensor rays in yellow, traffic lights in red/yellow/green, best-car highlight in gold
- Pseudo-3D buildings and trees via painter's algorithm

## 2. Color Palette & Roles

### Background & Surface

- **Void Black** (`#000000`): World editor body, network canvas, mini-map canvas — the deepest background layer
- **Dark Void** (`#0f0f14`): Landing page body, training panel, traffic stats panel — main UI surface
- **Panel Glass** (`rgba(15, 15, 20, 0.92)`): Training manager panel, traffic stats panel
- **Overlay Smoke** (`rgba(0, 0, 0, 0.6)`): Floating toolbars — allows canvas content to show through
- **Heavy Overlay** (`rgba(0, 0, 0, 0.7)`): OSM import panel, modal backdrops
- **Grass Canvas** (`#2a5`): Top-down road surface — the bright green game canvas
- **Sky Gradient** (`linear-gradient(#8cf, white 70%)`): 3D camera view background
- **Modal Surface** (`#1b1d24`): Training init modal dialog — slightly lighter than dark void
- **Card Base** (`rgba(255, 255, 255, 0.04)`): Landing page cards, store panels
- **Tooltip Base** (`rgba(10, 10, 15, 0.9)`): Label chips and tooltips

### Text

- **Bright Silver** (`#e8e8e8`): Main body text
- **Pure White** (`#ffffff`): Headings, selected pool rows, store titles
- **Light Grey** (`#ccc` to `#e0e0e0`): Buttons, stat values, table rows
- **Muted Grey** (`#888` / `#999`): Subtitles, stat labels, control labels
- **Dim Grey** (`#777` to `#888`): Small descriptions, secondary labels
- **Faint White** (`rgba(255,255,255,0.4-0.6)`): Control group labels, section titles, empty states

### Accent

- **Mono Green** (`#7ddf7d`): Primary action text, landing page title gradient, positive states
- **Teal** (`#4ecdc4`): Landing page title gradient companion
- **Indigo** (`#6366f1`): Store panel active tab, radio buttons
- **Blue** (`#42a5f5`): Pool table selection, secondary accent
- **Gold** (`gold`): Best AI car highlight in training simulator
- **Cyan** (`deepskyblue` / `#0FF`): Previous pool car indicator, light override indicator

### Semantic / Status

- **Status Green** (`#5cb85c`): Active/healthy status dot with `rgba(92,184,92,0.6)` glow
- **Status Red** (`#d9534f`): Error/damaged status dot with `rgba(217,83,79,0.6)` glow
- **Status Orange** (`#f0ad4e`): Warning status dot with `rgba(240,173,78,0.6)` glow
- **Key Active** (`#2a8a2a` bg, `#4cdf4c` border): Active keyboard shortcut indicator
- **Key Flash** (`#c08020` bg, `#ffb040` border): Momentary flash on key press

### Button Variants

- **Primary Button**: bg `rgba(80,180,80,0.25)`, text `#7ddf7d`, border `rgba(80,180,80,0.3)`
- **Danger Button**: bg `rgba(200,60,60,0.2)`, text `#e88`, border `rgba(200,60,60,0.25)`
- **Warning Outline**: bg transparent, border `rgba(200,150,40,0.3)`, text `#f5a623`
- **Success Outline**: bg transparent, border `rgba(60,200,60,0.3)`, text `#5cb85c`

### Border

- **Subtle Border** (`rgba(255, 255, 255, 0.08)`): Cards, panel sections, table rows
- **Visible Border** (`rgba(255, 255, 255, 0.12-0.15)`): Modals, popovers, toolbar outlines
- **Strong Border** (`rgba(255, 255, 255, 0.3)`): Key indicators, control separators

### Input

- **Input BG** (`rgba(255, 255, 255, 0.07)`): Text/number input backgrounds
- **Input Border** (`rgba(255, 255, 255, 0.1)`): Default input border
- **Input Focus** (`rgba(255, 200, 50, 0.6)`): Golden focus ring
- **Checkbox Accent** (`#4caf50` / `#5cb85c`): Green checkbox accent

### Canvas Rendering

- **Road Fill** (`#BBB`): Road surface color
- **Road Border** (`white`): 4px road edge strokes
- **Lane Dash** (`white`): Dashed center lines (`dash [15, 25]`, width 4)
- **Crosswalk** (`white`): Dashed stripes (`dash [11, 11]`)
- **Traffic Light Off** (`#060` / `#660` / `#600`): Dark circles for inactive lights
- **Traffic Light On** (`#0F0` / `#FF0` / `#F00`): Bright circles for active lights
- **Building Walls** (`white`), **Roof** (`#D44`): Pseudo-3D building rendering
- **Tree Canopy** (`rgb(30, 50-200, 70)`): Green gradient for tree foliage
- **Target Marker** (`red` / `white` / `red`): Concentric circles (30/20/10px)
- **Corridor Walls** (`red`, width 4): Collision corridor borders

### Neural Network Visualizer

- **Positive Weight** (`#FFB000` to `#FFE44D`): Amber range for positive activations
- **Negative Weight** (pale cyan to `#00E5FF`): Cyan range for negative activations
- **Zero/Neutral** (`rgba(40,40,40,1)`): Midpoint of legend gradient
- **Neuron Disc** (`rgba(0,0,0,alpha)`): Dark neuron body
- **Highlight Ring** (`rgba(255,255,255,0.9)`): Hovered neuron outline
- **Connection Dim** (same color, alpha 0.08): Unfocused edges
- **Signal Particles** (same color, alpha 0.6-1.0): Animated dots on active connections

## 3. Typography Rules

### Font Families

- **UI Labels**: `Arial, sans-serif` — all UI chrome, buttons, panels, section titles, controls
- **Monospace Data**: `'Courier New', monospace` / `monospace` — elapsed time, FPS, stat values, car name labels
- **Landing Page**: `'Inter', sans-serif` — body text on the main page only
- **Canvas Text**: `Arial` — legacy in-world labels (STOP, YIELD, P markings)

### Hierarchy

| Role            | Size              | Weight | Line Height   | Letter Spacing | Family    |
| --------------- | ----------------- | ------ | ------------- | -------------- | --------- |
| Landing Heading | 32px (2rem)       | 800    | normal        | normal         | Inter     |
| Card Heading    | 24px (1.5rem)     | 700    | normal        | normal         | Arial     |
| Modal Title     | 17.6px (1.1rem)   | 700    | normal        | normal         | Arial     |
| Stat Value      | 12px              | 700    | normal        | normal         | monospace |
| Section Title   | 10px              | 700    | 1px uppercase | 1px            | Arial     |
| Button Large    | 13px              | 600    | normal        | normal         | Arial     |
| Button Small    | 11px              | 500    | normal        | normal         | Arial     |
| Body Text       | 0.85rem (~13.5px) | 400    | normal        | normal         | Arial     |
| Stat Label      | 10px              | 600    | 1px uppercase | 0.4px          | Arial     |
| Control Label   | 10px              | 400    | 1px uppercase | 0.6px          | Arial     |
| Car Name        | 13px              | 700    | normal        | normal         | monospace |
| Key Indicator   | 13px              | 700    | normal        | normal         | monospace |
| Tooltip         | 11px              | 400    | normal        | normal         | Arial     |

### Principles

- **Uppercase + spacing** for labels: section titles, stat labels, control group labels all use `text-transform: uppercase` with `letter-spacing: 0.4-1px`
- **Weight range 400-800**: Light weights avoided — readability on dark backgrounds requires at least 400
- **10px minimum**: Tiny labels (stat labels, section titles) at 10px are acceptable in this data-dense interface
- **Monospace for data**: All numeric values, times, and car identifiers use monospace for alignment and technical feel
- **No italic or decorative**: Plain roman weights only — no italic, no oblique, no fancy variants

## 4. Component Stylings

### Buttons

**Large Button (`.btn-lg`):**

- Default: height 38px, full width, padding 0 12px, borderRadius 8px, bg `rgba(255,255,255,0.1)`, text `#e0e0e0`, fontSize 13px, fontWeight 600, fontFamily Arial
- Hover: bg `rgba(255,255,255,0.18)`, transform `scale(1.02)`
- Active: transform `scale(0.98)`
- `.btn-primary`: bg `rgba(80,180,80,0.25)`, text `#7ddf7d`, border `rgba(80,180,80,0.3)`
- `.btn-danger`: bg `rgba(200,60,60,0.2)`, text `#e88`, border `rgba(200,60,60,0.25)`

**Small Button (`.btn-sm`):**

- Default: height 32px, full width, padding 0 8px, borderRadius 6px, bg `rgba(255,255,255,0.08)`, text `#ccc`, fontSize 11px, fontWeight 500
- Hover: bg `rgba(255,255,255,0.15)`, text `#fff`
- Variants: `.btn-danger-outline` (red border), `.btn-warning-outline` (amber), `.btn-success-outline` (green)

**Toolbar Button (`.toolbar-btn`):**

- Size: 32x32px, no padding, borderRadius 5px
- Font: 16px (emoji)
- Default: bg `rgba(255,255,255,0.1)`, opacity 0.7
- Hover: bg `rgba(255,255,255,0.22)`, opacity 0.9
- `.active`: bg `rgba(255,255,255,0.18-0.2)`, outline `2px solid rgba(255,255,255,0.4-0.45)`, opacity 1
- Disabled: opacity 0.25, cursor `not-allowed`

### Input Controls

**Number/Text Input:**

- Size: border `1px solid rgba(255,255,255,0.1)`, borderRadius 6px, padding 5px 6px
- Font: fontSize 12px, textAlign center
- Default: bg `rgba(255,255,255,0.07)`, text `#e0e0e0`
- Focus: borderColor `rgba(255,200,50,0.6)`, bg `rgba(255,255,255,0.12)`, outline `none`
- Number spin buttons hidden (custom inc/dec via `.num-btn`)

**Checkbox:**

- Size: 14x14px (18x18px in training panel)
- Accent: `#4caf50` / `#5cb85c`

**Radio Button:**

- Accent: `#6366f1` (indigo)

**Number Input Row (`.num-input-row`):**

- Flex layout with `.num-btn`: 22x22px, borderRadius 4px, bg `rgba(255,255,255,0.1)`

**Spawn Car Select:**

- Size: height 32px, max-width 140px
- Default: bg `rgba(255,255,255,0.1)`, text `#fff`, fontSize 12px

### Panels & Sections

**Panel Section (`.panel-section`):**

- Padding: 10px, bottomBorder: `1px solid rgba(255,255,255,0.08)`

**Section Title (`.section-title`):**

- Font: 10px Arial 700, uppercase, letterSpacing 1px, color `rgba(255,255,255,0.4)`
- BottomBorder: `1px solid rgba(255,255,255,0.06)`

**Stat Row (`.stat-row`):**

- Padding: 3px 6px, borderRadius 6px, bg `rgba(255,255,255,0.04)`
- Label: 10px Arial, uppercase, color `#888`
- Value: 12px monospace, weight 700, color `#e8e8e8`

### Floating Toolbar

- Position: absolute, top 10px, left 10px, z-index 10
- Size: padding 6px 10px, borderRadius 8px
- Background: `rgba(0,0,0,0.6)`
- Outline: `1px solid rgba(255,255,255,0.15)`

### Modal / Dialog

- Overlay: `rgba(0,0,0,0.6)`, `backdrop-filter: blur(2px)`
- Dialog: bg `#1b1d24`, border `1px solid rgba(255,255,255,0.12)`, borderRadius 12px
- BoxShadow: `0 18px 50px rgba(0,0,0,0.55)`
- Width: `min(560px, 100%)`

### Card / Popover

- **Landing Card**: bg `rgba(255,255,255,0.04)`, border `1px solid rgba(255,255,255,0.08)`, borderRadius 16px, padding 32px 28px, hover borderColor `rgba(255,255,255,0.15)`, translateY -2px
- **Asset Popover**: bg `rgba(20,20,25,0.97)`, border `1px solid rgba(255,255,255,0.15)`, borderRadius 8px, boxShadow `0 6px 18px rgba(0,0,0,0.5)`

### Tooltip

- **CSS (HTML)**: bg `rgba(0,0,0,0.9)`, text `white`, fontSize 11px Arial, borderRadius 4px, padding 6px 10px
- **Canvas (NN)**: bg `rgba(10,10,15,0.85)`, text `rgba(240,240,240,0.95)`, fontSize 11px monospace, border `1px solid rgba(255,255,255,0.35)`, borderRadius 6px

### Key Indicator (Shortcut Keys)

- Size: min-width 32px, height 32px, borderRadius 4px
- Default: bg `#333`, border `1px solid #555`, text `#888`, fontSize 13px monospace 700
- Active: bg `#2a8a2a`, border `#4cdf4c`, green glow
- Flash: bg `#c08020`, border `#ffb040`, amber glow

### Tables

- **Pool Table**: font 10px Arial (headers), 11px monospace (values); header uppercase `#888`; row hover `rgba(255,255,255,0.08)`; selected: bg `rgba(66,165,245,0.25)`, outline `1px solid rgba(66,165,245,0.5)`
- **Store Table**: font 0.85rem; header `rgba(255,255,255,0.5)` uppercase; cell `rgba(255,255,255,0.85)`; sticky header bg `#16161c`

## 5. Layout Principles

### Spacing System

- Base unit: 4px (very compact)
- Common values: 3px, 6px, 8px, 10px, 12px, 20px, 28px, 32px
- Panel padding: 10px
- Card padding: 28-32px

### Primary Layout (Simulator)

```
#simulatorLayout (flex, 100vw x 100vh)
  ├── [gameCanvas] (top-down view, flex-grow)
  ├── [cameraCanvas] (3D view, 300px fixed width, optional)
  ├── #rightPanel (flex column)
  │   ├── [networkCanvas] (300px wide)
  │   └── [miniMapCanvas] (300px x 300px)
  └── <control-panel> (200px wide)
```

- Control panel: 200px (desktop), 140px (mobile)
- Network panel: 300px width
- Camera view: 300px width
- Toolbars: floating, absolute positioned above canvas

### Landing Page Layout

```
body.main-page
  ├── header.landing-header (centered, h1 + subtitle)
  └── main.landing-sections (CSS Grid, auto-fit, minmax(340px, 1fr))
      ├── .landing-card x4
      └── <store-panel> (grid-column: span 2)
```

### Race Page Layout

- Game canvas: full viewport
- Mini-map: right 20px, bottom 20px, circular (border-radius 50%), 50% opacity
- Stats panel: right 20px, top 20px, black bg, 50% opacity
- Counter: centered, 40vmin, white, 50% opacity

### Border Radius Scale

| Value | Context                                    |
| ----- | ------------------------------------------ |
| 4px   | Key indicators, number buttons             |
| 5px   | Toolbar buttons                            |
| 6px   | Small buttons, inputs, stat rows, tooltips |
| 8px   | Large buttons, floating toolbars, popovers |
| 12px  | Modals                                     |
| 16px  | Landing cards                              |

## 6. Depth & Elevation

| Level              | Treatment                                                               | Use                                              |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Level 0 (Flat)     | No shadow, no border                                                    | Canvas elements, road, car polygons, sensor rays |
| Level 1 (Surface)  | 1px border `rgba(255,255,255,0.08)`                                     | Cards, panel sections                            |
| Level 2 (Floating) | `rgba(0,0,0,0.6)` bg + 1px `rgba(255,255,255,0.12-0.15)` border         | Toolbars, popovers                               |
| Level 3 (Modal)    | `rgba(0,0,0,0.6)` backdrop + blur(2px) + `0 18px 50px rgba(0,0,0,0.55)` | Modal dialogs                                    |

### Depth Philosophy

Depth is communicated through background opacity and thin white borders rather than box-shadows. The floating toolbar pattern — semi-transparent black backgrounds with a barely-there white outline — lets the simulation canvas remain at the same z-level, with UI overlays appearing as glass panels rather than elevated surfaces. Modal dialogs use both backdrop blur and a substantial shadow to indicate they sit above everything.

## 7. Do's and Don'ts

### Do

- Use dark backgrounds (`#0f0f14`, `#000`) as the default — the simulation canvas is the only bright area
- Keep panels semi-transparent (`rgba(0,0,0,0.6)`) so simulation content shows through
- Use green (`#7ddf7d`) for primary actions and positive states — it's the sole chromatic accent
- Render everything in Canvas 2D — no WebGL, no Three.js
- Use emoji icons for toolbar controls — they're universal and maintainable
- Display all numeric data in monospace for alignment and technical clarity
- Use gold for the best AI car, cyan for the previous best — consistent visual hierarchy in training
- Apply uppercase + letter-spacing for labels and section titles
- Use 4px scrollbar thumbs on dark backgrounds
- Keep the neural network visualizer on the right side with amber-cyan diverging palette

### Don't

- Add shadows to panels — use semi-transparent backgrounds with thin white borders instead
- Use WebGL or Three.js — the educational value of hand-rolled Canvas 2D is a core feature
- Introduce SVG icon sets — emoji are sufficient and keep the codebase dependency-free
- Use bright colors for UI chrome — the simulation content should be the most colorful thing on screen
- Make panels fully opaque — the simulation must remain visible behind all interface elements
- Add gradients to buttons or panels — flat colors with hover opacity shifts are the pattern
- Use serif fonts — the interface is entirely sans-serif and monospace
- Place controls on the right — the control panel is always on the left, network view on the right
- Exceed 300px for the right panel — the simulation canvas needs the majority of viewport width

## 8. Responsive Behavior

### Breakpoints

| Name    | Width   | Key Changes                                                                                                                                                                                                              |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Desktop | >768px  | Full layout: 200px control panel, 300px network, camera optional                                                                                                                                                         |
| Mobile  | <=768px | Control panel shrinks to 140px, store tables collapse (Active + Filename only), world editor bottom controls hidden, simulator toolbar hides Viewport and Borders groups, race page shows phone tilt instead of keyboard |

### Layout Changes

- **Control Panel**: 200px desktop → 140px mobile — labels hide, only values shown
- **Store Tables**: Collapse to 2 columns (Active + Filename) on mobile
- **World Editor**: `<editor-toolbar>` hidden entirely on mobile
- **Race Page**: Keyboard/camera links hidden, phone tilt controls shown instead
- **Landing Page**: Cards stack in single column, card padding reduces
- **Toolbar Groups**: Viewport and Borders groups hidden on mobile simulator toolbar

### Collapsing Strategy

- Side panels maintain their position but narrow
- Floating toolbars wrap to multiple rows if needed
- `<editor-toolbar>` hides completely on mobile (mode switching uses keyboard shortcuts instead)
- Store tables sacrifice columns rather than rows

## 9. Agent Prompt Guide

### CSS Token Quick Reference

All values are defined in `styles/tokens.css`. When implementing, use `var(--token-name)` instead of raw values.

| Token                         | Value                      | Usage                            |
| ----------------------------- | -------------------------- | -------------------------------- |
| `--color-bg-app`              | `#0f0f14`                  | Main app background              |
| `--color-bg-surface`          | `rgba(15,15,20,0.92)`      | Panel surfaces                   |
| `--color-bg-overlay`          | `rgba(0,0,0,0.6)`          | Floating toolbars, overlays      |
| `--color-bg-canvas`           | `#2a5`                     | Road/game canvas                 |
| `--color-text-primary`        | `#e8e8e8`                  | Primary text                     |
| `--color-text-secondary`      | `#888`                     | Muted labels                     |
| `--color-accent-green`        | `#7ddf7d`                  | Primary actions, positive states |
| `--color-accent-green-strong` | `#5cb85c`                  | Status green, active indicators  |
| `--color-accent-red`          | `#d9534f`                  | Danger states                    |
| `--color-accent-yellow`       | `#f0ad4e`                  | Warning states                   |
| `--font-ui`                   | `Arial, sans-serif`        | UI labels                        |
| `--font-mono`                 | `'Courier New', monospace` | Numeric data                     |
| `--space-1`                   | `4px`                      | Minimum gap/padding              |
| `--space-2`                   | `8px`                      | Standard gap                     |
| `--radius-sm`                 | `3px`                      | Key indicators                   |
| `--radius-md`                 | `5px`                      | Toolbar buttons                  |
| `--radius-lg`                 | `8px`                      | Toolbar panels                   |

### Quick Color Reference

- Backgrounds: "Dark Void (#0f0f14)", "Void Black (#000000)", "Overlay Smoke (rgba(0,0,0,0.6))"
- Canvas: "Grass Canvas (#2a5)"
- Primary text: "Bright Silver (#e8e8e8)"
- Muted text: "Muted Grey (#888)"
- Accent green: "Mono Green (#7ddf7d)"
- Accent indigo: "Indigo (#6366f1)"
- Status green/red/orange: "#5cb85c / #d9534f / #f0ad4e"
- Best car: "Gold"
- Input focus: "Golden (rgba(255,200,50,0.6))"

### Example Component Prompts

- "Create a floating toolbar with 32x32px emoji buttons on a semi-transparent black background with thin white border, positioned absolutely at top 10px left 10px"
- "Design a control panel 200px wide with dark background, containing uppercase 10px section titles with letter-spacing 1px, stat rows with monospace values, and large green-accent primary buttons"
- "Build a side panel with a 300px network visualizer showing neurons as dark discs connected by amber/cyan lines on a pure black background"
- "Create a training init modal with #1b1d24 background, 12px border-radius, 560px max-width, and a semi-transparent backdrop with blur"
- "Render a stat row with 10px uppercase label (#888) and 12px bold monospace value (#e8e8e8) on a rgba(255,255,255,0.04) background with 6px border-radius"

### Iteration Guide

1. Focus on data density — this is a simulator interface, not a marketing site. Every pixel should inform
2. Use uppercase + letter-spacing for all labels — it's the most consistent visual pattern across the UI
3. Keep the canvas dominant — UI chrome should never exceed 30% of viewport width
4. Use the exact color tokens above — the palette is deliberately narrow and constrained
5. Emoji for icons, monospace for numbers, Arial for everything else
