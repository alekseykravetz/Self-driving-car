import { TRAFFIC_PANEL_TEMPLATE } from './templates/trafficPanelTemplate.js';
import type { Car } from '../../car/car.js';
import {
  formatKmhFromPxPerFrame,
  formatMetersFromWorldPixels,
} from '../../math/utils.js';

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
 */

// File-scope helper (kept out of the class so the class name is never
// referenced inside its own body — that makes tsc emit a global `var _a`
// alias that can collide with other globally-loaded classes' aliases).

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
  #rows: {
    car: Car;
    row: HTMLElement;
    status: HTMLElement;
    speed: HTMLElement;
    dist: HTMLElement;
    swatch: HTMLElement;
  }[] = [];

  #onSelect: ((car: Car | null) => void) | null = null;
  #onRemove: ((car: Car) => void) | null = null;
  #onClear: (() => void) | null = null;
  #onDeleteDamaged: (() => void) | null = null;

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
  }

  getSelectedCar(): Car | null {
    // Drop the selection if the car was removed.
    if (this.#selected && !this.#cars.includes(this.#selected)) {
      this.#selected = null;
    }
    return this.#selected;
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
    this.refresh();
  }

  /** Update live values (status / speed / distance) without rebuilding rows.
   * Also re-orders the list: alive cars first (highest distance first),
   * then crashed cars (highest distance first).
   */
  refresh(): void {
    for (const entry of this.#rows) {
      const { car, row, status, speed, dist, swatch } = entry;
      const crashed = car.damaged;
      status.textContent = crashed ? '💥' : '🟢';
      status.title = crashed ? 'Crashed' : 'Driving';
      speed.textContent = formatKmhFromPxPerFrame(car.speed);
      dist.textContent = formatMetersFromWorldPixels(car.fitness);
      swatch.style.background = crashed ? '#777' : car.color;
      row.classList.toggle('crashed', crashed);
      row.classList.toggle('selected', car === this.#selected);
    }

    // Re-sort rows visually: alive (desc distance) then crashed (desc distance).
    // Use CSS `order` instead of DOM moves so that row nodes — and their click
    // listeners — stay stable. Moving nodes with appendChild every frame races
    // with mousedown/mouseup across animation frame boundaries and swallows
    // clicks (same issue fixed in the training panel via delegated listeners).
    if (this.#rows.length === 0) return;
    const sorted = [...this.#rows].sort((a, b) => {
      const aDead = a.car.damaged ? 1 : 0;
      const bDead = b.car.damaged ? 1 : 0;
      if (aDead !== bDead) return aDead - bDead;
      return b.car.fitness - a.car.fitness;
    });
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].row.style.order = String(i);
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
    remove.textContent = '✕';

    head.append(caret, swatch, name, status, remove);

    const metrics = document.createElement('div');
    metrics.className = 'traffic-car-metrics';
    const speedWrap = document.createElement('span');
    speedWrap.title = 'Speed (km/h)';
    const speed = document.createElement('b');
    speedWrap.append('⚡ ', speed);
    const distWrap = document.createElement('span');
    distWrap.title = 'Distance travelled (m)';
    const dist = document.createElement('b');
    distWrap.append('🛣️ ', dist);
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
    this.refresh();
    if (this.#onSelect) this.#onSelect(car);
  }
}

customElements.define('traffic-panel', TrafficPanelElement);
