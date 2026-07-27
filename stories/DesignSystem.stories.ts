import { html, type TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

const meta: Meta = {
  title: 'Design System',
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

// ═══════════════════════════════════════════════════════════════════
//  Colours
// ═══════════════════════════════════════════════════════════════════
const COLOR_GROUPS: Record<string, string[]> = {
  Backgrounds: [
    '--color-bg-app',
    '--color-bg-surface',
    '--color-bg-surface-raised',
    '--color-bg-hover',
    '--color-bg-active',
    '--color-bg-toolbar',
    '--color-bg-input',
  ],
  Text: [
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-text-dim',
    '--color-text-inverse',
  ],
  Accents: [
    '--color-accent-green',
    '--color-accent-green-strong',
    '--color-accent-red',
    '--color-accent-yellow',
    '--color-accent-blue',
    '--color-accent-indigo',
    '--color-accent-orange',
    '--color-accent-cyan',
    '--color-accent-gold',
    '--color-accent-sky',
  ],
  Borders: [
    '--color-border-subtle',
    '--color-border-default',
    '--color-border-strong',
    '--color-border-input',
  ],
};

const swatch = (token: string): TemplateResult => html`
  <div
    style="display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);background:var(--color-bg-surface-raised)"
  >
    <div
      style="height:44px;border-radius:var(--radius-sm);background:var(${token});border:1px solid var(--color-border-subtle)"
    ></div>
    <code style="font-size:10px;color:var(--color-text-primary)">${token}</code>
  </div>
`;

export const Colors: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0">Colour Tokens</h2>
      ${Object.entries(COLOR_GROUPS).map(
        ([group, tokens]) => html`
          ${sectionTitle(group)}
          <div
            style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px"
          >
            ${tokens.map(swatch)}
          </div>
        `,
      )}
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Typography
// ═══════════════════════════════════════════════════════════════════
const TEXT_SIZES = [
  '--text-xs',
  '--text-sm',
  '--text-base',
  '--text-md',
  '--text-lg',
  '--text-xl',
  '--text-2xl',
  '--text-3xl',
];

export const Typography: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 8px">Typography</h2>
      ${sectionTitle('Font families')}
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="font-family:var(--font-ui);font-size:16px">
          Arial UI — <code>--font-ui</code> · The quick brown fox 0123
        </div>
        <div style="font-family:var(--font-mono);font-size:16px">
          Courier Mono — <code>--font-mono</code> · The quick brown fox 0123
        </div>
        <div style="font-family:var(--font-display);font-size:16px">
          Inter Display — <code>--font-display</code> · The quick brown fox 0123
        </div>
      </div>
      ${sectionTitle('Type scale')}
      <div style="display:flex;flex-direction:column;gap:8px">
        ${TEXT_SIZES.map(
          (t) => html`
            <div style="display:flex;align-items:baseline;gap:14px">
              <code
                style="width:110px;font-size:11px;color:var(--color-text-secondary)"
                >${t}</code
              >
              <span style="font-size:var(${t})"
                >Self-driving car simulator</span
              >
            </div>
          `,
        )}
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Spacing & Radii
// ═══════════════════════════════════════════════════════════════════
const SPACES = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-8',
  '--space-10',
  '--space-12',
];
const RADII = [
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-2xl',
];

export const SpacingAndRadii: StoryObj = {
  name: 'Spacing & Radii',
  render: () =>
    wrap(html`
      <h2 style="margin:0">Spacing &amp; Radii</h2>
      ${sectionTitle('Spacing scale')}
      <div style="display:flex;flex-direction:column;gap:6px">
        ${SPACES.map(
          (s) => html`
            <div style="display:flex;align-items:center;gap:12px">
              <code
                style="width:100px;font-size:11px;color:var(--color-text-secondary)"
                >${s}</code
              >
              <div
                style="height:14px;width:var(${s});background:var(--color-accent-cyan);border-radius:2px"
              ></div>
            </div>
          `,
        )}
      </div>
      ${sectionTitle('Border radius')}
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        ${RADII.map(
          (r) => html`
            <div
              style="display:flex;flex-direction:column;align-items:center;gap:6px"
            >
              <div
                style="width:64px;height:64px;background:var(--color-bg-active);border:1px solid var(--color-border-default);border-radius:var(${r})"
              ></div>
              <code style="font-size:10px;color:var(--color-text-secondary)"
                >${r}</code
              >
            </div>
          `,
        )}
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Atoms — buttons, key indicators, inputs
// ═══════════════════════════════════════════════════════════════════
export const Buttons: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0">Buttons</h2>
      ${sectionTitle('Large action buttons (.btn-lg)')}
      <div style="max-width:280px;display:flex;flex-direction:column;gap:8px">
        <button class="btn-lg"><app-icon name="save"></app-icon> Save</button>
        <button class="btn-lg"><app-icon name="trash"></app-icon> Clear</button>
        <button class="btn-lg">
          <app-icon name="export"></app-icon> Export
        </button>
      </div>
      ${sectionTitle('Toolbar buttons (.toolbar-btn)')}
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:20px">
        ${['graph', 'inspect', 'marking', 'regenerate', 'gear', 'trash'].map(
          (n) => html`
            <button class="toolbar-btn">
              <app-icon name="${n}"></app-icon>
            </button>
          `,
        )}
      </div>
      ${sectionTitle('Number buttons (.num-btn)')}
      <div style="display:flex;gap:8px">
        <button class="num-btn"><app-icon name="minus"></app-icon></button>
        <button class="num-btn"><app-icon name="plus"></app-icon></button>
      </div>
    `),
};

export const KeyIndicators: StoryObj = {
  name: 'Key Indicators',
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 8px">Key Indicators</h2>
      <p
        style="margin:0 0 16px;color:var(--color-text-secondary);font-size:12px"
      >
        Keyboard-shortcut chips rendered by the toolbar / KeyboardManager.
      </p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span class="key-indicator">V</span>
        <span class="key-indicator">G</span>
        <span class="key-indicator active">L</span>
        <span class="key-indicator flash">S</span>
        <span class="key-indicator">Ctrl</span>
        <span class="key-indicator">↑</span>
      </div>
      <div
        style="margin-top:14px;display:flex;gap:16px;font-size:11px;color:var(--color-text-secondary)"
      >
        <span>default</span><span>· <code>.active</code> (latched)</span
        ><span>· <code>.flash</code> (momentary)</span>
      </div>
    `),
};
