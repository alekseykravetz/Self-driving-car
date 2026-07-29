import type { Meta, StoryObj } from '@storybook/web-components';
import type { ShortcutDef } from '../ts/input/types.js';
import type { ShortcutsToolbarElement } from '../ts/ui/molecules/shortcutsToolbar.js';

// Bare side-effect imports guarantee each custom element self-registers even
// though we only reference its type (a value import used solely in a type
// position would be elided by the bundler, skipping registration).
import '../ts/ui/molecules/shortcutsToolbar.js';
import '../ts/ui/molecules/editorToolbar.js';
import '../ts/ui/molecules/layoutToolbar.js';
import '../ts/ui/molecules/animationLoopToolbar.js';
import '../ts/ui/molecules/worldLayersToolbar.js';
import '../ts/ui/molecules/worldSetup.js';
import '../ts/ui/molecules/worldToolbar.js';
import {
  numInputRowHtml,
  wireNumInputRows,
} from '../ts/ui/molecules/numInputRow.js';

/**
 * Molecules — compound components built from atoms. These are the real custom
 * elements shipped in the app (`ts/ui/molecules/`), rendered live so their
 * markup, styling and interactive state stay in sync with production.
 *
 * Most molecules are floating toolbars styled by their own element id; a few
 * expose setup methods (e.g. `setShortcuts`) that we call after mount.
 */
