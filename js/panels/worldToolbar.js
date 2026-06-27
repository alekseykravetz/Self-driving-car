'use strict';
class WorldToolbarElement extends HTMLElement {
  _borderMode = 'damage';
  _trackingMode = 'best';
  _viewportMode = 'mouse';
  onBorderModeChange = null;
  onTrackingModeChange = null;
  onViewportModeChange = null;
  // --- Asset selectors (world / car library + selection) ---
  #carSelectMode = 'multi';
  #selectOnWorldFileLoad = false;
  #selectorsReady = false;
  #onWorldSelected = null;
  #onCarsSelected = null;
  constructor() {
    super();
    this.id = 'topControls';
  }

  connectedCallback() {
    this.innerHTML = WorldToolbarElement.template;
    this.#initBorderModeButtons();
    this.#initTrackingModeButtons();
    this.#initViewportModeButtons();
  }

  get borderMode() {
    return this._borderMode;
  }

  get trackingMode() {
    return this._trackingMode;
  }

  get viewportMode() {
    return this._viewportMode;
  }

  get showCameraDebug() {
    const el = this.querySelector('#showCameraDebug');
    return el ? el.checked : false;
  }

  hideCameraDebug() {
    this.hideGroups('debug', 'debug-sep');
  }

  setBorderModeListener(listener) {
    this.onBorderModeChange = listener;
  }

  setTrackingModeListener(listener) {
    this.onTrackingModeChange = listener;
  }

  /** Programmatically set the tracking mode and sync the button states. */
  setTrackingMode(mode) {
    this._trackingMode = mode;
    const buttons = {
      none: this.querySelector('#trackModeNone'),
      best: this.querySelector('#trackModeBest'),
      keys: this.querySelector('#trackModeKeys'),
    };
    Object.entries(buttons).forEach(([key, btn]) => {
      if (btn) btn.classList.toggle('active', key === mode);
    });
    if (this.onTrackingModeChange) this.onTrackingModeChange(mode);
  }

  setViewportModeListener(listener) {
    this.onViewportModeChange = listener;
  }

  /**
   * Reveal the World Editor action buttons (Save / Dispose / OSM Import) inside
   * the World group. Hidden by default so simulator/race/traffic pages only show
   * the world/car file inputs.
   */
  showWorldEditorActions() {
    this.querySelectorAll('.world-editor-action').forEach((el) => {
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
  configureSelectors(opts) {
    this.#carSelectMode = opts.carMode ?? 'multi';
    this.#selectOnWorldFileLoad = opts.selectOnWorldFileLoad ?? false;
    this.#onWorldSelected = opts.onWorldSelected ?? null;
    this.#onCarsSelected = opts.onCarsSelected ?? null;
    this.#selectorsReady = true;
    const selected = this.querySelector('[data-group="selected"]');
    if (selected) selected.style.display = '';
    this.#bindPicker('loadWorldBtn', 'worldPicker');
    this.#bindPicker('loadCarBtn', 'carPicker');
    this.#bindWorldFileInput();
    this.#bindCarFileInput();
    this.refreshWorldList();
    this.refreshCarList();
    this.#updateSelectedDisplay();
  }

  /** Set the car selector to single- or multi-select and re-render the list. */
  setCarSelectorMode(mode) {
    this.#carSelectMode = mode;
    if (this.#selectorsReady) this.refreshCarList();
  }

  /** The currently selected cars' data (from the StoreManager). */
  getSelectedCars() {
    return StoreManager.getActiveCars();
  }

  /** Re-render the world picker radio list from the StoreManager. */
  refreshWorldList() {
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
          <input type="radio" name="wt-world" value="${w.id}" ${w.id === activeId ? 'checked' : ''} />
          <span class="asset-item-name" title="${w.name}">${stripFileExtension(w.name)}</span>
          <span class="asset-item-src">${w.source}</span>
        </label>`,
      )
      .join('');
    list.querySelectorAll('input[name="wt-world"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) this.#selectWorld(radio.value);
      });
    });
  }

  /** Re-render the car picker list (radio or checkbox per mode). */
  refreshCarList() {
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
          <input type="${inputType}" name="wt-car" value="${c.id}" ${activeIds.has(c.id) ? 'checked' : ''} />
          <span class="asset-item-name" title="${c.name}">${stripFileExtension(c.name)}</span>
          <span class="asset-item-src">${c.source}</span>
        </label>`,
      )
      .join('');
    list.querySelectorAll('input[name="wt-car"]').forEach((input) => {
      input.addEventListener('change', () => this.#onCarInputChange(input));
    });
  }

  #selectWorld(id) {
    StoreManager.getInstance()?.setActiveWorldId(id);
    const entry = StoreManager.getAllWorlds().find((w) => w.id === id) ?? null;
    this.#updateSelectedDisplay();
    if (this.#onWorldSelected) this.#onWorldSelected(entry);
  }

  #onCarInputChange(input) {
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

  #updateSelectedDisplay() {
    const worldEl = this.querySelector('#selectedWorldName');
    if (worldEl) {
      const rawName = StoreManager.getActiveWorldName() ?? null;
      worldEl.textContent = rawName ? stripFileExtension(rawName) : '—';
    }
    const carEl = this.querySelector('#selectedCarNames');
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
  #bindPicker(buttonId, popoverId) {
    const btn = this.querySelector(`#${buttonId}`);
    const popover = this.querySelector(`#${popoverId}`);
    if (!btn || !popover) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !popover.hidden;
      // Close any other open popovers first.
      this.querySelectorAll('.asset-popover').forEach((p) => {
        p.hidden = true;
      });
      popover.hidden = isOpen;
    });
    popover.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      popover.hidden = true;
    });
  }

  #bindWorldFileInput() {
    const input = this.querySelector('#loadWorldInput');
    if (!input) return;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const data = parseWorldFileContent(reader.result);
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

  #bindCarFileInput() {
    const input = this.querySelector('#loadCarInput');
    if (!input) return;
    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      let pending = files.length;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          const data = CarLoader.parseCarFile(reader.result);
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

  hideGroups(...groups) {
    for (const name of groups) {
      const el = this.querySelector(`[data-group="${name}"]`);
      if (el) el.style.display = 'none';
    }
  }

  #initBorderModeButtons() {
    const buttons = {
      none: this.querySelector('#borderModeNone'),
      damage: this.querySelector('#borderModeDamage'),
      collision: this.querySelector('#borderModeCollision'),
    };
    const setActive = (mode) => {
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

  #initTrackingModeButtons() {
    const buttons = {
      none: this.querySelector('#trackModeNone'),
      best: this.querySelector('#trackModeBest'),
      keys: this.querySelector('#trackModeKeys'),
    };
    buttons.none?.addEventListener('click', () => this.setTrackingMode('none'));
    buttons.best?.addEventListener('click', () => this.setTrackingMode('best'));
    buttons.keys?.addEventListener('click', () => this.setTrackingMode('keys'));
  }

  #initViewportModeButtons() {
    const buttons = {
      mouse: this.querySelector('#viewportModeMouse'),
      touchpad: this.querySelector('#viewportModeTouchpad'),
    };
    const setActive = (mode) => {
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

  static template = WORLD_TOOLBAR_TEMPLATE;
}
customElements.define('world-toolbar', WorldToolbarElement);
