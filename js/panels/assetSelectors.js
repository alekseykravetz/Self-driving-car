import { StoreManager } from '../store/storeManager.js';
import { CarLoader } from '../car/loader/carLoader.js';
import { stripFileExtension } from '../utils.js';
import { parseWorldFileContent } from '../world/loader/worldLoader.js';
export class ToolbarAssetSelectors {
  #carSelectMode = 'multi';
  #selectOnWorldFileLoad = false;
  #selectorsReady = false;
  #onWorldSelected = null;
  #onCarsSelected = null;
  #host;
  constructor(host) {
    this.#host = host;
  }
  configureSelectors(opts) {
    this.#carSelectMode = opts.carMode ?? 'multi';
    this.#selectOnWorldFileLoad = opts.selectOnWorldFileLoad ?? false;
    this.#onWorldSelected = opts.onWorldSelected ?? null;
    this.#onCarsSelected = opts.onCarsSelected ?? null;
    this.#selectorsReady = true;
    const selected = this.#host.querySelector('[data-group="selected"]');
    if (selected) selected.style.display = '';
    this.#bindPicker('loadWorldBtn', 'worldPicker');
    this.#bindPicker('loadCarBtn', 'carPicker');
    this.#bindWorldFileInput();
    this.#bindCarFileInput();
    this.refreshWorldList();
    this.refreshCarList();
    this.#updateSelectedDisplay();
  }
  setCarSelectorMode(mode) {
    this.#carSelectMode = mode;
    if (this.#selectorsReady) this.refreshCarList();
  }
  getSelectedCars() {
    return StoreManager.getActiveCars();
  }
  refreshWorldList() {
    const list = this.#host.querySelector('#worldPickerList');
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
  refreshCarList() {
    const list = this.#host.querySelector('#carPickerList');
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
    const worldEl = this.#host.querySelector('#selectedWorldName');
    if (worldEl) {
      const rawName = StoreManager.getActiveWorldName() ?? null;
      worldEl.textContent = rawName ? stripFileExtension(rawName) : '\u2014';
    }
    const carEl = this.#host.querySelector('#selectedCarNames');
    if (carEl) {
      const names = StoreManager.getActiveCarNames();
      if (names.length === 0) {
        carEl.textContent = '\u2014';
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
  #bindPicker(buttonId, popoverId) {
    const btn = this.#host.querySelector(`#${buttonId}`);
    const popover = this.#host.querySelector(`#${popoverId}`);
    if (!btn || !popover) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !popover.hidden;
      this.#host.querySelectorAll('.asset-popover').forEach((p) => {
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
    const input = this.#host.querySelector('#loadWorldInput');
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
    const input = this.#host.querySelector('#loadCarInput');
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
}