const meta: Meta = {
  title: 'Molecules',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/** Stage a live DOM node inside a padded, app-coloured canvas.
 *
 * `bg: 'canvas'` renders the node over the simulator's sky-gradient canvas
 * (the same `linear-gradient(var(--color-accent-sky), white 70%)` used by the
 * simulator/world pages). The floating toolbars use a translucent dark surface
 * (`--color-bg-toolbar: rgba(0,0,0,0.6)`) that only reads correctly over the
 * bright canvas — over the near-black app background it blends in and looks
 * washed-out, which is why the toolbar stories use the canvas backdrop. */
function stage(
  node: Node,
  note?: string,
  bg: 'app' | 'canvas' = 'app',
): HTMLElement {
  const wrapper = document.createElement('div');
  const background =
    bg === 'canvas'
      ? 'linear-gradient(var(--color-accent-sky), white 70%)'
      : 'var(--color-bg-app)';
  // A column flex box with `align-items:flex-start` keeps the toolbars sized to
  // their content (they are `display:flex` custom elements that would otherwise
  // stretch to fill the full block width) — matching how they float in the app.
  wrapper.style.cssText = `padding:32px;background:${background};min-height:100vh;box-sizing:border-box;font-family:var(--font-ui);color:var(--color-text-primary);display:flex;flex-direction:column;align-items:flex-start`;
  wrapper.appendChild(node);
  if (note) {
    const p = document.createElement('p');
    p.style.cssText =
      'margin:20px 0 0;font-size:11px;color:var(--color-text-secondary);max-width:640px';
    if (bg === 'canvas') p.style.color = 'var(--color-bg-dark)';
    p.innerHTML = note;
    wrapper.appendChild(p);
  }
  return wrapper;
}

/**
 * Create a custom element via HTML parsing rather than `document.createElement`.
 * Several of these elements set `this.id` in their constructor, which the Custom
 * Elements spec forbids for `createElement()` (it throws `NotSupportedError`) but
 * allows on the parser/`innerHTML` upgrade path the app itself uses.
 */
function make(tag: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<${tag}></${tag}>`;
  return holder.firstElementChild as HTMLElement;
}

// ═══════════════════════════════════════════════════════════════════
//  Shortcuts toolbar — visualises the keyboard shortcuts of a page.
// ═══════════════════════════════════════════════════════════════════
const SAMPLE_SHORTCUTS: ShortcutDef[] = [
  {
    id: 'sbGraph',
    label: 'S',
    title: 'Add point',
    group: 'Graph',
    kind: 'momentary',
  },
  {
    id: 'sbErase',
    label: 'E',
    title: 'Erase',
    group: 'Graph',
    kind: 'momentary',
  },
  {
    id: 'sbOneWay',
    label: 'O',
    title: 'One-way',
    group: 'Graph',
    kind: 'toggle',
  },
  {
    id: 'sbReverse',
    label: 'R',
    title: 'Reverse heading',
    group: 'Graph',
    kind: 'toggle',
  },
  {
    id: 'sbVis',
    label: 'V',
    title: 'Visualizer density',
    group: 'View',
    kind: 'momentary',
  },
  {
    id: 'sbGreen',
    label: 'G',
    title: 'All lights green',
    group: 'Traffic',
    kind: 'toggle',
  },
  {
    id: 'sbCtrl',
    label: 'Ctrl',
    title: 'Hold to zoom',
    group: 'View',
    kind: 'display',
    display: true,
    keys: ['Control'],
  },
];

export const ShortcutsToolbar: StoryObj = {
  name: 'Shortcuts Toolbar',
  render: () => {
    const el = make('shortcuts-toolbar') as ShortcutsToolbarElement;
    requestAnimationFrame(() => {
      el.setShortcuts(SAMPLE_SHORTCUTS);
      // Demonstrate a latched toggle in its active state.
      el.setActive('sbOneWay', true);
    });
    return stage(
      el,
      'Presentational only — the <code>KeyboardManager</code> calls <code>flash()</code> / <code>setActive()</code> to reflect live key state. The <strong>O</strong> toggle is shown latched.',
      'canvas',
    );
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Editor toolbar — world-editor mode switcher (graph / inspect / markings).
// ═══════════════════════════════════════════════════════════════════
export const EditorToolbar: StoryObj = {
  name: 'Editor Toolbar',
  render: () => {
    const el = make('editor-toolbar');
    return stage(
      el,
      'Mode switcher for the world editor. Click any tool to activate it (Graph is active by default).',
      'canvas',
    );
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Layout toolbar — top-view / camera layout + panel visibility toggles.
// ═══════════════════════════════════════════════════════════════════
export const LayoutToolbar: StoryObj = {
  name: 'Layout Toolbar',
  render: () =>
    stage(
      make('layout-toolbar'),
      'Switches the big/small layout and toggles the 3D view, network visualizer and mini-map.',
      'canvas',
    ),
};

// ═══════════════════════════════════════════════════════════════════
//  Animation-loop toolbar — play/pause, elapsed time, FPS, render throttle.
// ═══════════════════════════════════════════════════════════════════
export const AnimationLoopToolbar: StoryObj = {
  name: 'Animation Loop Toolbar',
  render: () =>
    stage(
      make('animation-loop-toolbar'),
      'Owns the shared play/pause toggle, the elapsed-time readout, a live FPS counter and the render-interval throttle.',
      'canvas',
    ),
};

// ═══════════════════════════════════════════════════════════════════
//  World-layers toolbar — per-layer visibility + regenerate + heatmap.
// ═══════════════════════════════════════════════════════════════════
export const WorldLayersToolbar: StoryObj = {
  name: 'World Layers Toolbar',
  render: () => {
    const el = make('world-layers-toolbar');
    return stage(
      el,
      'Independent visibility control for each world layer (roads, markings, corridors, item bases, trees, buildings) plus the ♻️ auto-regenerate toggle and the traffic heatmap overlay.',
      'canvas',
    );
  },
};

// ═══════════════════════════════════════════════════════════════════
//  World setup toolbar — border/tracking/viewport modes + asset selectors.
// ═══════════════════════════════════════════════════════════════════
export const WorldSetup: StoryObj = {
  name: 'World Setup Toolbar',
  render: () =>
    stage(
      make('world-setup'),
      'The simulator setup toolbar: border mode (none / damage / collision), camera tracking, viewport mode and the world/car asset selectors.',
      'canvas',
    ),
};

// ══════════════════════════════════════════════════════════════
//  World toolbar — the world-editor's collapsible setup toolbar.
// ══════════════════════════════════════════════════════════════
export const WorldToolbar: StoryObj = {
  name: 'World Toolbar',
  render: () =>
    stage(
      make('world-toolbar'),
      'The world-editor / camera-view setup toolbar (border, tracking and viewport modes plus asset selectors), wrapped in a collapsible “Setup” container.',
      'canvas',
    ),
};

// ═══════════════════════════════════════════════════════════════════
//  Number input row — labelled numeric field with +/- steppers.
// ═══════════════════════════════════════════════════════════════════
export const NumberInputRow: StoryObj = {
  name: 'Number Input Row',
  render: () => {
    const box = document.createElement('div');
    box.id = 'trainingManagerPanel';
    box.style.cssText =
      'max-width:220px;display:flex;flex-direction:column;gap:12px';
    box.innerHTML =
      numInputRowHtml({
        id: 'demoCars',
        label: 'Population',
        icon: 'car',
        min: 1,
        max: 500,
        step: 10,
        value: 60,
      }) +
      numInputRowHtml({
        id: 'demoSpeed',
        label: 'Max speed',
        icon: 'rocket',
        min: 1,
        max: 20,
        step: 0.5,
        value: 6,
      });
    wireNumInputRows(box);
    return stage(
      box,
      'Built by <code>numInputRowHtml()</code> and wired with <code>wireNumInputRows()</code>. The +/- buttons step the value, clamped to min/max, and dispatch a <code>change</code> event.',
    );
  },
};
