import { TRAINING_PANEL_TEMPLATE } from './trainingPanelTemplate.js';
import type { CarInfo } from '../../car/car.js';
import { Car } from '../../car/car.js';
import { StoreManager } from '../../store/storeManager.js';
import {
  createCarsForTraining,
  getSortedAICars,
  getTopAICars,
  getTopCarInfoPool,
  applyPoolToCars,
} from '../../simulator/training/genetics/poolManager.js';
import {
  loadPoolFromStorage,
  savePoolToStorage,
  discardStoredPool,
  downloadCarFiles,
} from '../../simulator/training/genetics/storageManager.js';
import {
  formatMetersFromWorldPixels,
  formatKmhFromPxPerFrame,
} from '../../math/worldUnits.js';
import { CarConfigPanel } from '../molecules/carConfigPanel.js';
import { PoolTable } from '../molecules/poolTable.js';

export interface TrainingManagerOptions {
  evaluateFitness: (car: Car) => number;
  getStartInfo: () => { x: number; y: number; angle: number };
  onCarsCreated: (cars: Car[]) => void;
}

export class TrainingPanelElement extends HTMLElement {
  public iteration: number = 0;
  public maxDistancePassed: number = 0;
  public idleEnabled: boolean = false;
  public cars: Car[] = [];
  public bestCar: Car | null = null;
  public bestPool: Car[] = [];
  public prevPoolCars: Car[] = [];

  #carConfigPanel!: CarConfigPanel;
  #poolTable!: PoolTable;

  // Per-frame counter used to throttle the pool-table + status-dot DOM refresh.
  // The pool/best-car selection itself runs every frame (needed for camera
  // tracking and metrics); only the UI rendering is rate-limited.
  #domRefreshCounter: number = 0;
  static readonly DOM_REFRESH_INTERVAL = 15;

