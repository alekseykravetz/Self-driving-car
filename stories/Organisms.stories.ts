import type { Meta, StoryObj } from '@storybook/web-components';

// Importing each organism module self-registers its custom element.
import '../ts/ui/organisms/trainingPanel.js';
import '../ts/ui/organisms/trafficPanel.js';
import '../ts/ui/organisms/humanTrainingPanel.js';
import '../ts/ui/organisms/storePanel.js';
import '../ts/ui/organisms/worldEditorPanel.js';
import '../ts/ui/organisms/trainingInitModal.js';
import '../ts/ui/organisms/humanTrainingConfigModal.js';
import '../ts/ui/organisms/previewSimulator.js';
import type { TrainingInitModalElement } from '../ts/ui/organisms/trainingInitModal.js';
import type { HumanTrainingConfigModalElement } from '../ts/ui/organisms/humanTrainingConfigModal.js';
import type { PreviewSimulatorElement } from '../ts/ui/organisms/previewSimulator.js';
import type { TrainingPanelElement } from '../ts/ui/organisms/trainingPanel.js';
import { DEFAULT_CAR_CONFIG } from '../ts/car/config.js';

/**
 * Organisms — the full feature panels and modal dialogs of the app
 * (`ts/ui/organisms/`). Each is the real custom element used in production,
 * rendered live so the chrome, layout and styling stay accurate.
 *
 * Panels are pure views driven by their host simulator; here we render them in
 * their default (unpopulated) state, which is exactly what the user sees on
 * first load before any cars/worlds exist.
 */
