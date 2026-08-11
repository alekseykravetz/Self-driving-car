import { html, type TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

// <app-icon> is registered globally in preview.ts.
// The global tooltip controller self-registers its document listeners on import
// so the `[data-tooltip]` demo below is live.
import '../ts/ui/atoms/tooltip.js';

/**
 * Atoms — the smallest building blocks of the design system: buttons, inputs,
 * checkboxes, labels, badges, chips, status dots and keyboard-key indicators.
 * Every atom is styled purely through the shared CSS classes in `styles/atoms/`
 * (no per-component JS), so these previews are the source of truth for the
 * class names available to molecules and organisms.
 */
const meta: Meta = {
  title: 'Atoms',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const wrap = (inner: TemplateResult): TemplateResult => html`
  <div
    style="padding:24px;color:var(--color-text-primary);font-family:var(--font-ui);background:var(--color-bg-app);min-height:100vh;box-sizing:border-box"
  >
    ${inner}
  </div>
`;

const sectionTitle = (t: string): TemplateResult => html`
  <h3
    style="margin:28px 0 12px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:var(--color-text-secondary)"
  >
    ${t}
  </h3>
`;

const row = (inner: TemplateResult): TemplateResult => html`
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    ${inner}
  </div>
`;

// ═══════════════════════════════════════════════════════════════════
//  Buttons — every button variant in one place.
// ═══════════════════════════════════════════════════════════════════
export const Buttons: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0">Buttons</h2>

      ${sectionTitle('Large action buttons (.btn-lg)')}
      <div style="max-width:280px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-lg btn-primary">
          <app-icon name="play"></app-icon> Start
        </button>
        <button class="btn-lg"><app-icon name="save"></app-icon> Save</button>
        <button class="btn-lg btn-danger">
          <app-icon name="trash"></app-icon> Clear
        </button>
      </div>

      ${sectionTitle('Small buttons (.btn-sm)')}
      <div style="max-width:320px;display:flex;flex-direction:column;gap:8px">
        ${row(html`
          <button class="btn-sm" style="max-width:150px">Default</button>
          <button class="btn-sm btn-success-outline" style="max-width:150px">
            <app-icon name="save"></app-icon> Save
          </button>
        `)}
        ${row(html`
          <button class="btn-sm btn-warning-outline" style="max-width:150px">
            <app-icon name="regenerate"></app-icon> Discard
          </button>
          <button class="btn-sm btn-danger-outline" style="max-width:150px">
            <app-icon name="trash"></app-icon> Delete
          </button>
        `)}
      </div>

      ${sectionTitle('Toolbar buttons (.toolbar-btn)')}
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:20px">
        ${['graph', 'inspect', 'marking', 'regenerate', 'gear', 'road'].map(
          (n) => html`
            <button class="toolbar-btn">
              <app-icon name="${n}"></app-icon>
            </button>
          `,
        )}
        <button class="toolbar-btn active">
          <app-icon name="graph"></app-icon>
        </button>
      </div>
      <p
        style="margin:8px 0 0;font-size:11px;color:var(--color-text-secondary)"
      >
        Last button shows the <code>.active</code> (selected) state.
      </p>

      ${sectionTitle('Number stepper buttons (.num-btn)')}
      ${row(html`
        <button class="num-btn"><app-icon name="minus"></app-icon></button>
        <button class="num-btn"><app-icon name="plus"></app-icon></button>
      `)}
      ${sectionTitle('Race panel button (.race-panel-btn)')}
      ${row(html`
        <button class="race-panel-btn">
          <app-icon name="car"></app-icon> Load car(s)
        </button>
      `)}
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Inputs & checkboxes.
//  Number/text inputs are scoped under #trainingManagerPanel, so we mirror
//  that container id here to render them with their real styling.
// ═══════════════════════════════════════════════════════════════════
export const Inputs: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0">Inputs</h2>
      <div id="trainingManagerPanel" style="max-width:260px">
        ${sectionTitle('Number & text inputs')}
        <div style="display:flex;flex-direction:column;gap:10px">
          <input type="number" value="60" min="1" max="200" />
          <input type="text" value="City map" />
        </div>

        ${sectionTitle('Checkbox')}
        <label
          class="ctrl-checkbox"
          style="display:flex;gap:8px;align-items:center;font-size:13px"
        >
          <input type="checkbox" checked />
          State aware sensor
        </label>
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Labels & section titles.
// ═══════════════════════════════════════════════════════════════════
export const Labels: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0">Labels &amp; Titles</h2>

      ${sectionTitle('Control label (.ctrl-label)')}
      <div style="display:flex;flex-direction:column;gap:8px">
        <span class="ctrl-label">Max speed</span>
        <span class="ctrl-label"
          >Population <span class="ctrl-label secondary">optional</span></span
        >
      </div>

      ${sectionTitle('Section title (.section-title)')}
      <div style="max-width:240px">
        <div class="section-title">
          <span class="status-dot green"></span>
          <span>Storage</span>
        </div>
      </div>

      ${sectionTitle('Controls group label (.controls-group-label)')}
      <span class="controls-group-label">Graph</span>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Badges, chips & status dots.
// ═══════════════════════════════════════════════════════════════════
export const BadgesAndChips: StoryObj = {
  name: 'Badges & Chips',
  render: () =>
    wrap(html`
      <h2 style="margin:0">Badges, Chips &amp; Status Dots</h2>

      ${sectionTitle('Status dots (.status-dot)')}
      ${row(html`
        <span class="status-dot"></span>
        <span class="status-dot green"></span>
        <span class="status-dot orange"></span>
        <span class="status-dot red"></span>
      `)}
      <p
        style="margin:8px 0 0;font-size:11px;color:var(--color-text-secondary)"
      >
        idle · green (ok) · orange (stale) · red (error)
      </p>

      ${sectionTitle('Config chips (.cfg-chip)')}
      ${row(html`
        <span class="cfg-chip">
          <span class="cfg-chip-emoji"><app-icon name="car"></app-icon></span>
          <span class="cfg-chip-value">4</span>
        </span>
        <span class="cfg-chip">
          <span class="cfg-chip-emoji"><app-icon name="brain"></app-icon></span>
          <span class="cfg-chip-value">6,6</span>
        </span>
      `)}
      ${sectionTitle('Selected info (.selected-*)')}
      <div class="selected-row">
        <span class="selected-tag"><app-icon name="globe"></app-icon></span>
        <span class="selected-name">Ashkelon OSM</span>
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Keyboard-key indicators (rendered by the toolbar / KeyboardManager).
// ═══════════════════════════════════════════════════════════════════
export const KeyIndicators: StoryObj = {
  name: 'Key Indicators',
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 8px">Key Indicators</h2>
      <p
        style="margin:0 0 16px;color:var(--color-text-secondary);font-size:12px"
      >
        Keyboard-shortcut chips driven by the KeyboardManager.
      </p>
      ${row(html`
        <span class="key-indicator">V</span>
        <span class="key-indicator">G</span>
        <span class="key-indicator active">L</span>
        <span class="key-indicator flash">S</span>
        <span class="key-indicator">Ctrl</span>
        <span class="key-indicator">↑</span>
      `)}
      <div
        style="margin-top:14px;display:flex;gap:16px;font-size:11px;color:var(--color-text-secondary)"
      >
        <span>default</span><span>· <code>.active</code> (latched)</span
        ><span>· <code>.flash</code> (momentary)</span>
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Icon atom — <app-icon>. Full gallery lives under the "Icons" section.
// ═══════════════════════════════════════════════════════════════════
export const Icon: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 8px">Icon (&lt;app-icon&gt;)</h2>
      <p
        style="margin:0 0 16px;color:var(--color-text-secondary);font-size:12px"
      >
        The animated SVG icon element. See the <strong>Icons</strong> section
        for the full gallery and a live playground.
      </p>
      <div style="display:flex;gap:20px;align-items:center;font-size:40px">
        <app-icon name="car" animate></app-icon>
        <app-icon name="brain" animate></app-icon>
        <app-icon name="traffic-light" animate></app-icon>
        <app-icon name="road" animate></app-icon>
        <app-icon name="trophy" animate></app-icon>
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Tooltip — the shared global [data-tooltip] hint controller.
// ═══════════════════════════════════════════════════════════════════
export const Tooltip: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 8px">Tooltip (<code>[data-tooltip]</code>)</h2>
      <p
        style="margin:0 0 20px;color:var(--color-text-secondary);font-size:12px;max-width:560px"
      >
        A single <code>.app-tooltip</code> element appended to
        <code>&lt;body&gt;</code> is shared by every target, so hints escape any
        scrollable panel instead of being clipped. Shown after a short hover
        delay (or immediately on keyboard focus). Native <code>title</code>
        attributes are adopted automatically. Hover or tab to the controls
        below.
      </p>
      ${row(html`
        <button class="btn-sm" data-tooltip="Runs the training simulation">
          Hover me
        </button>
        <button class="toolbar-btn" data-tooltip="Graph editor (G)">
          <app-icon name="graph"></app-icon>
        </button>
        <span
          class="key-indicator"
          data-tooltip="Toggle the network visualizer"
          tabindex="0"
          >V</span
        >
        <button class="btn-sm" title="Adopted from a native title attribute">
          Native title
        </button>
      `)}
    `),
};