  #evaluateFitness: (car: Car) => number = () => 0;
  #getStartInfo: () => { x: number; y: number; angle: number } = () => ({
    x: 0,
    y: 0,
    angle: 0,
  });

  #onCarsCreatedCallback: (cars: Car[]) => void = () => {};

  // Cached values to avoid unnecessary DOM writes per frame.
  #cachedIteration: number = -1;
  #cachedAlive: number = -1;
  #cachedDead: number = -1;
  #cachedFrozen: number = -1;
  #cachedMaxDist: number = -1;
  #cachedBestSpeed: number = -1;

  // Optional override for the "New Training" button. When set (by the training
  // simulator), the button opens the training-init modal instead of restarting
  // immediately. Falls back to newTraining() when unset.
  #newTrainingHandler: (() => void) | null = null;

  // DOM Elements
  #carCountInput: HTMLInputElement | null = null;
  #thresholdInput: HTMLInputElement | null = null;
  #poolCountInput: HTMLInputElement | null = null;
  #idleRangeInput: HTMLInputElement | null = null;
  #nextGenBtn: HTMLButtonElement | null = null;
  #newTrainingBtn: HTMLButtonElement | null = null;
  #saveBtn: HTMLButtonElement | null = null;
  #discardBtn: HTMLButtonElement | null = null;

  #statGenEl: HTMLElement | null = null;
  #statAliveEl: HTMLElement | null = null;
  #statDeadEl: HTMLElement | null = null;
  #statFrozenEl: HTMLElement | null = null;
  #statFrozenRow: HTMLElement | null = null;
  #statDistEl: HTMLElement | null = null;
  #statSpeedEl: HTMLElement | null = null;

  // Idle range wrapper
  #idleRangeWrap: HTMLElement | null = null;

  constructor() {
    super();
    this.id = 'trainingManagerPanel';
  }

  connectedCallback(): void {
    this.innerHTML = TrainingPanelElement.template;
  }

  configure(options: TrainingManagerOptions): void {
    this.#evaluateFitness = options.evaluateFitness;
    this.#getStartInfo = options.getStartInfo;
    this.#onCarsCreatedCallback = options.onCarsCreated;

    this.#initDOMElements();
    this.#addEventListeners();
  }

  /** Route the "New Training" button through `handler` instead of restarting. */
  setNewTrainingHandler(handler: () => void): void {
    this.#newTrainingHandler = handler;
  }

  /** Write the training param inputs (cars / mutation / pool / idle range). */
  setTrainingParams(params: {
    carCount: number;
    poolSize: number;
    mutationRate: number;
    idleRange: number;
  }): void {
    if (this.#carCountInput)
      this.#carCountInput.value = String(params.carCount);
    if (this.#poolCountInput)
      this.#poolCountInput.value = String(params.poolSize);
    if (this.#thresholdInput)
      this.#thresholdInput.value = String(params.mutationRate);
    if (this.#idleRangeInput)
      this.#idleRangeInput.value = String(params.idleRange);
  }

  // ── Helpers ──────────────────────────────────────────

  #readNumericInput(
    input: HTMLInputElement | null,
    defaultVal: number,
    isInt: boolean = false,
  ): number {
    if (!input) return defaultVal;
    const parsed = isInt ? parseInt(input.value) : parseFloat(input.value);
    return parsed || defaultVal;
  }

  #getSortedAICars(): Car[] {
    return getSortedAICars(this.cars, this.#evaluateFitness);
  }

  #getTopCarInfoPool(): CarInfo[] {
    const { poolSize } = this.getSettings();
    return getTopCarInfoPool(this.cars, this.#evaluateFitness, poolSize);
  }

  #applyPoolToCars(cars: Car[], pool: CarInfo[]): void {
    const { mutationRate } = this.getSettings();
    applyPoolToCars(cars, pool, mutationRate);
  }

  // ── Initialization ───────────────────────────────────

  #initDOMElements(): void {
    this.#carCountInput = this.querySelector('#carCount');
    this.#thresholdInput = this.querySelector('#threshold');
    this.#poolCountInput = this.querySelector('#poolCount');
    this.#idleRangeInput = this.querySelector('#idleRange');
    this.#nextGenBtn = this.querySelector('#nextGenBtn');
    this.#newTrainingBtn = this.querySelector('#newTrainingBtn');
    this.#saveBtn = this.querySelector('#saveBtn');
    this.#discardBtn = this.querySelector('#discardBtn');

    this.#statGenEl = this.querySelector('#stat-gen');
    this.#statAliveEl = this.querySelector('#stat-alive');
    this.#statDeadEl = this.querySelector('#stat-dead');
    this.#statFrozenEl = this.querySelector('#stat-frozen');
    this.#statFrozenRow = this.querySelector('#stat-frozen-row');
    this.#statDistEl = this.querySelector('#stat-dist');
    this.#statSpeedEl = this.querySelector('#stat-speed');

    // Idle range wrapper
    this.#idleRangeWrap = this.querySelector('#idleRangeWrap');

    this.#carConfigPanel = new CarConfigPanel(this, () => this.newTraining());
    this.#poolTable = new PoolTable(this);

    // Initialize car config from localStorage or global carInfo
    this.#loadInitialCarConfig();

    // Reflect initial idle state (off by default): dim the row + hide range.
    this.#updateIdleUI();
  }

  #addEventListeners(): void {
    if (this.#nextGenBtn) {
      this.#nextGenBtn.addEventListener('click', () => this.nextGeneration());
    }
    if (this.#newTrainingBtn) {
      this.#newTrainingBtn.addEventListener('click', () => {
        if (this.#newTrainingHandler) {
          this.#newTrainingHandler();
        } else {
          this.newTraining();
        }
      });
    }
    if (this.#saveBtn) {
      this.#saveBtn.addEventListener('click', () => this.save());
    }
    if (this.#discardBtn) {
      this.#discardBtn.addEventListener('click', () => this.discard());
    }

    // Toggle idle (freeze far cars) by clicking the idle stats row
    if (this.#statFrozenRow) {
      this.#statFrozenRow.addEventListener('click', () => {
        this.idleEnabled = !this.idleEnabled;
        this.#updateIdleUI();
      });
    }

    // Numeric +/- buttons for training params. Car-config buttons are owned
    // and wired separately by CarConfigPanel (scoped to #carConfigSection).
    this.querySelectorAll<HTMLButtonElement>('.num-btn').forEach((btn) => {
      if (btn.closest('#carConfigSection')) return;
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;
        const input = this.querySelector<HTMLInputElement>(`#${targetId}`);
        if (!input) return;
        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        let val = parseFloat(input.value) || 0;
        if (btn.classList.contains('num-btn-inc')) {
          val += step;
        } else {
          val -= step;
        }
        if (!isNaN(min)) val = Math.max(min, val);
        if (!isNaN(max)) val = Math.min(max, val);
        input.value = String(parseFloat(val.toFixed(4)));
        input.dispatchEvent(new Event('change'));
      });
    });
  }

  /** Dim the idle stats row + show/hide the idle range input. */
  #updateIdleUI(): void {
    this.#statFrozenRow?.classList.toggle('disabled', !this.idleEnabled);
    if (this.#idleRangeWrap) {
      this.#idleRangeWrap.style.display = this.idleEnabled ? '' : 'none';
    }
  }

  // ── Settings ─────────────────────────────────────────

  public getSettings(): {
    carCount: number;
    poolSize: number;
    mutationRate: number;
    idleRange: number;
  } {
    return {
      carCount: this.#readNumericInput(this.#carCountInput, 100, true),
      poolSize: this.#readNumericInput(this.#poolCountInput, 5, true),
      mutationRate: this.#readNumericInput(this.#thresholdInput, 0.1),
      idleRange: this.#readNumericInput(this.#idleRangeInput, 1000, true),
    };
  }

  public getCarSettings(): CarInfo {
    return this.#carConfigPanel.getCarSettings();
  }

  public get hiddenLayers(): number[] {
    return this.#carConfigPanel.hiddenLayers;
  }

  public setCarSettings(info: CarInfo): void {
    this.#carConfigPanel.setCarSettings(info);
  }

  // ── Simulation Controls ──────────────────────────────

  public nextGeneration(): void {
    this.iteration++;
    this.maxDistancePassed = 0;
    this.#poolTable.clearSelection();
    this.#createCarsWithPool(this.#getTopCarInfoPool());
  }

  public newTraining(): void {
    this.iteration = 0;
    this.maxDistancePassed = 0;
    this.#poolTable.clearSelection();
    this.#createCarsWithPool([]);
  }

  public initializeCars(): void {
    this.#createCarsWithPool([]);
  }

  // ── Car Creation ─────────────────────────────────────

  #createCarsWithPool(pool: CarInfo[]): void {
    const settings = this.getSettings();
    const config = this.getCarSettings();
    const aiCars = this.#generateCars(settings.carCount, 'AI', config);
    const keysCar = this.#generateCars(1, 'KEYS', config);
    this.cars = [...keysCar, ...aiCars];
    this.bestCar = this.cars[0];
    this.bestPool = [];

    // Apply pool brains (from current generation or loaded from storage)
    const effectivePool = pool.length > 0 ? pool : this.#loadPoolFromStorage();
    this.#applyPoolToCars(this.cars, effectivePool);

    // Track cars that inherited prev pool brains (first N AI cars)
    const poolCount = effectivePool.length;
    this.prevPoolCars =
      poolCount > 0
        ? this.cars.filter((c) => c.type !== 'KEYS').slice(0, poolCount)
        : [];
    // Label prev pool cars with their inherited rank
    for (let i = 0; i < this.prevPoolCars.length; i++) {
      this.prevPoolCars[i].name = String(i + 1);
    }

    this.#onCarsCreatedCallback(this.cars);

    console.info(
      `Generation ${this.iteration} started with ${settings.carCount} cars.`,
    );
  }

  #generateCars(n: number, type: string, config: CarInfo): Car[] {
    const start = this.#getStartInfo();
    return createCarsForTraining(n, type, config, start);
  }

  // ── Pool Management ──────────────────────────────────

  #loadPoolFromStorage(): CarInfo[] {
    return loadPoolFromStorage(this.getCarSettings());
  }

  // ── Storage ──────────────────────────────────────────

  public save(): void {
    const sortedCars = this.#getSortedAICars();
    const { poolSize } = this.getSettings();
    const topCars = sortedCars.slice(0, poolSize);

    const pool: CarInfo[] = topCars.map((c: Car) => c.toInfo());
    savePoolToStorage(pool);

    // Download .car files only for selected pool cars
    const selectedPoolIndices = this.#poolTable.selectedIndices;
    if (selectedPoolIndices.size > 0) {
      const selectedCars = [...selectedPoolIndices]
        .sort((a, b) => a - b)
        .filter((idx) => idx < topCars.length)
        .map((idx) => ({ car: topCars[idx], poolPosition: idx }));
      downloadCarFiles(selectedCars);
    }

    this.#poolTable.invalidateStoredPoolCache();
    // Reflect the new storage state immediately (the per-frame refresh is
    // throttled and is paused while training is paused).
    this.refreshPoolUI();
  }

  public discard(): void {
    discardStoredPool();
    this.#poolTable.invalidateStoredPoolCache();
    this.refreshPoolUI();
  }

  #loadInitialCarConfig(): void {
    // Prefill the car-config UI from the stored pool, else the selected store
    // car(s). The actual pool seeding / brain source is decided explicitly via
    // the training-init modal, so this only mirrors values into the inputs.
    const pool = this.#loadPoolFromStorage();
    if (pool.length > 0) {
      this.setCarSettings(pool[0]);
      if (this.#poolCountInput) {
        this.#poolCountInput.value = String(pool.length);
      }
      return;
    }

    const activeCars = StoreManager.getActiveCars();
    if (activeCars.length > 0) {
      this.setCarSettings(activeCars[0]);
    }
  }

  // ── Stats & UI Updates ───────────────────────────────

  public updateDistance(currentDist: number): void {
    if (currentDist > this.maxDistancePassed) {
      this.maxDistancePassed = currentDist;
    }
  }

  public updateStatsDisplay(
    alive: number,
    dead: number,
    frozen: number,
    maxDist: number,
    bestCarSpeed: number = 0,
  ): void {
    if (this.#statGenEl && this.#cachedIteration !== this.iteration) {
      this.#statGenEl.textContent = String(this.iteration);
      this.#cachedIteration = this.iteration;
    }
    if (this.#statAliveEl && this.#cachedAlive !== alive) {
      this.#statAliveEl.textContent = String(alive);
      this.#cachedAlive = alive;
    }
    if (this.#statDeadEl && this.#cachedDead !== dead) {
      this.#statDeadEl.textContent = String(dead);
      this.#cachedDead = dead;
    }
    if (this.#statFrozenEl && this.#cachedFrozen !== frozen) {
      this.#statFrozenEl.textContent = String(frozen);
      this.#cachedFrozen = frozen;
    }
    if (this.#statDistEl && this.#cachedMaxDist !== maxDist) {
      this.#statDistEl.textContent = formatMetersFromWorldPixels(maxDist);
      this.#cachedMaxDist = maxDist;
    }
    if (this.#statSpeedEl && this.#cachedBestSpeed !== bestCarSpeed) {
      this.#statSpeedEl.textContent = formatKmhFromPxPerFrame(
        Math.abs(bestCarSpeed),
      );
      this.#cachedBestSpeed = bestCarSpeed;
    }
  }

  public updateBestCarAndPool(): void {
    const { poolSize } = this.getSettings();
    // Per-frame: select just the top `poolSize` cars instead of sorting the
    // entire population (thousands) every frame.
    this.bestPool = getTopAICars(this.cars, this.#evaluateFitness, poolSize);
    this.bestCar = this.bestPool.length > 0 ? this.bestPool[0] : null;

    // Throttle the DOM-heavy UI refresh (pool table innerHTML rebuild + a
    // localStorage read in the status dots). At ~4 refreshes/sec the panel
    // still feels live but stops dominating the frame at large populations.
    if (
      ++this.#domRefreshCounter >= TrainingPanelElement.DOM_REFRESH_INTERVAL
    ) {
      this.#domRefreshCounter = 0;
      this.refreshPoolUI();
    }
  }

  /** Immediately re-renders the pool table and status dots (bypasses throttle). */
  public refreshPoolUI(): void {
    this.#domRefreshCounter = 0;
    this.#poolTable.updateTable(this.bestPool, this.#evaluateFitness);
    this.#poolTable.updateStatusDots(this.getSettings(), this.getCarSettings());
  }

  static readonly template = TRAINING_PANEL_TEMPLATE;
}

customElements.define('training-panel', TrainingPanelElement);
