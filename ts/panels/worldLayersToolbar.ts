import type { WorldLayerId, WorldLayerVisibility } from '../world/types.js';
import { DEFAULT_LAYER_VISIBILITY } from '../world/types.js';
import { WORLD_LAYERS_TOOLBAR_TEMPLATE } from './templates/worldLayersToolbarTemplate.js';

/**
 * <world-layers-toolbar> — a floating toolbar for the world editor that gives
 * independent visibility control over each world layer (roads, markings,
 * corridors, item bases, trees, buildings) via emoji toggle buttons, plus a
 * "Regenerate items" (♻️) action that rebuilds the expensive building/tree
 * placement on demand.
 *
 * Visibility is a local editor preference (owned/persisted by the editor to
 * localStorage), not world state. The panel only reflects state and emits
 * change/regenerate events; it performs no generation itself.
 *
 * Kept `_a`-free (static `readonly template = CONST`; `customElements.define`
 * outside the class; file-scope button metadata) — see the storePanel pattern.
 */

/** Ordered layer buttons: emoji glyph + tooltip per WorldLayerId. */
const WORLD_LAYER_BUTTONS: {
  id: WorldLayerId;
  emoji: string;
  title: string;
}[] = [
  {
    id: 'roads',
    emoji: '🛣️',
    title: 'Roads — asphalt, borders, lane & direction markings',
  },
  { id: 'markings', emoji: '🚦', title: 'Markings — stop/yield/light/etc.' },
  { id: 'corridors', emoji: '🛤️', title: 'Corridors — authored corridors' },
  {
    id: 'itemBases',
    emoji: '📍',
    title: 'Item bases — flat building footprints & tree base circles',
  },
  { id: 'trees', emoji: '🌳', title: 'Trees — rendered 3D trees' },
  { id: 'buildings', emoji: '🏢', title: 'Buildings — rendered 3D buildings' },
];

export class WorldLayersToolbarElement extends HTMLElement {
  #visibility: WorldLayerVisibility = { ...DEFAULT_LAYER_VISIBILITY };
  #showHeatmap: boolean = false;
  #onChange: ((v: WorldLayerVisibility) => void) | null = null;
  #onRegenerate: (() => void) | null = null;
  #onHeatmapChange: ((on: boolean) => void) | null = null;

  constructor() {
    super();
    this.id = 'worldLayersToolbar';
  }

  connectedCallback(): void {
    this.innerHTML = WorldLayersToolbarElement.template;
    this.#render();
  }

  #render(): void {
    const container = this.querySelector('.world-layers-groups');
    if (!container) return;

    const toggles = WORLD_LAYER_BUTTONS.map(
      (b) =>
        `<button class="toolbar-btn layer-toggle" data-layer="${b.id}" title="${b.title}">${b.emoji}</button>`,
    ).join('');

    container.innerHTML = `
      <div class="controls-group">
        <span class="controls-group-label">Layers</span>
        <div class="world-layers-keys">${toggles}</div>
      </div>
      <div class="controls-separator" data-items></div>
      <div class="controls-group" data-items>
        <span class="controls-group-label">Items</span>
        <div class="world-layers-keys">
          <button id="regenerateItemsBtn" title="Regenerate items — rebuild buildings & trees">♻️</button>
        </div>
      </div>
      <div class="controls-separator" data-overlays></div>
      <div class="controls-group" data-overlays>
        <span class="controls-group-label">Overlays</span>
        <div class="world-layers-keys">
          <button id="showHeatmapBtn" class="toolbar-btn layer-toggle" title="Traffic congestion heatmap — paint vehicle occupancy per grid cell">🌡️</button>
        </div>
      </div>`;

