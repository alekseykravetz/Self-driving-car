type BorderMode = 'none' | 'damage' | 'collision';
type TrackingMode = 'none' | 'best' | 'keys';

class TopControlsPanelElement extends HTMLElement {
  private _borderMode: BorderMode = 'damage';
  private _trackingMode: TrackingMode = 'best';

  private onBorderModeChange: ((mode: BorderMode) => void) | null = null;
  private onTrackingModeChange: ((mode: TrackingMode) => void) | null = null;

  constructor() {
    super();
    this.id = 'topControls';
  }

  connectedCallback(): void {
    this.innerHTML = TopControlsPanelElement.template;
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initWorldLoader();
    this.#initCarLoader();
  }

  get borderMode(): BorderMode {
    return this._borderMode;
  }

  get trackingMode(): TrackingMode {
    return this._trackingMode;
  }

  setBorderModeListener(listener: (mode: BorderMode) => void): void {
    this.onBorderModeChange = listener;
  }

  setTrackingModeListener(listener: (mode: TrackingMode) => void): void {
    this.onTrackingModeChange = listener;
  }

  hideGroups(...groups: string[]): void {
    for (const name of groups) {
      const el = this.querySelector(`[data-group="${name}"]`);
      if (el) (el as HTMLElement).style.display = 'none';
    }
  }

  #initBorderModeButtons(): void {
    const buttons = {
      none: this.querySelector('#borderModeNone') as HTMLButtonElement | null,
      damage: this.querySelector(
        '#borderModeDamage',
      ) as HTMLButtonElement | null,
      collision: this.querySelector(
        '#borderModeCollision',
      ) as HTMLButtonElement | null,
    };

    const setActive = (mode: BorderMode) => {
      this._borderMode = mode;
      Object.entries(buttons).forEach(([key, btn]) => {
        if (btn) {
          btn.classList.toggle('active', key === mode);
        }
      });
      if (this.onBorderModeChange) this.onBorderModeChange(mode);
    };

    buttons.none?.addEventListener('click', () => setActive('none'));
    buttons.damage?.addEventListener('click', () => setActive('damage'));
    buttons.collision?.addEventListener('click', () => setActive('collision'));
  }

  #initTrackingModeButtons(): void {
    const buttons = {
      none: this.querySelector('#trackModeNone') as HTMLButtonElement | null,
      best: this.querySelector('#trackModeBest') as HTMLButtonElement | null,
      keys: this.querySelector('#trackModeKeys') as HTMLButtonElement | null,
    };

    const setActive = (mode: TrackingMode) => {
      this._trackingMode = mode;
      Object.entries(buttons).forEach(([key, btn]) => {
        if (btn) {
          btn.classList.toggle('active', key === mode);
        }
      });
      if (this.onTrackingModeChange) this.onTrackingModeChange(mode);
    };

    buttons.none?.addEventListener('click', () => setActive('none'));
    buttons.best?.addEventListener('click', () => setActive('best'));
    buttons.keys?.addEventListener('click', () => setActive('keys'));
  }

  #initWorldLoader(): void {
    const loadInput = this.querySelector(
      '#loadWorldInput',
    ) as HTMLInputElement | null;
    if (loadInput) {
      loadInput.addEventListener('change', () => {
        // Dispatch a custom event so external code can handle the file
        const file = loadInput.files?.[0];
        if (file) {
          this.dispatchEvent(
            new CustomEvent('world-file-selected', { detail: { file } }),
          );
        }
      });
    }
  }

  #initCarLoader(): void {
    // CarLoader instance in simulator.ts binds directly to #loadCarInput
    // No additional event dispatch needed here
  }

  static readonly template = `
    <div class="controls-group" data-group="world">
      <span class="controls-group-label">World</span>
      <label for="loadWorldInput" class="file-input-label top-controls-btn">
        📁
        <input type="file" id="loadWorldInput" accept=".world" />
      </label>
    </div>

    <div class="controls-group" data-group="car">
      <span class="controls-group-label">Car</span>
      <label for="loadCarInput" class="file-input-label top-controls-btn">
        🚗
        <input type="file" id="loadCarInput" accept=".car,.json" multiple />
      </label>
    </div>

    <div class="controls-separator" data-group="borders-sep"></div>

    <div class="controls-group" data-group="borders">
      <span class="controls-group-label">Borders</span>
      <div class="border-mode-group">
        <button
          id="borderModeNone"
          class="border-mode-btn"
          title="No borders"
        >
          🚫
        </button>
        <button
          id="borderModeDamage"
          class="border-mode-btn active"
          title="Damage on collision"
        >
          💀
        </button>
        <button
          id="borderModeCollision"
          class="border-mode-btn"
          title="Collision with borders"
        >
          🛡️
        </button>
      </div>
    </div>

    <div class="controls-separator" data-group="tracking-sep"></div>

    <div class="controls-group" data-group="tracking">
      <span class="controls-group-label">Tracking</span>
      <div class="border-mode-group">
        <button
          id="trackModeNone"
          class="border-mode-btn"
          title="No tracking (free drag)"
        >
          ✋
        </button>
        <button
          id="trackModeBest"
          class="border-mode-btn active"
          title="Track best car"
        >
          🏆
        </button>
        <button
          id="trackModeKeys"
          class="border-mode-btn"
          title="Track user-controlled car"
        >
          🎮
        </button>
      </div>
    </div>
  `;
}

customElements.define('top-controls-panel', TopControlsPanelElement);