const meta: Meta = {
  title: 'Organisms',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/** App-coloured canvas around a live node. `sidebar` pins a fixed height so
 *  the full-height side panels render at their natural size. */
function stage(
  node: Node,
  opts: { sidebar?: boolean; note?: string } = {},
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = opts.sidebar
    ? 'height:100vh;display:flex;align-items:stretch;background:var(--color-bg-app);font-family:var(--font-ui);color:var(--color-text-primary)'
    : 'padding:32px;min-height:100vh;background:var(--color-bg-app);font-family:var(--font-ui);color:var(--color-text-primary);box-sizing:border-box';
  wrapper.appendChild(node);
  if (opts.note) {
    const p = document.createElement('p');
    p.style.cssText =
      'margin:0;padding:16px 24px;align-self:flex-start;font-size:11px;color:var(--color-text-secondary);max-width:520px';
    p.innerHTML = opts.note;
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
//  Training panel — side panel for the genetic-training simulator.
// ═══════════════════════════════════════════════════════════════════
export const TrainingPanel: StoryObj = {
  name: 'Training Panel',
  render: () => {
    const el = make('training-panel');
    el.id = 'trainingManagerPanel';
    // configure() wires up the event listeners (collapse toggles, idle row) and
    // populates the car-config summary. connectedCallback only sets innerHTML,
    // so without configure() the Car Config / idle sections are inert. The
    // callbacks are stubs — no simulator drives the panel in Storybook.
    requestAnimationFrame(() =>
      (el as TrainingPanelElement).configure({
        evaluateFitness: () => 0,
        getStartInfo: () => ({ x: 0, y: 0, angle: 0 }),
        onCarsCreated: () => {},
      }),
    );
    return stage(el, {
      sidebar: true,
      note: 'The genetic-training side panel: storage controls, generation stats, population/mutation/pool settings and the full car-config editor (click the <strong>Car Config</strong> header to expand). Live metrics are driven by the simulator at runtime.',
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Traffic panel — side panel for the Live Traffic Jam simulator.
// ═══════════════════════════════════════════════════════════════════
export const TrafficPanel: StoryObj = {
  name: 'Traffic Panel',
  render: () =>
    stage(make('traffic-panel'), {
      sidebar: true,
      note: 'Lists every car placed on the road with live status, speed and distance. Shown here in its empty state (no cars placed yet).',
    }),
};

// ═══════════════════════════════════════════════════════════════════
//  Human training panel — side panel for Human Backpropagation mode.
// ═══════════════════════════════════════════════════════════════════
export const HumanTrainingPanel: StoryObj = {
  name: 'Human Training Panel',
  render: () =>
    stage(make('human-training-panel'), {
      sidebar: true,
      note: 'Online imitation-learning panel: autopilot toggle, live accuracy, per-key match indicators, the learning-rate slider and a live brain inspector.',
    }),
};

// ═══════════════════════════════════════════════════════════════════
//  Store panel — landing-page asset & localStorage browser.
// ═══════════════════════════════════════════════════════════════════
export const StorePanel: StoryObj = {
  name: 'Store Panel',
  render: () => {
    const el = make('store-panel');
    // Match the landing page's `grid-column: span 3` width (~1120px) so the
    // header (icon + title + tabs) lays out on a single line as it does there.
    el.style.cssText = 'display:block;max-width:1120px;margin:0 auto';
    return stage(el, {
      note: 'Landing-page browser for preloaded store assets (worlds / cars) and localStorage state, with tabbed, sortable tables.',
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  World-editor panel — road-drawing brush + segment inspector.
// ═══════════════════════════════════════════════════════════════════
export const WorldEditorPanel: StoryObj = {
  name: 'World Editor Panel',
  render: () => {
    const el = make('world-editor-panel');
    el.style.cssText = 'display:block;max-width:280px';
    return stage(el, {
      note: 'Road-drawing metadata brush (type, lanes, one-way, name, speed, ref…) plus the Path Tools and the click-to-inspect segment editor.',
    });
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Training-init modal — blocking dialog shown before training starts.
// ═══════════════════════════════════════════════════════════════════
export const TrainingInitModal: StoryObj = {
  name: 'Training Init Modal',
  render: () => {
    const el = make('training-init-modal');
    requestAnimationFrame(() =>
      (el as TrainingInitModalElement).open({
        context: 'entry',
        defaults: {
          carCount: 100,
          poolSize: 10,
          mutationRate: 0.1,
          idleRange: 200,
          carConfig: DEFAULT_CAR_CONFIG,
        },
        onStart: () => {},
        onCancel: () => {},
      }),
    );
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'min-height:100vh;background:var(--color-bg-app);font-family:var(--font-ui)';
    wrapper.appendChild(el);
    return wrapper;
  },
};

// ═══════════════════════════════════════════════════════════════════
//  Preview simulator — landing-page live-traffic showcase.
// ═══════════════════════════════════════════════════════════════════
export const PreviewSimulator: StoryObj = {
  name: 'Preview Simulator',
  render: () => {
    const el = make('preview-simulator') as PreviewSimulatorElement;
    // The element canvas fills its box; give it an explicit size here (in
    // production it flexes to fill the sliding Live Preview card).
    el.style.cssText =
      'display:block;width:100%;max-width:960px;height:460px;border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--color-border-subtle)';
    // Start the live loop once connected. It loads a bundled store world/cars
    // (served via Storybook `staticDirs`); blank if none are available.
    requestAnimationFrame(() => void el.activate());
    return stage(el, {
      note: 'The landing page’s live "traffic showcase": ~20 trained cars driving a real store map on their own, crashing and respawning, with the camera easing toward the swarm. Runs its own tiny RAF loop (not <code>SimulatorShell</code>) and is inert until <code>activate()</code>.',
    });
  },
};
export const HumanTrainingConfigModal: StoryObj = {
  name: 'Human Training Config Modal',
  render: () => {
    const el = make('human-training-config-modal');
    requestAnimationFrame(() =>
      (el as HumanTrainingConfigModalElement).open({
        defaults: DEFAULT_CAR_CONFIG,
        lockedToSavedBrain: false,
        onStart: () => {},
        onCancel: () => {},
      }),
    );
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'min-height:100vh;background:var(--color-bg-app);font-family:var(--font-ui)';
    wrapper.appendChild(el);
    return wrapper;
  },
};
