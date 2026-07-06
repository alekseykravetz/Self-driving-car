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
const WORLD_LAYER_BUTTONS = [
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
    #visibility = { ...DEFAULT_LAYER_VISIBILITY };
    #onChange = null;
    #onRegenerate = null;
    constructor() {
        super();
        this.id = 'worldLayersToolbar';
    }
    connectedCallback() {
        this.innerHTML = WorldLayersToolbarElement.template;
        this.#render();
    }
    #render() {
        const container = this.querySelector('.world-layers-groups');
        if (!container)
            return;
        const toggles = WORLD_LAYER_BUTTONS.map((b) => `<button class="toolbar-btn layer-toggle" data-layer="${b.id}" title="${b.title}">${b.emoji}</button>`).join('');
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
        this.querySelectorAll('.layer-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.layer;
                this.#visibility[id] = !this.#visibility[id];
                this.#applyButtonState(btn, this.#visibility[id]);
                if (this.#onChange)
                    this.#onChange({ ...this.#visibility });
            });
        });
        const regenBtn = this.querySelector('#regenerateItemsBtn');
        regenBtn?.addEventListener('click', () => {
            if (this.#onRegenerate)
                this.#onRegenerate();
        });
        this.#syncButtons();
    }
    #applyButtonState(btn, on) {
        btn.classList.toggle('active', on);
    }
    #syncButtons() {
        this.querySelectorAll('.layer-toggle').forEach((btn) => {
            const id = btn.dataset.layer;
            this.#applyButtonState(btn, this.#visibility[id]);
        });
    }
    /** Replace the visibility state and refresh the buttons. */
    setVisibility(v) {
        this.#visibility = { ...v };
        this.#syncButtons();
    }
    /** Current visibility state (a copy). */
    getVisibility() {
        return { ...this.#visibility };
    }
    /** Register a handler called whenever a layer toggle changes. */
    setChangeListener(cb) {
        this.#onChange = cb;
    }
    /** Register a handler called when the ♻️ Regenerate items action is clicked. */
    setRegenerateListener(cb) {
        this.#onRegenerate = cb;
    }
    /** Toggle the "items outdated" indicator on the regenerate button. */
    setStale(stale) {
        const btn = this.querySelector('#regenerateItemsBtn');
        if (btn)
            btn.classList.toggle('stale', stale);
    }
    /** Toggle the "busy" indicator on the regenerate button. */
    setBusy(busy) {
        const btn = this.querySelector('#regenerateItemsBtn');
        if (btn) {
            btn.classList.toggle('busy', busy);
            btn.disabled = busy;
        }
    }
    /**
     * Hide the "Items" group (the ♻️ Regenerate action). Used by simulators, which
     * render a static loaded world and never regenerate items.
     */
    hideItems() {
        this.querySelectorAll('[data-items]').forEach((el) => {
            el.style.display = 'none';
        });
    }
    static template = WORLD_LAYERS_TOOLBAR_TEMPLATE;
}
customElements.define('world-layers-toolbar', WorldLayersToolbarElement);
