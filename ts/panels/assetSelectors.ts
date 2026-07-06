import type { UnifiedWorldEntry } from '../store/types.js';
import { StoreManager } from '../store/storeManager.js';
import type { CarInfo } from '../car/car.js';
import { CarLoader } from '../car/loader/carLoader.js';
import { stripFileExtension } from '../utils.js';
import { parseWorldFileContent } from '../world/loader/worldLoader.js';

export class ToolbarAssetSelectors {
  #carSelectMode: 'multi' | 'single' = 'multi';
  #selectOnWorldFileLoad = false;
  #selectorsReady = false;
  #onWorldSelected: ((entry: UnifiedWorldEntry | null) => void) | null = null;
  #onCarsSelected: ((cars: CarInfo[]) => void) | null = null;

  #host: HTMLElement;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

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

    const selected = this.#host.querySelector('[data-group="selected"]');
    if (selected) (selected as HTMLElement).style.display = '';

    this.#bindPicker('loadWorldBtn', 'worldPicker');
    this.#bindPicker('loadCarBtn', 'carPicker');
    this.#bindWorldFileInput();
    this.#bindCarFileInput();

    this.refreshWorldList();
    this.refreshCarList();
    this.#updateSelectedDisplay();
  }

  setCarSelectorMode(mode: 'multi' | 'single'): void {
    this.#carSelectMode = mode;
    if (this.#selectorsReady) this.refreshCarList();
  }

  getSelectedCars(): CarInfo[] {
    return StoreManager.getActiveCars();
  }

  refreshWorldList(): void {
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

  refreshCarList(): void {
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
    const worldEl = this.#host.querySelector('#selectedWorldName');
    if (worldEl) {
      const rawName = StoreManager.getActiveWorldName() ?? null;
      worldEl.textContent = rawName ? stripFileExtension(rawName) : '\u2014';
    }
    const carEl = this.#host.querySelector<HTMLElement>('#selectedCarNames');
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

  #bindPicker(buttonId: string, popoverId: string): void {
    const btn = this.#host.querySelector(`#${buttonId}`) as HTMLElement | null;
    const popover = this.#host.querySelector(
      `#${popoverId}`,
    ) as HTMLElement | null;
    if (!btn || !popover) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !popover.hidden;
      this.#host
        .querySelectorAll<HTMLElement>('.asset-popover')
        .forEach((p) => {
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
    const input = this.#host.querySelector(
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
    const input = this.#host.querySelector(
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
}
