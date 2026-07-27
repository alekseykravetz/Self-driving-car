import { html, type TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import type { IconName } from '../ts/ui/atoms/iconRegistry.js';
import {
  ALL_ICON_NAMES,
  CATEGORY_ORDER,
  metaFor,
  type IconMeta,
} from './iconMeta.js';

const meta: Meta = {
  title: 'Icons',
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

// ── Shared bits ────────────────────────────────────────────────────
const wrap = (inner: TemplateResult): TemplateResult => html`
  <div
    style="padding:24px;color:var(--color-text-primary);font-family:var(--font-ui);background:var(--color-bg-app);min-height:100vh;box-sizing:border-box"
  >
    ${inner}
  </div>
`;

const badge = (
  label: string,
  kind: 'idle' | 'hover' | 'none',
): TemplateResult => {
  const bg =
    kind === 'idle'
      ? 'var(--color-accent-green-bg)'
      : kind === 'hover'
        ? 'var(--color-accent-blue-bg)'
        : 'var(--color-bg-surface-raised)';
  const fg =
    kind === 'idle'
      ? 'var(--color-accent-green)'
      : kind === 'hover'
        ? 'var(--color-accent-blue)'
        : 'var(--color-text-secondary)';
  return html`<span
    style="display:inline-block;font-size:9px;padding:2px 6px;border-radius:999px;background:${bg};color:${fg};white-space:nowrap"
    >${label}</span
  >`;
};

// ═══════════════════════════════════════════════════════════════════
//  Gallery — every icon, grouped by category, idle animation ON.
//  Hover any tile to see its hover reaction.
// ═══════════════════════════════════════════════════════════════════
const iconTile = (name: IconName): TemplateResult => {
  const m = metaFor(name);
  return html`
    <div
      class="card"
      title="${m.desc}"
      style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);background:var(--color-bg-surface-raised);cursor:pointer;text-align:center"
    >
      <span
        style="font-size:32px;line-height:1;color:var(--color-text-primary)"
      >
        <app-icon name="${name}" animate label="${name}"></app-icon>
      </span>
      <code style="font-size:10px;color:var(--color-text-primary)"
        >${name}</code
      >
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
        ${m.idle ? badge('idle', 'idle') : null}
        ${m.hover ? badge('hover', 'hover') : null}
        ${!m.idle && !m.hover ? badge('static', 'none') : null}
      </div>
    </div>
  `;
};

export const Gallery: StoryObj = {
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 4px">Icon Gallery</h2>
      <p
        style="margin:0 0 20px;color:var(--color-text-secondary);font-size:13px"
      >
        ${ALL_ICON_NAMES.length} icons. Idle animations are ON here (via the
        <code>animate</code> attribute). Hover any tile to trigger its hover
        reaction.
      </p>
      ${CATEGORY_ORDER.map((cat) => {
        const names = ALL_ICON_NAMES.filter((n) => metaFor(n).category === cat);
        if (names.length === 0) return null;
        return html`
          <section style="margin-bottom:28px">
            <h3
              style="margin:0 0 12px;font-size:12px;letter-spacing:0.05em;text-transform:uppercase;color:var(--color-text-secondary)"
            >
              ${cat} · ${names.length}
            </h3>
            <div
              style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px"
            >
              ${names.map(iconTile)}
            </div>
          </section>
        `;
      })}
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Playground — single icon with live controls.
// ═══════════════════════════════════════════════════════════════════
interface PlaygroundArgs {
  name: IconName;
  animate: boolean;
  size: number;
  color: string;
  colorA: string;
}

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    name: {
      control: 'select',
      options: ALL_ICON_NAMES,
      description: 'Icon name from the registry',
    },
    animate: {
      control: 'boolean',
      description: 'Enable the idle looping animation',
    },
    size: { control: { type: 'range', min: 16, max: 200, step: 4 } },
    color: {
      control: 'color',
      description: 'currentColor (monochrome icons)',
    },
    colorA: {
      control: 'color',
      description: '--icon-a (multi-colour icons: traffic-light, stop, …)',
    },
  },
  args: {
    name: 'traffic-light',
    animate: true,
    size: 96,
    color: '#e8e8e8',
    colorA: '#d9534f',
  },
  render: (args) =>
    wrap(html`
      <div
        style="display:flex;flex-direction:column;align-items:center;gap:16px"
      >
        <button
          class="toolbar-btn"
          style="font-size:${args.size}px;color:${args.color};--icon-a:${args.colorA};padding:24px;line-height:1"
          title="Hover me to trigger hover animations"
        >
          <app-icon
            name="${args.name}"
            ?animate="${args.animate}"
            label="${args.name}"
          ></app-icon>
        </button>
        <p style="color:var(--color-text-secondary);font-size:12px;margin:0">
          Hover the button above to see the hover reaction. Toggle
          <code>animate</code> for the idle loop.
        </p>
      </div>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Animation Reference — the table of every icon + trigger.
// ═══════════════════════════════════════════════════════════════════
const cell =
  'padding:8px 10px;border-bottom:1px solid var(--color-border-subtle);vertical-align:top;font-size:12px';
const head =
  'padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-secondary);border-bottom:2px solid var(--color-border-default)';

const row = (name: IconName): TemplateResult => {
  const m: IconMeta = metaFor(name);
  const animated = Boolean(m.idle || m.hover);
  return html`
    <tr>
      <td
        style="${cell};text-align:center;font-size:22px;color:var(--color-text-primary)"
      >
        <app-icon name="${name}" animate label="${name}"></app-icon>
      </td>
      <td style="${cell}"><code>${name}</code></td>
      <td style="${cell};color:var(--color-text-secondary)">${m.desc}</td>
      <td style="${cell}">
        ${animated
          ? html`<span style="color:var(--color-accent-green)">● Yes</span>`
          : html`<span style="color:var(--color-text-secondary)">○ No</span>`}
      </td>
      <td style="${cell}">${m.idle ?? '—'}</td>
      <td style="${cell}">${m.hover ?? '—'}</td>
      <td style="${cell};color:var(--color-accent-yellow)">${m.note ?? ''}</td>
    </tr>
  `;
};

export const AnimationReference: StoryObj = {
  name: 'Animation Reference',
  render: () =>
    wrap(html`
      <h2 style="margin:0 0 4px">Animation Reference</h2>
      <p
        style="margin:0 0 8px;color:var(--color-text-secondary);font-size:13px"
      >
        Every icon, whether it animates, the idle loop (needs
        <code>animate</code> attribute) and the hover reaction (fires on
        icon/button hover). The <b>Note</b> column flags parts that look
        animatable but have no keyframe wired up yet.
      </p>
      <table
        style="border-collapse:collapse;width:100%;color:var(--color-text-primary)"
      >
        <thead>
          <tr>
            <th style="${head}"></th>
            <th style="${head}">Name</th>
            <th style="${head}">Description</th>
            <th style="${head}">Animated?</th>
            <th style="${head}">Idle (needs <code>animate</code>)</th>
            <th style="${head}">Hover trigger</th>
            <th style="${head}">Note</th>
          </tr>
        </thead>
        <tbody>
          ${ALL_ICON_NAMES.map(row)}
        </tbody>
      </table>
    `),
};
