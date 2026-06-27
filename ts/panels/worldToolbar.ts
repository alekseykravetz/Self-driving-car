type BorderMode = 'none' | 'damage' | 'collision';
type TrackingMode = 'none' | 'best' | 'keys';
type ToolbarViewportMode = 'mouse' | 'touchpad';

class WorldToolbarElement extends HTMLElement {
  private _borderMode: BorderMode = 'damage';
  private _trackingMode: TrackingMode = 'best';
  private _viewportMode: ToolbarViewportMode = 'mouse';

  private onBorderModeChange: ((mode: BorderMode) => void) | null = null;
  private onTrackingModeChange: ((mode: TrackingMode) => void) | null = null;
  private onViewportModeChange: ((mode: ToolbarViewportMode) => void) | null =
    null;

  // --- Asset selectors (world / car library + selection) ---
  #carSelectMode: 'multi' | 'single' = 'multi';
  #selectOnWorldFileLoad = false;
  #selectorsReady = false;
  #onWorldSelected: ((entry: UnifiedWorldEntry | null) => void) | null = null;
  #onCarsSelected: ((cars: CarInfo[]) => void) | null = null;

  constructor() {
    super();
    this.id = 'topControls';
  }

  connectedCallback(): void {
    this.innerHTML = WorldToolbarElement.template;
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initViewportModeButtons();
  }

  get borderMode(): BorderMode {
    return this._borderMode;
  }

  get trackingMode(): TrackingMode {
    return this._trackingMode;
  }

  get viewportMode(): ToolbarViewportMode {
    return this._viewportMode;
  }

  get showCameraDebug(): boolean {
    const el = this.querySelector(
      '#showCameraDebug',
    ) as HTMLInputElement | null;
    return el ? el.checked : false;
  }

  hideCameraDebug(): void {
    this.hideGroups('debug', 'debug-sep');
  }

  setBorderModeListener(listener: (mode: BorderMode) => void): void {
    this.onBorderModeChange = listener;
  }

  setTrackingModeListener(listener: (mode: TrackingMode) => void): void {
    this.onTrackingModeChange = listener;
  }