    this.querySelectorAll<HTMLButtonElement>('.layer-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.layer as WorldLayerId;
        this.#visibility[id] = !this.#visibility[id];
        this.#applyButtonState(btn, this.#visibility[id]);
        if (this.#onChange) this.#onChange({ ...this.#visibility });
      });
    });

    const heatmapBtn = this.querySelector<HTMLButtonElement>('#showHeatmapBtn');
    heatmapBtn?.addEventListener('click', () => {
      this.#showHeatmap = !this.#showHeatmap;
      this.#applyButtonState(heatmapBtn, this.#showHeatmap);
      if (this.#onHeatmapChange) this.#onHeatmapChange(this.#showHeatmap);
    });

    const regenBtn = this.querySelector<HTMLButtonElement>(
      '#regenerateItemsBtn',
    );
    regenBtn?.addEventListener('click', () => {
      if (this.#onRegenerate) this.#onRegenerate();
    });

    this.#syncButtons();
  }

  #applyButtonState(btn: HTMLButtonElement, on: boolean): void {
    btn.classList.toggle('active', on);
  }

  #syncButtons(): void {
    this.querySelectorAll<HTMLButtonElement>('.layer-toggle').forEach((btn) => {
      const id = btn.dataset.layer as WorldLayerId;
      this.#applyButtonState(btn, this.#visibility[id]);
    });
    const heatmapBtn = this.querySelector<HTMLButtonElement>('#showHeatmapBtn');
    if (heatmapBtn) this.#applyButtonState(heatmapBtn, this.#showHeatmap);
  }

  /** Replace the visibility state and refresh the buttons. */
  setVisibility(v: WorldLayerVisibility): void {
    this.#visibility = { ...v };
    this.#syncButtons();
  }

  /** Current visibility state (a copy). */
  getVisibility(): WorldLayerVisibility {
    return { ...this.#visibility };
  }

  /** Register a handler called whenever a layer toggle changes. */
  setChangeListener(cb: (v: WorldLayerVisibility) => void): void {
    this.#onChange = cb;
  }

  /** Register a handler called when the ♻️ Regenerate items action is clicked. */
  setRegenerateListener(cb: () => void): void {
    this.#onRegenerate = cb;
  }

  /** Current heatmap overlay visibility. */
  get showHeatmap(): boolean {
    return this.#showHeatmap;
  }

  /** Set the heatmap overlay state and refresh the button. */
  setShowHeatmap(on: boolean): void {
    this.#showHeatmap = on;
    const btn = this.querySelector<HTMLButtonElement>('#showHeatmapBtn');
    if (btn) this.#applyButtonState(btn, on);
  }

  /** Register a handler called when the 🌡️ heatmap toggle changes. */
  setHeatmapChangeListener(cb: (on: boolean) => void): void {
    this.#onHeatmapChange = cb;
  }

  /** Toggle the "items outdated" indicator on the regenerate button. */
  setStale(stale: boolean): void {
    const btn = this.querySelector<HTMLButtonElement>('#regenerateItemsBtn');
    if (btn) btn.classList.toggle('stale', stale);
  }

  /** Toggle the "busy" indicator on the regenerate button. */
  setBusy(busy: boolean): void {
    const btn = this.querySelector<HTMLButtonElement>('#regenerateItemsBtn');
    if (btn) {
      btn.classList.toggle('busy', busy);
      btn.disabled = busy;
    }
  }

  /**
   * Hide the "Items" group (the ♻️ Regenerate action). Used by simulators, which
   * render a static loaded world and never regenerate items.
   */
  hideItems(): void {
    this.querySelectorAll<HTMLElement>('[data-items]').forEach((el) => {
      el.style.display = 'none';
    });
  }

  /**
   * Hide the "Overlays" group (the 🌡️ heatmap toggle). Used by the world
   * editor, which has no live traffic to record; simulators keep it visible.
   */
  hideOverlays(): void {
    this.querySelectorAll<HTMLElement>('[data-overlays]').forEach((el) => {
      el.style.display = 'none';
    });
  }

  static readonly template = WORLD_LAYERS_TOOLBAR_TEMPLATE;
}

customElements.define('world-layers-toolbar', WorldLayersToolbarElement);
