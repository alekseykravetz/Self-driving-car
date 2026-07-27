import { html, type TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

/**
 * Live previews of the actual app pages, embedded via iframe.
 *
 * These require the project's static dev server to be running on :9090
 * (`npm run serve` or `npm start`) and the TS to be compiled to `js/`
 * (`npm run rebuild` or the `tsc --watch` from `npm start`).
 */
const meta: Meta = {
  title: 'Project Views',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const BASE = 'http://localhost:9090';

const frame = (
  title: string,
  path: string,
  note?: string,
): TemplateResult => html`
  <div
    style="display:flex;flex-direction:column;height:100vh;background:var(--color-bg-app);color:var(--color-text-primary);font-family:var(--font-ui)"
  >
    <div
      style="padding:10px 16px;border-bottom:1px solid var(--color-border-subtle);display:flex;gap:12px;align-items:baseline"
    >
      <strong>${title}</strong>
      <code style="font-size:11px;color:var(--color-text-secondary)"
        >${BASE}${path}</code
      >
      ${note
        ? html`<span style="font-size:11px;color:var(--color-accent-yellow)"
            >${note}</span
          >`
        : null}
    </div>
    <iframe
      src="${BASE}${path}"
      title="${title}"
      style="flex:1;width:100%;border:0;background:#000"
    ></iframe>
    <div
      style="padding:8px 16px;font-size:11px;color:var(--color-text-secondary);border-top:1px solid var(--color-border-subtle)"
    >
      Requires <code>npm run serve</code> (or <code>npm start</code>) on port
      9090. If blank, start the server and reload.
    </div>
  </div>
`;

export const Landing: StoryObj = {
  render: () => frame('Landing', '/index.html'),
};
export const Simulator: StoryObj = {
  render: () => frame('Training Simulator', '/html/simulator.html'),
};
export const Traffic: StoryObj = {
  render: () => frame('Live Traffic', '/html/traffic.html'),
};
export const Race: StoryObj = {
  render: () => frame('Race', '/html/race.html'),
};
export const WorldEditor: StoryObj = {
  name: 'World Editor',
  render: () => frame('World Editor', '/html/world.html'),
};
export const HumanTraining: StoryObj = {
  name: 'Human Backprop',
  render: () => frame('Human Backpropagation', '/html/human-training.html'),
};
