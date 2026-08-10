import { TRAFFIC_PANEL_TEMPLATE } from '../../simulator/traffic/templates/trafficPanelTemplate.js';
import type { Car } from '../../car/car.js';
import { wireNumInputRows } from '../molecules/numInputRow.js';
import {
  formatKmhFromPxPerFrame,
  formatMetersFromWorldPixels,
} from '../../math/worldUnits.js';

/**
 * <traffic-panel> — side panel for the Live Traffic Jam simulator.
 *
 * Lists every car the user has placed on the road, showing a colour swatch,
 * name, alive/crashed status, live speed and distance travelled, plus an
 * expandable read-only view of each car's full configuration (mirroring the
 * collapsed "Car Config" section of the training panel).
 *
 * The panel is a pure view over a `Car[]` owned by the simulator:
 *   - `setCars(cars)` rebuilds the list when membership changes (spawn / remove
 *     / clear).
 *   - `refresh()` updates the live values (status / speed / distance) in place
 *     every render frame without destroying expand state.
 *
 * Interactions are surfaced through listener setters:
 *   - select (click a row)  → track that car
 *   - remove (row ✕ button) → drop a single car
 *   - clear  (toolbar)      → drop all cars
 *   - pause  (toolbar)      → toggle the simulation
 *   - spawn (1K/2K/custom)  → bulk-spawn N cars at random road positions
 *   - unselect (button)     → clear the tracked car without removing it
 *   - the search box filters the visible rows by car name (client-side only;
 *     `#cars`/`#rows` are unaffected, so selection/removal still work as usual)
 */

// File-scope helper (kept out of the class so the class name is never
// referenced inside its own body — that makes tsc emit a global `var _a`
// alias that can collide with other globally-loaded classes' aliases).

/** Live-value refresh throttle: the stats list updates a few times per second
 * instead of every animation frame, so a large fleet doesn't thrash layout. */
const TRAFFIC_REFRESH_INTERVAL_MS = 200;

/** Read-only HTML for a car's full configuration. */
function tpConfigHtml(car: Car): string {
  const rows: [string, string | number][] = [
    ['Max Speed', car.maxSpeed],
    ['Accel', car.acceleration],
    ['Friction', car.friction],
    ['Width', car.width],
    ['Height', car.height],
    ['Hidden', car.hiddenLayers.join(', ')],
    ['Rays', car.sensor?.rayCount ?? '-'],
    ['Ray Len', car.sensor?.rayLength ?? '-'],
    ['Ray Spread', car.sensor ? car.sensor.raySpread.toFixed(2) : '-'],
    ['Ray Offset', car.sensor ? car.sensor.rayOffset.toFixed(2) : '-'],
  ];
  return rows
    .map(
      ([label, value]) =>
        `<div class="cfg-row"><span>${label}</span><b>${value}</b></div>`,
    )
    .join('');
}

export class TrafficPanelElement extends HTMLElement {
  #cars: Car[] = [];
  #selected: Car | null = null;

