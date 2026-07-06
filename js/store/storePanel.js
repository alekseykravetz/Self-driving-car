/**
 * <store-panel> — Custom element for the main landing page.
 * Shows preloaded store assets (worlds, cars) and localStorage state.
 * Allows selecting active world/car for use by simulator, race, and world editor.
 */
import { StoreManager } from './storeManager.js';
import { STORE_PANEL_TEMPLATE } from './templates/storePanelTemplate.js';
import { stripFileExtension } from '../utils.js';
// File-scope helpers.
/** Format a car's hidden-layer pattern, e.g. "6" or "16,16". */
function spFormatHiddenLayers(data) {
  if (data.hiddenLayers && data.hiddenLayers.length > 0) {
    return data.hiddenLayers.join(',');
  }
  const levels = data.brain?.levels;
  if (levels && levels.length > 1) {
    return levels
      .slice(0, -1)
      .map((l) => l.outputs.length)
      .join(',');
  }
  return '-';
}
/** Format a byte size from a JS string length (UTF-16). */
function spFormatSize(chars) {
  const bytes = chars * 2; // JS strings are UTF-16
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export class StorePanelElement extends HTMLElement {
  #storeManager = null;
  /** Active sort column/direction per tab. `null` means unsorted. */
  #sortState = {
    worlds: null,
    cars: null,
    localStorage: null,
  };
  constructor() {
    super();
  }
  connectedCallback() {
    this.innerHTML = STORE_PANEL_TEMPLATE;
    this.#initTabs();
    this.#initSorting();
    this.#loadData();
    // Re-render localStorage tab when storage changes in another tab
    window.addEventListener('storage', () => {
      if (this.#storeManager) {
        this.#renderLocalStorage();
        this.#updateTabCounts();
      }
    });
    // Re-render when user returns to this tab (same-tab navigation)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.#storeManager) {
        this.#renderLocalStorage();
        this.#updateTabCounts();
      }
    });
  }
  async #loadData() {
    this.#storeManager = await StoreManager.init();
    this.#renderWorlds();
    this.#renderCars();
    this.#renderLocalStorage();
    this.#updateTabCounts();
  }
  #initTabs() {
    const tabs = this.querySelectorAll('.store-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const contents = this.querySelectorAll('.store-tab-content');
        contents.forEach((c) => c.classList.remove('active'));
        const target = this.querySelector(
          `.store-tab-content[data-content="${tab.dataset.tab}"]`,
        );
        if (target) target.classList.add('active');
      });
    });
  }
  /** Wire click-to-sort on sortable column headers (one active column per tab). */
  #initSorting() {
    this.querySelectorAll('th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const tab = th.closest('.store-tab-content')?.dataset.content;
        const key = th.dataset.sortKey;
        if (!tab || !key) return;
        const current = this.#sortState[tab];
        if (current && current.key === key) {
          current.dir = current.dir === 1 ? -1 : 1;
        } else {
          this.#sortState[tab] = { key, dir: 1 };
        }
        if (tab === 'worlds') this.#renderWorlds();
        else if (tab === 'cars') this.#renderCars();
        else if (tab === 'localStorage') this.#renderLocalStorage();
      });
    });
  }
  /** Update the asc/desc indicator classes on a tab's sortable headers. */
  #updateSortIndicators(tab) {
    const content = this.querySelector(
      `.store-tab-content[data-content="${tab}"]`,
    );
    if (!content) return;
    const state = this.#sortState[tab];
    content.querySelectorAll('th.sortable').forEach((th) => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (state && th.dataset.sortKey === state.key) {
        th.classList.add(state.dir === 1 ? 'sort-asc' : 'sort-desc');
      }
    });
  }
  /**
   * Return a sorted copy of `rows` according to the tab's sort state.
   * Numeric values compare numerically; everything else as strings.
   */
  #applySort(rows, tab, getValue) {
    const state = this.#sortState[tab];
    if (!state) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const va = getValue(a, state.key);
      const vb = getValue(b, state.key);
      let cmp;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), undefined, {
          numeric: true,
        });
      }
      return cmp * state.dir;
    });
    return sorted;
  }
  #renderWorlds() {
    const mgr = this.#storeManager;
    const worlds = mgr.getAllWorlds();
    const tbody = this.querySelector('#storeWorldsBody');
    const empty = this.querySelector('#storeWorldsEmpty');
    if (worlds.length === 0) {
      empty.style.display = '';
      tbody.closest('table').style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    tbody.closest('table').style.display = '';
    const activeId = mgr.getActiveWorldId();
    const sorted = this.#applySort(worlds, 'worlds', (w, key) => {
      switch (key) {
        case 'selected':
          return w.id === activeId ? 1 : 0;
        case 'filename':
          return w.name;
        case 'source':
          return w.source;
        case 'start':
          return w.hasStartMarker ? 1 : 0;
        case 'target':
          return w.hasEndMarker ? 1 : 0;
        default:
          return '';
      }
    });
    tbody.innerHTML = sorted
      .map(
        (w) => `
      <tr class="${w.id === activeId ? 'store-row-active' : ''}">
        <td class="store-marker">${w.id === activeId ? '✓' : ''}</td>
        <td>${stripFileExtension(w.name)}</td>
        <td class="store-source">${w.source}</td>
        <td class="store-marker">${w.hasStartMarker ? '✓' : '✗'}</td>
        <td class="store-marker">${w.hasEndMarker ? '✓' : '✗'}</td>
      </tr>`,
      )
      .join('');
    this.#updateSortIndicators('worlds');
  }
  #renderCars() {
    const mgr = this.#storeManager;
    const cars = mgr.getAllCars();
    const tbody = this.querySelector('#storeCarsBody');
    const empty = this.querySelector('#storeCarsEmpty');
    if (cars.length === 0) {
      empty.style.display = '';
      tbody.closest('table').style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    tbody.closest('table').style.display = '';
    const activeIds = new Set(mgr.getActiveCarIds());
    const sorted = this.#applySort(cars, 'cars', (c, key) => {
      switch (key) {
        case 'selected':
          return activeIds.has(c.id) ? 1 : 0;
        case 'filename':
          return c.name;
        case 'source':
          return c.source;
        case 'hiddenLayers':
          return spFormatHiddenLayers(c.data);
        case 'maxSpeed':
          return c.data.maxSpeed;
        case 'acceleration':
          return c.data.acceleration;
        case 'friction':
          return c.data.friction;
        case 'rayCount':
          return c.data.sensor?.rayCount ?? 0;
        case 'rayLength':
          return c.data.sensor?.rayLength ?? 0;
        case 'raySpread':
          return c.data.sensor?.raySpread ?? 0;
        default:
          return '';
      }
    });
    tbody.innerHTML = sorted
      .map(
        (c) => `
      <tr class="${activeIds.has(c.id) ? 'store-row-active' : ''}">
        <td class="store-marker">${activeIds.has(c.id) ? '✓' : ''}</td>
        <td>${stripFileExtension(c.name)}</td>
        <td class="store-source">${c.source}</td>
        <td>${spFormatHiddenLayers(c.data)}</td>
        <td>${c.data.maxSpeed}</td>
        <td>${c.data.acceleration}</td>
        <td>${c.data.friction}</td>
        <td>${c.data.sensor?.rayCount ?? '-'}</td>
        <td>${c.data.sensor?.rayLength ?? '-'}</td>
        <td>${(c.data.sensor?.raySpread ?? 0).toFixed(2)}</td>
      </tr>`,
      )
      .join('');
    this.#updateSortIndicators('cars');
  }
  #renderLocalStorage() {
    const mgr = this.#storeManager;
    const entries = mgr.getLocalStorageStates();
    const tbody = this.querySelector('#storeLocalStorageBody');
    const empty = this.querySelector('#storeLocalStorageEmpty');
    const table = tbody.closest('table');
    if (entries.length === 0) {
      empty.style.display = '';
      table.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    table.style.display = '';
    const sorted = this.#applySort(entries, 'localStorage', (e, key) => {
      switch (key) {
        case 'key':
          return e.key;
        case 'size':
          return e.size;
        case 'count':
          return e.count ?? -1;
        default:
          return '';
      }
    });
    tbody.innerHTML = sorted
      .map(
        (e) => `
      <tr>
        <td>${e.key}</td>
        <td>${spFormatSize(e.size)}</td>
        <td>${e.count ?? '-'}</td>
        <td class="store-actions">
          <button class="store-action-btn store-export-btn" data-key="${e.key}" title="Export">📥</button>
          <button class="store-action-btn store-delete-btn" data-key="${e.key}" title="Delete">🗑️</button>
        </td>
      </tr>`,
      )
      .join('');
    tbody.querySelectorAll('.store-export-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        mgr.exportLocalStorageKey(btn.dataset.key);
      });
    });
    tbody.querySelectorAll('.store-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm(`Delete localStorage key "${btn.dataset.key}"?`)) {
          mgr.deleteLocalStorageKey(btn.dataset.key);
          this.#renderLocalStorage();
          this.#updateTabCounts();
        }
      });
    });
    this.#updateSortIndicators('localStorage');
  }
  /** Update the count badges in the tab buttons (selected/total, present/tracked). */
  #updateTabCounts() {
    const mgr = this.#storeManager;
    if (!mgr) return;
    const worlds = mgr.getAllWorlds();
    const cars = mgr.getAllCars();
    const activeWorldId = mgr.getActiveWorldId();
    const worldSel = worlds.some((w) => w.id === activeWorldId) ? 1 : 0;
    const activeCarIds = new Set(mgr.getActiveCarIds());
    const carSel = cars.filter((c) => activeCarIds.has(c.id)).length;
    const lsEntries = mgr.getLocalStorageStates();
    this.#setTabCount('worlds', `${worldSel}/${worlds.length}`);
    this.#setTabCount('cars', `${carSel}/${cars.length}`);
    this.#setTabCount(
      'localStorage',
      `${lsEntries.length}/${StoreManager.getTrackedKeyCount()}`,
    );
  }
  #setTabCount(tab, text) {
    const span = this.querySelector(`.store-tab-count[data-count="${tab}"]`);
    if (span) span.textContent = `(${text})`;
  }
}
customElements.define('store-panel', StorePanelElement);
