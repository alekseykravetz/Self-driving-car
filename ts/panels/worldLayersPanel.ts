/**
 * <world-layers-panel> — a floating toolbar for the world editor that gives
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

class WorldLayersPanelElement extends HTMLElement {
  #visibility: WorldLayerVisibility = { ...DEFAULT_LAYER_VISIBILITY };
  #onChange: ((v: WorldLayerVisibility) => void) | null = null;
  #onRegenerate: (() => void) | null = null;

  constructor() {
    super();
    this.id = 'worldLayersPanel';
  }

  connectedCallback(): void {
    this.innerHTML = WorldLayersPanelElement.template;
    this.#render();
  }

  #render(): void {
    const container = this.querySelector('.world-layers-groups');
    if (!container) return;

    const toggles = WORLD_LAYER_BUTTONS.map(
      (b) =>
        `<button class="layer-toggle" data-layer="${b.id}" title="${b.title}">${b.emoji}</button>`,
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
      </div>`;

    this.querySelectorAll<HTMLButtonElement>('.layer-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.layer as WorldLayerId;
        this.#visibility[id] = !this.#visibility[id];
        this.#applyButtonState(btn, this.#visibility[id]);
        if (this.#onChange) this.#onChange({ ...this.#visibility });
      });
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
    btn.style.filter = on ? '' : 'grayscale(100%)';
    btn.style.opacity = on ? '1' : '0.5';
  }

  #syncButtons(): void {
    this.querySelectorAll<HTMLButtonElement>('.layer-toggle').forEach((btn) => {
      const id = btn.dataset.layer as WorldLayerId;
      this.#applyButtonState(btn, this.#visibility[id]);
    });
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

  static readonly template = WORLD_LAYERS_PANEL_TEMPLATE;
}

customElements.define('world-layers-panel', WorldLayersPanelElement);