  // Per-car row references, parallel to `#cars`, used for in-place refresh.
  // The `last*` fields cache the values last written to the DOM so `refresh()`
  // only touches a node when its value actually changed — writing textContent /
  // style / classList unconditionally on 1000 rows every frame thrashed style
  // recalc + flex layout (the dominant cost with a large fleet).
  #rows: {
    car: Car;
    row: HTMLElement;
    status: HTMLElement;
    speed: HTMLElement;
    dist: HTMLElement;
    swatch: HTMLElement;
    lastSpeed?: string;
    lastDist?: string;
    lastSwatch?: string;
    lastCrashed?: boolean;
    lastSelected?: boolean;
    lastOrder?: string;
  }[] = [];

  // Live-value refresh is throttled: the per-frame draw loop calls refresh()
  // at 60 Hz, but the stats list only needs a few updates per second. Structural
  // changes (select / setCars / unselect) bypass the throttle via refresh(true).
  #lastRefreshTs = 0;

  #onSelect: ((car: Car | null) => void) | null = null;
  #onRemove: ((car: Car) => void) | null = null;
  #onClear: (() => void) | null = null;
  #onDeleteDamaged: (() => void) | null = null;
  #onSpawn: ((count: number) => void) | null = null;
  #filterQuery: string = '';

  constructor() {
    super();
    this.id = 'trafficStatsPanel';
  }

  connectedCallback(): void {
    this.innerHTML = TRAFFIC_PANEL_TEMPLATE;

    const clearBtn = this.querySelector(
      '#trafficClearBtn',
    ) as HTMLButtonElement | null;
    clearBtn?.addEventListener('click', () => {
      if (this.#onClear) this.#onClear();
    });

    const deleteDamagedBtn = this.querySelector(
      '#trafficDeleteDamagedBtn',
    ) as HTMLButtonElement | null;
    deleteDamagedBtn?.addEventListener('click', () => {
      if (this.#onDeleteDamaged) this.#onDeleteDamaged();
    });

    const unselectBtn = this.querySelector(
      '#trafficUnselectBtn',
    ) as HTMLButtonElement | null;
    unselectBtn?.addEventListener('click', () => this.unselect());

    wireNumInputRows(this);
    const spawnCountInput = this.querySelector(
      '#trafficSpawnCount',
    ) as HTMLInputElement | null;
    const spawn1kBtn = this.querySelector(
      '#trafficSpawn1kBtn',
    ) as HTMLButtonElement | null;
    spawn1kBtn?.addEventListener('click', () => this.#onSpawn?.(1000));
    const spawn2kBtn = this.querySelector(
      '#trafficSpawn2kBtn',
    ) as HTMLButtonElement | null;
    spawn2kBtn?.addEventListener('click', () => this.#onSpawn?.(2000));
    const spawnCustomBtn = this.querySelector(
      '#trafficSpawnCustomBtn',
    ) as HTMLButtonElement | null;
    spawnCustomBtn?.addEventListener('click', () => {
      const count = parseInt(spawnCountInput?.value ?? '', 10);
      if (Number.isFinite(count) && count > 0) this.#onSpawn?.(count);
    });

    const searchInput = this.querySelector(
      '#trafficCarSearch',
    ) as HTMLInputElement | null;
    searchInput?.addEventListener('input', () => {
      this.#filterQuery = searchInput.value;
      this.#applyFilter();
    });
  }

  getSelectedCar(): Car | null {
    // Drop the selection if the car was removed.
    if (this.#selected && !this.#cars.includes(this.#selected)) {
      this.#selected = null;
    }
    return this.#selected;
  }

  selectCar(car: Car): void {
    this.#select(car);
  }

  setSelectListener(listener: (car: Car | null) => void): void {
    this.#onSelect = listener;
  }

  setRemoveListener(listener: (car: Car) => void): void {
    this.#onRemove = listener;
  }

  setClearListener(listener: () => void): void {
    this.#onClear = listener;
  }

  setDeleteDamagedListener(listener: () => void): void {
    this.#onDeleteDamaged = listener;
  }

  setSpawnListener(listener: (count: number) => void): void {
    this.#onSpawn = listener;
  }

  /** Clears the current selection without removing any car. */
  unselect(): void {
    this.#selected = null;
    this.refresh(true);
    if (this.#onSelect) this.#onSelect(null);
  }

  /** Rebuild the car list. Call when cars are added or removed. */
  setCars(cars: Car[]): void {
    this.#cars = cars;
    if (this.#selected && !cars.includes(this.#selected)) {
      this.#selected = null;
    }

    const list = this.querySelector('#trafficCarsList') as HTMLElement | null;
    const empty = this.querySelector('#trafficCarsEmpty') as HTMLElement | null;
    const count = this.querySelector('#trafficCount') as HTMLElement | null;
    if (!list) return;

    if (count) {
      count.textContent = `${cars.length} car${cars.length === 1 ? '' : 's'}`;
    }
    if (empty) empty.style.display = cars.length ? 'none' : '';

    list.innerHTML = '';
    this.#rows = [];
    for (const car of cars) {
      this.#rows.push(this.#buildRow(car, list));
    }
    this.refresh(true);
    this.#applyFilter();
  }

  /** Hides rows whose car name doesn't match the search box (client-side only). */
  #applyFilter(): void {
    const query = this.#filterQuery.trim().toLowerCase();
    for (const { car, row } of this.#rows) {
      const match = !query || (car.name ?? '').toLowerCase().includes(query);
      row.style.display = match ? '' : 'none';
    }
  }

  /** Update live values (status / speed / distance) without rebuilding rows.
   * Also re-orders the list: alive cars first (highest distance first),
   * then crashed cars (highest distance first).
   *
   * Throttled to a few updates per second (the draw loop calls this at 60 Hz).
   * Pass `force` to bypass the throttle for structural changes (selection,
   * membership) that must reflect immediately. Every DOM write is guarded by a
   * cached previous value so unchanged rows touch no nodes.
   */
  refresh(force = false): void {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force && now - this.#lastRefreshTs < TRAFFIC_REFRESH_INTERVAL_MS) {
      return;
    }
    this.#lastRefreshTs = now;

    for (const entry of this.#rows) {
      const { car, row, status, speed, dist, swatch } = entry;
      const crashed = car.damaged;
      const wantStatus = crashed ? 'crash' : 'alive';
      if (status.dataset.icon !== wantStatus) {
        status.dataset.icon = wantStatus;
        status.innerHTML = `<app-icon name="${wantStatus}"></app-icon>`;
        status.title = crashed ? 'Crashed' : 'Driving';
      }
      const speedText = formatKmhFromPxPerFrame(car.speed);
      if (entry.lastSpeed !== speedText) {
        speed.textContent = speedText;
        entry.lastSpeed = speedText;
      }
      const distText = formatMetersFromWorldPixels(car.fitness);
      if (entry.lastDist !== distText) {
        dist.textContent = distText;
        entry.lastDist = distText;
      }
      const bg = crashed ? '#777' : car.color;
      if (entry.lastSwatch !== bg) {
        swatch.style.background = bg;
        entry.lastSwatch = bg;
      }
      if (entry.lastCrashed !== crashed) {
        row.classList.toggle('crashed', crashed);
        entry.lastCrashed = crashed;
      }
      const selected = car === this.#selected;
      if (entry.lastSelected !== selected) {
        row.classList.toggle('selected', selected);
        entry.lastSelected = selected;
      }
    }

    // Re-sort rows visually: alive (desc distance) then crashed (desc distance).
    // Use CSS `order` instead of DOM moves so that row nodes — and their click
    // listeners — stay stable. Moving nodes with appendChild every frame races
    // with mousedown/mouseup across animation frame boundaries and swallows
    // clicks (same issue fixed in the training panel via delegated listeners).
    // `order` is only written when it changed, so a stable list triggers no
    // flex re-layout.
    if (this.#rows.length === 0) return;
    const sorted = [...this.#rows].sort((a, b) => {
      const aDead = a.car.damaged ? 1 : 0;
      const bDead = b.car.damaged ? 1 : 0;
      if (aDead !== bDead) return aDead - bDead;
      return b.car.fitness - a.car.fitness;
    });
    for (let i = 0; i < sorted.length; i++) {
      const order = String(i);
      if (sorted[i].lastOrder !== order) {
        sorted[i].row.style.order = order;
        sorted[i].lastOrder = order;
      }
    }
  }

  #buildRow(car: Car, list: HTMLElement) {
    const row = document.createElement('div');
    row.className = 'traffic-car-row';

    const head = document.createElement('div');
    head.className = 'traffic-car-head';

    const caret = document.createElement('span');
    caret.className = 'collapse-caret';
    caret.textContent = '▸';

    const swatch = document.createElement('span');
    swatch.className = 'traffic-car-swatch';

    const name = document.createElement('span');
    name.className = 'traffic-car-name';
    name.textContent = car.name ?? '';

    const status = document.createElement('span');
    status.className = 'traffic-car-status';

    const remove = document.createElement('button');
    remove.className = 'traffic-car-remove';
    remove.title = 'Remove this car';
    remove.innerHTML = '<app-icon name="close"></app-icon>';

    head.append(caret, swatch, name, status, remove);

    const metrics = document.createElement('div');
    metrics.className = 'traffic-car-metrics';
    const speedWrap = document.createElement('span');
    speedWrap.title = 'Speed (km/h)';
    const speed = document.createElement('b');
    const speedIcon = document.createElement('app-icon');
    speedIcon.setAttribute('name', 'bolt');
    speedWrap.append(speedIcon, ' ', speed);
    const distWrap = document.createElement('span');
    distWrap.title = 'Distance travelled (m)';
    const dist = document.createElement('b');
    const distIcon = document.createElement('app-icon');
    distIcon.setAttribute('name', 'road');
    distWrap.append(distIcon, ' ', dist);
    metrics.append(speedWrap, distWrap);

    const config = document.createElement('div');
    config.className = 'traffic-car-config';
    config.innerHTML = tpConfigHtml(car);

    row.append(head, metrics, config);
    list.appendChild(row);

    // Caret toggles the read-only config; stop propagation so it does not also
    // select the row.
    caret.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = row.classList.toggle('expanded');
      caret.textContent = open ? '▾' : '▸';
    });

    // Clicking the row selects (and tracks) the car.
    row.addEventListener('click', () => this.#select(car));

    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.#onRemove) this.#onRemove(car);
    });

    return { car, row, status, speed, dist, swatch };
  }

  #select(car: Car): void {
    this.#selected = car;
    this.refresh(true);
    if (this.#onSelect) this.#onSelect(car);
  }
}

customElements.define('traffic-panel', TrafficPanelElement);
