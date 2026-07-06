import { TRAINING_PANEL_TEMPLATE } from './templates/trainingPanelTemplate.js';
import { DEFAULT_CAR_CONFIG } from '../../car/config.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import { StoreManager } from '../../store/storeManager.js';
import {
  createCarsForTraining,
  getSortedAICars,
  getTopAICars,
  getTopCarInfoPool,
  applyPoolToCars,
  inferHiddenLayers,
} from './genetics/poolManager.js';
import {
  loadPoolFromStorage,
  savePoolToStorage,
  discardStoredPool,
  downloadCarFiles,
} from './genetics/storageManager.js';
import { safeJsonParse } from '../../utils.js';
import {
  formatMetersFromWorldPixels,
  formatKmhFromPxPerFrame,
} from '../../math/utils.js';
export class TrainingPanelElement extends HTMLElement {
  iteration = 0;
  maxDistancePassed = 0;
  idleEnabled = false;
  hiddenLayers = [6];
  cars = [];
  bestCar = null;
  bestPool = [];
  prevPoolCars = [];
  selectedPoolIndices = new Set();
  // Per-frame counter used to throttle the pool-table + status-dot DOM refresh.
  // The pool/best-car selection itself runs every frame (needed for camera
  // tracking and metrics); only the UI rendering is rate-limited.
  #domRefreshCounter = 0;
  static DOM_REFRESH_INTERVAL = 15;
  #evaluateFitness = () => 0;
  #getStartInfo = () => ({
    x: 0,
    y: 0,
    angle: 0,
  });
  #onCarsCreatedCallback = () => {};
  // Optional override for the "New Training" button. When set (by the training
  // simulator), the button opens the training-init modal instead of restarting
  // immediately. Falls back to newTraining() when unset.
  #newTrainingHandler = null;
  // DOM Elements
  #carCountInput = null;
  #thresholdInput = null;
  #poolCountInput = null;
  #idleRangeInput = null;
  #nextGenBtn = null;
  #newTrainingBtn = null;
  #saveBtn = null;
  #discardBtn = null;
  // Car config DOM elements
  #carMaxSpeedInput = null;
  #carAccelerationInput = null;
  #carFrictionInput = null;
  #carWidthInput = null;
  #carHeightInput = null;
  #carRayCountInput = null;
  #carRayLengthInput = null;
  #carRaySpreadInput = null;
  #carRayOffsetInput = null;
  #carHiddenLayersInput = null;
  #statGenEl = null;
  #statAliveEl = null;
  #statDeadEl = null;
  #statFrozenEl = null;
  #statFrozenRow = null;
  #statDistEl = null;
  #statSpeedEl = null;
  // Pool table and status dots
  #poolTableBody = null;
  #dotPool = null;
  #dotStorage = null;
  #dotCarConfig = null;
  // Idle range wrapper + collapsible car config
  #idleRangeWrap = null;
  #carConfigSection = null;
  #carConfigToggle = null;
  #carConfigSummary = null;
  constructor() {
    super();
    this.id = 'trainingManagerPanel';
  }
  connectedCallback() {
    this.innerHTML = TrainingPanelElement.template;
  }
  configure(options) {
    this.#evaluateFitness = options.evaluateFitness;
    this.#getStartInfo = options.getStartInfo;
    this.#onCarsCreatedCallback = options.onCarsCreated;
    this.#initDOMElements();
    this.#addEventListeners();
  }
  /** Route the "New Training" button through `handler` instead of restarting. */
  setNewTrainingHandler(handler) {
    this.#newTrainingHandler = handler;
  }
  /** Write the training param inputs (cars / mutation / pool / idle range). */
  setTrainingParams(params) {
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
  #readNumericInput(input, defaultVal, isInt = false) {
    if (!input) return defaultVal;
    const parsed = isInt ? parseInt(input.value) : parseFloat(input.value);
    return parsed || defaultVal;
  }
  #getSortedAICars() {
    return getSortedAICars(this.cars, this.#evaluateFitness);
  }
  #getTopCarInfoPool() {
    const { poolSize } = this.getSettings();
    return getTopCarInfoPool(this.cars, this.#evaluateFitness, poolSize);
  }
  #applyPoolToCars(cars, pool) {
    const { mutationRate } = this.getSettings();
    applyPoolToCars(cars, pool, mutationRate);
  }
  // ── Initialization ───────────────────────────────────
  #initDOMElements() {
    this.#carCountInput = this.querySelector('#carCount');
    this.#thresholdInput = this.querySelector('#threshold');
    this.#poolCountInput = this.querySelector('#poolCount');
    this.#idleRangeInput = this.querySelector('#idleRange');
    this.#nextGenBtn = this.querySelector('#nextGenBtn');
    this.#newTrainingBtn = this.querySelector('#newTrainingBtn');
    this.#saveBtn = this.querySelector('#saveBtn');
    this.#discardBtn = this.querySelector('#discardBtn');
    // Car config inputs
    this.#carMaxSpeedInput = this.querySelector('#carMaxSpeed');
    this.#carAccelerationInput = this.querySelector('#carAcceleration');
    this.#carFrictionInput = this.querySelector('#carFriction');
    this.#carWidthInput = this.querySelector('#carWidth');
    this.#carHeightInput = this.querySelector('#carHeight');
    this.#carRayCountInput = this.querySelector('#carRayCount');
    this.#carRayLengthInput = this.querySelector('#carRayLength');
    this.#carRaySpreadInput = this.querySelector('#carRaySpread');
    this.#carRayOffsetInput = this.querySelector('#carRayOffset');
    this.#carHiddenLayersInput = this.querySelector('#carHiddenLayers');
    this.#statGenEl = this.querySelector('#stat-gen');
    this.#statAliveEl = this.querySelector('#stat-alive');
    this.#statDeadEl = this.querySelector('#stat-dead');
    this.#statFrozenEl = this.querySelector('#stat-frozen');
    this.#statFrozenRow = this.querySelector('#stat-frozen-row');
    this.#statDistEl = this.querySelector('#stat-dist');
    this.#statSpeedEl = this.querySelector('#stat-speed');
    // Pool table and status dots
    this.#poolTableBody = this.querySelector('#poolTableBody');
    this.#dotPool = this.querySelector('#dot-pool');
    this.#dotStorage = this.querySelector('#dot-storage');
    this.#dotCarConfig = this.querySelector('#dot-car-config');
    // Idle range wrapper + collapsible car config
    this.#idleRangeWrap = this.querySelector('#idleRangeWrap');
    this.#carConfigSection = this.querySelector('#carConfigSection');
    this.#carConfigToggle = this.querySelector('#carConfigToggle');
    this.#carConfigSummary = this.querySelector('#carConfigSummary');
    // Initialize car config from localStorage or global carInfo
    this.#loadInitialCarConfig();
    // Reflect initial idle state (off by default): dim the row + hide range.
    this.#updateIdleUI();
    this.#updateCarConfigSummary();
  }
  #addEventListeners() {
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
    // Pool selection via a single delegated listener attached once. The pool
    // table rows are reconciled in place (never re-created), so this handler
    // stays valid and clicks are not lost when the table refreshes.
    if (this.#poolTableBody) {
      this.#poolTableBody.addEventListener('click', (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !this.#poolTableBody.contains(row)) return;
        const idx = parseInt(row.dataset.poolIdx ?? '', 10);
        if (Number.isNaN(idx)) return;
        if (this.selectedPoolIndices.has(idx)) {
          this.selectedPoolIndices.delete(idx);
          row.classList.remove('selected');
        } else {
          this.selectedPoolIndices.add(idx);
          row.classList.add('selected');
        }
      });
    }
    // Toggle idle (freeze far cars) by clicking the idle stats row
    if (this.#statFrozenRow) {
      this.#statFrozenRow.addEventListener('click', () => {
        this.idleEnabled = !this.idleEnabled;
        this.#updateIdleUI();
      });
    }
    // Collapse / expand the Car Config section
    if (this.#carConfigToggle) {
      this.#carConfigToggle.addEventListener('click', () => {
        this.#carConfigSection?.classList.toggle('collapsed');
      });
    }
    // Numeric +/- buttons for training params
    this.querySelectorAll('.num-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;
        const input = this.querySelector(`#${targetId}`);
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
    // Auto-restart training when car params change
    const carParamInputs = [
      this.#carMaxSpeedInput,
      this.#carAccelerationInput,
      this.#carFrictionInput,
      this.#carWidthInput,
      this.#carHeightInput,
      this.#carRayCountInput,
      this.#carRayLengthInput,
      this.#carRaySpreadInput,
      this.#carRayOffsetInput,
      this.#carHiddenLayersInput,
    ];
    for (const input of carParamInputs) {
      if (input) {
        input.addEventListener('change', () => {
          this.#updateCarConfigSummary();
          this.newTraining();
        });
      }
    }
  }
  /** Dim the idle stats row + show/hide the idle range input. */
  #updateIdleUI() {
    this.#statFrozenRow?.classList.toggle('disabled', !this.idleEnabled);
    if (this.#idleRangeWrap) {
      this.#idleRangeWrap.style.display = this.idleEnabled ? '' : 'none';
    }
  }
  /** Rebuild the collapsed car-config summary (emoji icon + readonly value). */
  #updateCarConfigSummary() {
    if (!this.#carConfigSummary) return;
    const v = (input, fallback = '') => {
      const value = input ? input.value.trim() : '';
      return value !== '' ? value : fallback;
    };
    const items = [
      [
        '↕️',
        'Height',
        v(this.#carHeightInput, String(DEFAULT_CAR_CONFIG.height)),
      ],
      ['↔️', 'Width', v(this.#carWidthInput, String(DEFAULT_CAR_CONFIG.width))],
      ['🧠', 'Hidden Layers', v(this.#carHiddenLayersInput)],
      ['🚀', 'Max Speed', v(this.#carMaxSpeedInput)],
      ['⚡', 'Accel', v(this.#carAccelerationInput)],
      ['🛞', 'Friction', v(this.#carFrictionInput)],
      ['📡', 'Rays', v(this.#carRayCountInput)],
      ['📐', 'Ray Len', v(this.#carRayLengthInput)],
      ['🔦', 'Ray Spread', v(this.#carRaySpreadInput)],
      ['🎯', 'Ray Offset', v(this.#carRayOffsetInput)],
    ];
    this.#carConfigSummary.innerHTML = items
      .map(
        ([emoji, label, value]) =>
          `<span class="cfg-chip" title="${label}"><span class="cfg-chip-emoji">${emoji}</span><span class="cfg-chip-value">${value}</span></span>`,
      )
      .join('');
  }
  // ── Settings ─────────────────────────────────────────
  getSettings() {
    return {
      carCount: this.#readNumericInput(this.#carCountInput, 100, true),
      poolSize: this.#readNumericInput(this.#poolCountInput, 5, true),
      mutationRate: this.#readNumericInput(this.#thresholdInput, 0.1),
      idleRange: this.#readNumericInput(this.#idleRangeInput, 1000, true),
    };
  }
  getCarSettings() {
    const hiddenLayers = this.#carHiddenLayersInput
      ? this.#parseHiddenLayers(this.#carHiddenLayersInput.value)
      : [...this.hiddenLayers];
    return {
      maxSpeed: this.#readNumericInput(
        this.#carMaxSpeedInput,
        DEFAULT_CAR_CONFIG.maxSpeed,
      ),
      acceleration: this.#readNumericInput(
        this.#carAccelerationInput,
        DEFAULT_CAR_CONFIG.acceleration,
      ),
      friction: this.#readNumericInput(
        this.#carFrictionInput,
        DEFAULT_CAR_CONFIG.friction,
      ),
      width: this.#readNumericInput(
        this.#carWidthInput,
        DEFAULT_CAR_CONFIG.width,
        true,
      ),
      height: this.#readNumericInput(
        this.#carHeightInput,
        DEFAULT_CAR_CONFIG.height,
        true,
      ),
      hiddenLayers,
      sensor: {
        rayCount: this.#readNumericInput(this.#carRayCountInput, 5, true),
        rayLength: this.#readNumericInput(this.#carRayLengthInput, 150, true),
        raySpread: this.#readNumericInput(this.#carRaySpreadInput, Math.PI / 2),
        rayOffset: this.#readNumericInput(this.#carRayOffsetInput, 0),
      },
    };
  }
  #parseHiddenLayers(value) {
    const parts = value
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    return parts.length > 0 ? parts : [6];
  }
  setCarSettings(info) {
    if (this.#carMaxSpeedInput)
      this.#carMaxSpeedInput.value = String(info.maxSpeed);
    if (this.#carAccelerationInput)
      this.#carAccelerationInput.value = String(info.acceleration);
    if (this.#carFrictionInput)
      this.#carFrictionInput.value = String(info.friction);
    if (this.#carWidthInput) this.#carWidthInput.value = String(info.width);
    if (this.#carHeightInput) this.#carHeightInput.value = String(info.height);
    // Prefer the explicit hiddenLayers field; otherwise infer the topology from
    // the stored brain. Legacy .car files omit hiddenLayers, so without this the
    // hidden-layers config keeps a stale/default value and the freshly-created
    // car's brain topology no longer matches the stored brain — causing the
    // brainsCompatible() guard to silently drop the trained brain.
    const hiddenLayers = info.hiddenLayers ?? inferHiddenLayers(info.brain);
    if (hiddenLayers) {
      this.hiddenLayers = [...hiddenLayers];
      if (this.#carHiddenLayersInput) {
        this.#carHiddenLayersInput.value = hiddenLayers.join(', ');
      }
    }
    if (this.#carRayCountInput)
      this.#carRayCountInput.value = String(info.sensor.rayCount);
    if (this.#carRayLengthInput)
      this.#carRayLengthInput.value = String(info.sensor.rayLength);
    if (this.#carRaySpreadInput)
      this.#carRaySpreadInput.value = String(info.sensor.raySpread);
    if (this.#carRayOffsetInput)
      this.#carRayOffsetInput.value = String(info.sensor.rayOffset);
    this.#updateCarConfigSummary();
  }
  // ── Simulation Controls ──────────────────────────────
  nextGeneration() {
    this.iteration++;
    this.maxDistancePassed = 0;
    this.selectedPoolIndices.clear();
    this.#createCarsWithPool(this.#getTopCarInfoPool());
  }
  newTraining() {
    this.iteration = 0;
    this.maxDistancePassed = 0;
    this.selectedPoolIndices.clear();
    this.#createCarsWithPool([]);
  }
  initializeCars() {
    this.#createCarsWithPool([]);
  }
  // ── Car Creation ─────────────────────────────────────
  #createCarsWithPool(pool) {
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
    console.log(
      `Generation ${this.iteration} started with ${settings.carCount} cars.`,
    );
  }
  #generateCars(n, type, config) {
    const start = this.#getStartInfo();
    return createCarsForTraining(n, type, config, start);
  }
  // ── Pool Management ──────────────────────────────────
  #loadPoolFromStorage() {
    return loadPoolFromStorage(this.getCarSettings());
  }
  // ── Storage ──────────────────────────────────────────
  save() {
    const sortedCars = this.#getSortedAICars();
    const { poolSize } = this.getSettings();
    const topCars = sortedCars.slice(0, poolSize);
    const pool = topCars.map((c) => c.toInfo());
    savePoolToStorage(pool);
    // Download .car files only for selected pool cars
    if (this.selectedPoolIndices.size > 0) {
      const selectedCars = [...this.selectedPoolIndices]
        .sort((a, b) => a - b)
        .filter((idx) => idx < topCars.length)
        .map((idx) => ({ car: topCars[idx], poolPosition: idx }));
      downloadCarFiles(selectedCars);
    }
    // Reflect the new storage state immediately (the per-frame refresh is
    // throttled and is paused while training is paused).
    this.refreshPoolUI();
  }
  discard() {
    discardStoredPool();
    this.refreshPoolUI();
  }
  #loadInitialCarConfig() {
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
  updateDistance(currentDist) {
    if (currentDist > this.maxDistancePassed) {
      this.maxDistancePassed = currentDist;
    }
  }
  updateStatsDisplay(alive, dead, frozen, maxDist, bestCarSpeed = 0) {
    if (this.#statGenEl) this.#statGenEl.textContent = String(this.iteration);
    if (this.#statAliveEl) this.#statAliveEl.textContent = String(alive);
    if (this.#statDeadEl) this.#statDeadEl.textContent = String(dead);
    if (this.#statFrozenEl) this.#statFrozenEl.textContent = String(frozen);
    if (this.#statDistEl) {
      this.#statDistEl.textContent = formatMetersFromWorldPixels(maxDist);
    }
    if (this.#statSpeedEl) {
      this.#statSpeedEl.textContent = formatKmhFromPxPerFrame(
        Math.abs(bestCarSpeed),
      );
    }
  }
  updateBestCarAndPool() {
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
  refreshPoolUI() {
    this.#domRefreshCounter = 0;
    this.#updatePoolTable();
    this.#updateStatusDots();
  }
  #updatePoolTable() {
    const body = this.#poolTableBody;
    if (!body) return;
    // Reconcile rows in place instead of rebuilding innerHTML. Re-creating the
    // DOM every refresh dropped the CSS :hover state (blinking) and replaced
    // the node mid-click, so clicks were lost. Reusing the existing <tr>/<td>
    // nodes keeps hover and click interactions stable; clicks are handled by a
    // single delegated listener attached in #addEventListeners.
    for (let i = 0; i < this.bestPool.length; i++) {
      const car = this.bestPool[i];
      const fitness = this.#evaluateFitness(car);
      const name = car.name || '-';
      let row = body.children[i];
      if (!row) {
        row = document.createElement('tr');
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
        body.appendChild(row);
      }
      if (row.dataset.poolIdx !== String(i)) row.dataset.poolIdx = String(i);
      const rankCell = row.children[0];
      const nameCell = row.children[1];
      const speedCell = row.children[2];
      const fitnessCell = row.children[3];
      const rankText = String(i + 1);
      const speedText = formatKmhFromPxPerFrame(Math.abs(car.speed));
      const fitnessText = formatMetersFromWorldPixels(fitness);
      if (rankCell.textContent !== rankText) rankCell.textContent = rankText;
      if (nameCell.textContent !== name) nameCell.textContent = name;
      if (speedCell.textContent !== speedText)
        speedCell.textContent = speedText;
      if (fitnessCell.textContent !== fitnessText)
        fitnessCell.textContent = fitnessText;
      const selected = this.selectedPoolIndices.has(i);
      if (row.classList.contains('selected') !== selected)
        row.classList.toggle('selected', selected);
    }
    // Drop any rows left over from a previously larger pool.
    while (body.children.length > this.bestPool.length) {
      body.removeChild(body.lastChild);
    }
  }
  #updateStatusDots() {
    const stored = localStorage.getItem('bestPool');
    const storedPool = safeJsonParse(stored);
    if (this.#dotStorage) {
      const hasStorage = !!storedPool;
      this.#dotStorage.className =
        'status-dot ' + (hasStorage ? 'green' : 'red');
      this.#dotStorage.title = hasStorage
        ? `${storedPool.length} car(s) in localStorage`
        : 'No saved cars';
    }
    if (this.#dotPool) {
      if (!storedPool) {
        this.#dotPool.className = 'status-dot red';
        this.#dotPool.title = 'No pool (no storage)';
      } else {
        const settings = this.getSettings();
        const match = storedPool.length === settings.poolSize;
        this.#dotPool.className = 'status-dot ' + (match ? 'green' : 'orange');
        this.#dotPool.title = match
          ? `Pool: ${storedPool.length}/${settings.poolSize}`
          : `Pool size mismatch: stored ${storedPool.length}, expected ${settings.poolSize}`;
      }
    }
    if (this.#dotCarConfig) {
      if (!storedPool || storedPool.length === 0) {
        this.#dotCarConfig.className = 'status-dot red';
        this.#dotCarConfig.title = 'No stored config to compare';
      } else {
        const storedInfo = storedPool[0];
        const current = this.getCarSettings();
        const matches = CarLoader.compareCarParams(storedInfo, current);
        this.#dotCarConfig.className =
          'status-dot ' + (matches ? 'green' : 'orange');
        if (matches) {
          this.#dotCarConfig.title = 'Config matches storage';
        } else {
          const diffs = [];
          if (storedInfo.maxSpeed !== current.maxSpeed)
            diffs.push(`spd:${storedInfo.maxSpeed}→${current.maxSpeed}`);
          if (storedInfo.acceleration !== current.acceleration)
            diffs.push(
              `acc:${storedInfo.acceleration}→${current.acceleration}`,
            );
          if (storedInfo.friction !== current.friction)
            diffs.push(`fric:${storedInfo.friction}→${current.friction}`);
          if (storedInfo.width !== current.width)
            diffs.push(`w:${storedInfo.width}→${current.width}`);
          if (storedInfo.height !== current.height)
            diffs.push(`h:${storedInfo.height}→${current.height}`);
          if (storedInfo.sensor.rayCount !== current.sensor.rayCount)
            diffs.push(
              `rays:${storedInfo.sensor.rayCount}→${current.sensor.rayCount}`,
            );
          if (storedInfo.sensor.rayLength !== current.sensor.rayLength)
            diffs.push(
              `len:${storedInfo.sensor.rayLength}→${current.sensor.rayLength}`,
            );
          if (
            Math.abs(storedInfo.sensor.raySpread - current.sensor.raySpread) >
            1e-2
          )
            diffs.push(
              `spread:${storedInfo.sensor.raySpread.toFixed(2)}→${current.sensor.raySpread.toFixed(2)}`,
            );
          if (storedInfo.sensor.rayOffset !== current.sensor.rayOffset)
            diffs.push(
              `off:${storedInfo.sensor.rayOffset}→${current.sensor.rayOffset}`,
            );
          const sHL = (storedInfo.hiddenLayers ?? [6]).join(',');
          const cHL = (current.hiddenLayers ?? [6]).join(',');
          if (sHL !== cHL) diffs.push(`hl:[${sHL}]→[${cHL}]`);
          this.#dotCarConfig.title = `Mismatch: ${diffs.join(', ')}`;
        }
      }
    }
  }
  static template = TRAINING_PANEL_TEMPLATE;
}
customElements.define('training-panel', TrainingPanelElement);