  /** Programmatically set the tracking mode and sync the button states. */
  setTrackingMode(mode: TrackingMode): void {
    this._trackingMode = mode;
    const buttons: Record<TrackingMode, HTMLButtonElement | null> = {
      none: this.querySelector('#trackModeNone'),
      best: this.querySelector('#trackModeBest'),
      keys: this.querySelector('#trackModeKeys'),
    };
    Object.entries(buttons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === mode);
    });
    if (this.onTrackingModeChange) this.onTrackingModeChange(mode);
  }

  setViewportModeListener(listener: (mode: ToolbarViewportMode) => void): void {
    this.onViewportModeChange = listener;
  }

  /**
   * Reveal the World Editor action buttons (Save / Dispose / OSM Import) inside
   * the World group. Hidden by default so simulator/race/traffic pages only show
   * the world/car file inputs.
   */
  showWorldEditorActions(): void {
    this.querySelectorAll<HTMLElement>('.world-editor-action').forEach((el) => {
      el.style.display = '';
    });
  }

  // ── Asset selectors (world / car library) ───────────

  /**
   * Enable the world + car asset selectors. Reveals the "Selected" section,
   * binds the file inputs (loading a file adds it to the library without
   * selecting it, unless `selectOnWorldFileLoad` is set), renders the picker
   * lists from the StoreManager, and wires selection listeners.
   */
  configureSelectors(opts: {
    carMode?: 'multi' | 'single';
    selectOnWorldFileLoad?: boolean;
    onWorldSelected?: (entry: UnifiedWorldEntry | null) => void;
    onCarsSelected?: (cars: CarInfo[]) => void;
  }): void {
    this.#carSelectMode = opts.carMode ?? 'multi';
    this.#selectOnWorldFileLoad = opts.selectOnWorldFileLoad ?? false;
    this.#onWorldSelected = opts.onWorldSelected ?? null;
    this.#onCarsSelected = opts.onCarsSelected ?? null;
    this.#selectorsReady = true;

    const selected = this.querySelector('[data-group="selected"]');
    if (selected) (selected as HTMLElement).style.display = '';

    this.#bindPicker('loadWorldBtn', 'worldPicker');
    this.#bindPicker('loadCarBtn', 'carPicker');
    this.#bindWorldFileInput();
    this.#bindCarFileInput();

    this.refreshWorldList();
    this.refreshCarList();
    this.#updateSelectedDisplay();
  }

  /** Set the car selector to single- or multi-select and re-render the list. */
  setCarSelectorMode(mode: 'multi' | 'single'): void {
    this.#carSelectMode = mode;
    if (this.#selectorsReady) this.refreshCarList();
  }

  /** The currently selected cars' data (from the StoreManager). */
  getSelectedCars(): CarInfo[] {
    return StoreManager.getActiveCars();
  }

  /** Re-render the world picker radio list from the StoreManager. */
  refreshWorldList(): void {
    const list = this.querySelector('#worldPickerList');
    if (!list) return;
    const worlds = StoreManager.getAllWorlds();
    const activeId = StoreManager.getActiveWorldId();

    if (worlds.length === 0) {
      list.innerHTML = '<div class="asset-empty">No worlds</div>';
      return;
    }

    list.innerHTML = worlds
      .map(
        (w) => `
        <label class="asset-item">
          <input type="radio" name="wt-world" value="${w.id}" ${
            w.id === activeId ? 'checked' : ''
          } />
          <span class="asset-item-name" title="${w.name}">${stripFileExtension(w.name)}</span>
          <span class="asset-item-src">${w.source}</span>
        </label>`,
      )
      .join('');

    list
      .querySelectorAll<HTMLInputElement>('input[name="wt-world"]')
      .forEach((radio) => {
        radio.addEventListener('change', () => {
          if (radio.checked) this.#selectWorld(radio.value);
        });
      });
  }

  /** Re-render the car picker list (radio or checkbox per mode). */
  refreshCarList(): void {
    const list = this.querySelector('#carPickerList');
    if (!list) return;
    const cars = StoreManager.getAllCars();
    const activeIds = new Set(StoreManager.getActiveCarIds());
    const inputType = this.#carSelectMode === 'single' ? 'radio' : 'checkbox';

    if (cars.length === 0) {
      list.innerHTML = '<div class="asset-empty">No cars</div>';
      return;
    }

    list.innerHTML = cars
      .map(
        (c) => `
        <label class="asset-item">
          <input type="${inputType}" name="wt-car" value="${c.id}" ${
            activeIds.has(c.id) ? 'checked' : ''
          } />
          <span class="asset-item-name" title="${c.name}">${stripFileExtension(c.name)}</span>
          <span class="asset-item-src">${c.source}</span>
        </label>`,
      )
      .join('');

    list
      .querySelectorAll<HTMLInputElement>('input[name="wt-car"]')
      .forEach((input) => {
        input.addEventListener('change', () => this.#onCarInputChange(input));
      });
  }

  #selectWorld(id: string): void {
    StoreManager.getInstance()?.setActiveWorldId(id);
    const entry = StoreManager.getAllWorlds().find((w) => w.id === id) ?? null;
    this.#updateSelectedDisplay();
    if (this.#onWorldSelected) this.#onWorldSelected(entry);
  }

  #onCarInputChange(input: HTMLInputElement): void {
    const mgr = StoreManager.getInstance();
    if (!mgr) return;
    if (this.#carSelectMode === 'single') {
      mgr.setActiveCarIds(input.checked ? [input.value] : []);
    } else {
      mgr.toggleActiveCarId(input.value);
    }
    this.#updateSelectedDisplay();
    if (this.#onCarsSelected) this.#onCarsSelected(mgr.getActiveCars());
  }

  #updateSelectedDisplay(): void {
    const worldEl = this.querySelector('#selectedWorldName');
    if (worldEl) {
      const rawName = StoreManager.getActiveWorldName() ?? null;
      worldEl.textContent = rawName ? stripFileExtension(rawName) : '—';
    }
    const carEl = this.querySelector<HTMLElement>('#selectedCarNames');
    if (carEl) {
      const names = StoreManager.getActiveCarNames();
      if (names.length === 0) {
        carEl.textContent = '—';
        carEl.removeAttribute('title');
      } else if (names.length === 1) {
        carEl.textContent = stripFileExtension(names[0]);
        carEl.removeAttribute('title');
      } else {
        carEl.textContent = `${names.length} car selected`;
        carEl.title = names.map(stripFileExtension).join('\n');
      }
    }
  }

  /** Toggle a popover open/closed; close on outside click. */
  #bindPicker(buttonId: string, popoverId: string): void {
    const btn = this.querySelector(`#${buttonId}`) as HTMLElement | null;
    const popover = this.querySelector(`#${popoverId}`) as HTMLElement | null;
    if (!btn || !popover) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !popover.hidden;
      // Close any other open popovers first.
      this.querySelectorAll<HTMLElement>('.asset-popover').forEach((p) => {
        p.hidden = true;
      });
      popover.hidden = isOpen;
    });

    popover.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      popover.hidden = true;
    });
  }

  #bindWorldFileInput(): void {
    const input = this.querySelector(
      '#loadWorldInput',
    ) as HTMLInputElement | null;
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const data = parseWorldFileContent(reader.result as string);
        if (!data) {
          alert('Could not parse world file. Ensure it is valid JSON.');
        } else {
          const entry = StoreManager.getInstance()?.addLoadedWorld(
            file.name,
            data,
          );
          this.refreshWorldList();
          if (entry && this.#selectOnWorldFileLoad) {
            this.#selectWorld(entry.id);
          }
        }
        input.value = '';
      };
      reader.readAsText(file);
    });
  }

  #bindCarFileInput(): void {
    const input = this.querySelector(
      '#loadCarInput',
    ) as HTMLInputElement | null;
    if (!input) return;
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      let pending = files.length;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          const data = CarLoader.parseCarFile(reader.result as string);
          if (data) {
            StoreManager.getInstance()?.addLoadedCar(file.name, data);
          }
          if (--pending === 0) {
            this.refreshCarList();
            input.value = '';
          }
        };
        reader.readAsText(file);
      }
    });
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

    buttons.none?.addEventListener('click', () => this.setTrackingMode('none'));
    buttons.best?.addEventListener('click', () => this.setTrackingMode('best'));
    buttons.keys?.addEventListener('click', () => this.setTrackingMode('keys'));
  }

  #initViewportModeButtons(): void {
    const buttons = {
      mouse: this.querySelector(
        '#viewportModeMouse',
      ) as HTMLButtonElement | null,
      touchpad: this.querySelector(
        '#viewportModeTouchpad',
      ) as HTMLButtonElement | null,
    };

    const setActive = (mode: ToolbarViewportMode) => {
      this._viewportMode = mode;
      Object.entries(buttons).forEach(([key, btn]) => {
        if (btn) {
          btn.classList.toggle('active', key === mode);
        }
      });
      if (this.onViewportModeChange) this.onViewportModeChange(mode);
    };

    buttons.mouse?.addEventListener('click', () => setActive('mouse'));
    buttons.touchpad?.addEventListener('click', () => setActive('touchpad'));
  }

  static readonly template = WORLD_TOOLBAR_TEMPLATE;
}

customElements.define('world-toolbar', WorldToolbarElement);
