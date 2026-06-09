'use strict';
class TrainingManagerPanelElement extends HTMLElement {
  iteration = 0;
  maxDistancePassed = 0;
  paused = false;
  idleEnabled = true;
  hiddenLayers = [6];
  cars = [];
  bestCar = null;
  bestPool = [];
  prevPoolCars = [];
  selectedPoolIndices = new Set();
  evaluateFitness = () => 0;
  getStartInfo = () => ({
    x: 0,
    y: 0,
    angle: 0,
  });

  onCarsCreatedCallback = () => {};
  onPauseToggleCallback;
  // DOM Elements
  carCountInput = null;
  thresholdInput = null;
  poolCountInput = null;
  pauseBtn = null;
  nextGenBtn = null;
  newTrainingBtn = null;
  saveBtn = null;
  discardBtn = null;
  // Car config DOM elements
  carMaxSpeedInput = null;
  carAccelerationInput = null;
  carFrictionInput = null;
  carWidthInput = null;
  carHeightInput = null;
  carRayCountInput = null;
  carRayLengthInput = null;
  carRaySpreadInput = null;
  carRayOffsetInput = null;
  carHiddenLayersInput = null;
  statGenEl = null;
  statAliveEl = null;
  statDeadEl = null;
  statFrozenEl = null;
  statFrozenRow = null;
  statDistEl = null;
  // Pool table and status dots
  poolTableBody = null;
  dotPool = null;
  dotStorage = null;
  dotCarConfig = null;
  constructor() {
    super();
    this.id = 'trainingManagerPanel';
  }

  connectedCallback() {
    this.innerHTML = TrainingManagerPanelElement.template;
  }

  configure(options) {
    this.evaluateFitness = options.evaluateFitness;
    this.getStartInfo = options.getStartInfo;
    this.onCarsCreatedCallback = options.onCarsCreated;
    this.onPauseToggleCallback = options.onPauseToggle;
    this.#initDOMElements();
    this.#addEventListeners();
  }

  // ── Helpers ──────────────────────────────────────────
  #readNumericInput(input, defaultVal, isInt = false) {
    if (!input) return defaultVal;
    const parsed = isInt ? parseInt(input.value) : parseFloat(input.value);
    return parsed || defaultVal;
  }

  #getSortedAICars() {
    return this.cars
      .filter((c) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));
  }

  #getTopCarInfoPool() {
    const { poolSize } = this.getSettings();
    return this.#getSortedAICars()
      .slice(0, poolSize)
      .map((c) => c.toInfo());
  }

  #applyPoolToCars(cars, pool) {
    if (pool.length === 0) return;
    const { mutationRate } = this.getSettings();
    const brains = pool.filter((c) => c.brain).map((c) => c.brain);
    let aiIndex = 0;
    for (let i = 0; i < cars.length; i++) {
      if (cars[i].type === 'KEYS') continue;
      if (brains.length > 0) {
        if (aiIndex < brains.length) {
          cars[i].brain = JSON.parse(JSON.stringify(brains[aiIndex]));
        } else {
          cars[i].brain = NeuralNetwork.toMutatedFromPool(brains, mutationRate);
        }
      }
      aiIndex++;
    }
  }

  // ── Initialization ───────────────────────────────────
  #initDOMElements() {
    this.carCountInput = this.querySelector('#carCount');
    this.thresholdInput = this.querySelector('#threshold');
    this.poolCountInput = this.querySelector('#poolCount');
    this.pauseBtn = this.querySelector('#pauseBtn');
    this.nextGenBtn = this.querySelector('#nextGenBtn');
    this.newTrainingBtn = this.querySelector('#newTrainingBtn');
    this.saveBtn = this.querySelector('#saveBtn');
    this.discardBtn = this.querySelector('#discardBtn');
    // Car config inputs
    this.carMaxSpeedInput = this.querySelector('#carMaxSpeed');
    this.carAccelerationInput = this.querySelector('#carAcceleration');
    this.carFrictionInput = this.querySelector('#carFriction');
    this.carWidthInput = this.querySelector('#carWidth');
    this.carHeightInput = this.querySelector('#carHeight');
    this.carRayCountInput = this.querySelector('#carRayCount');
    this.carRayLengthInput = this.querySelector('#carRayLength');
    this.carRaySpreadInput = this.querySelector('#carRaySpread');
    this.carRayOffsetInput = this.querySelector('#carRayOffset');
    this.carHiddenLayersInput = this.querySelector('#carHiddenLayers');
    this.statGenEl = this.querySelector('#stat-gen');
    this.statAliveEl = this.querySelector('#stat-alive');
    this.statDeadEl = this.querySelector('#stat-dead');
    this.statFrozenEl = this.querySelector('#stat-frozen');
    this.statFrozenRow = this.querySelector('#stat-frozen-row');
    this.statDistEl = this.querySelector('#stat-dist');
    // Pool table and status dots
    this.poolTableBody = this.querySelector('#poolTableBody');
    this.dotPool = this.querySelector('#dot-pool');
    this.dotStorage = this.querySelector('#dot-storage');
    this.dotCarConfig = this.querySelector('#dot-car-config');
    // Initialize car config from localStorage or global carInfo
    this.#loadInitialCarConfig();
  }

  #addEventListeners() {
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => this.togglePause());
    }
    if (this.nextGenBtn) {
      this.nextGenBtn.addEventListener('click', () => this.nextGeneration());
    }
    if (this.newTrainingBtn) {
      this.newTrainingBtn.addEventListener('click', () => this.newTraining());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.save());
    }
    if (this.discardBtn) {
      this.discardBtn.addEventListener('click', () => this.discard());
    }
    // Toggle idle (freeze far cars) by clicking the idle stats row
    if (this.statFrozenRow) {
      this.statFrozenRow.addEventListener('click', () => {
        this.idleEnabled = !this.idleEnabled;
        this.statFrozenRow.classList.toggle('disabled', !this.idleEnabled);
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
      this.carMaxSpeedInput,
      this.carAccelerationInput,
      this.carFrictionInput,
      this.carWidthInput,
      this.carHeightInput,
      this.carRayCountInput,
      this.carRayLengthInput,
      this.carRaySpreadInput,
      this.carRayOffsetInput,
      this.carHiddenLayersInput,
    ];
    for (const input of carParamInputs) {
      if (input) {
        input.addEventListener('change', () => this.newTraining());
      }
    }
  }

  // ── Settings ─────────────────────────────────────────
  getSettings() {
    return {
      carCount: this.#readNumericInput(this.carCountInput, 100, true),
      poolSize: this.#readNumericInput(this.poolCountInput, 5, true),
      mutationRate: this.#readNumericInput(this.thresholdInput, 0.1),
    };
  }

  getCarSettings() {
    const hiddenLayers = this.carHiddenLayersInput
      ? this.#parseHiddenLayers(this.carHiddenLayersInput.value)
      : [...this.hiddenLayers];
    return {
      maxSpeed: this.#readNumericInput(this.carMaxSpeedInput, 3),
      acceleration: this.#readNumericInput(this.carAccelerationInput, 0.2),
      friction: this.#readNumericInput(this.carFrictionInput, 0.05),
      width: this.#readNumericInput(this.carWidthInput, 30, true),
      height: this.#readNumericInput(this.carHeightInput, 50, true),
      hiddenLayers,
      sensor: {
        rayCount: this.#readNumericInput(this.carRayCountInput, 5, true),
        rayLength: this.#readNumericInput(this.carRayLengthInput, 150, true),
        raySpread: this.#readNumericInput(this.carRaySpreadInput, Math.PI / 2),
        rayOffset: this.#readNumericInput(this.carRayOffsetInput, 0),
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
    if (this.carMaxSpeedInput)
      this.carMaxSpeedInput.value = String(info.maxSpeed);
    if (this.carAccelerationInput)
      this.carAccelerationInput.value = String(info.acceleration);
    if (this.carFrictionInput)
      this.carFrictionInput.value = String(info.friction);
    if (this.carWidthInput) this.carWidthInput.value = String(info.width);
    if (this.carHeightInput) this.carHeightInput.value = String(info.height);
    if (info.hiddenLayers) {
      this.hiddenLayers = [...info.hiddenLayers];
      if (this.carHiddenLayersInput) {
        this.carHiddenLayersInput.value = info.hiddenLayers.join(', ');
      }
    }
    if (this.carRayCountInput)
      this.carRayCountInput.value = String(info.sensor.rayCount);
    if (this.carRayLengthInput)
      this.carRayLengthInput.value = String(info.sensor.rayLength);
    if (this.carRaySpreadInput)
      this.carRaySpreadInput.value = String(info.sensor.raySpread);
    if (this.carRayOffsetInput)
      this.carRayOffsetInput.value = String(info.sensor.rayOffset);
  }

  // ── Simulation Controls ──────────────────────────────
  togglePause(forceState) {
    this.paused = forceState !== undefined ? forceState : !this.paused;
    if (this.pauseBtn) {
      this.pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
    }
    if (this.onPauseToggleCallback) {
      this.onPauseToggleCallback(this.paused);
    }
  }

  nextGeneration() {
    this.iteration++;
    this.maxDistancePassed = 0;
    this.selectedPoolIndices.clear();
    if (this.paused) this.togglePause(false);
    this.#createCarsWithPool(this.#getTopCarInfoPool());
  }

  newTraining() {
    this.iteration = 0;
    this.maxDistancePassed = 0;
    this.selectedPoolIndices.clear();
    if (this.paused) this.togglePause(false);
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
    this.onCarsCreatedCallback(this.cars);
    console.log(
      `Generation ${this.iteration} started with ${settings.carCount} cars.`,
    );
  }

  #generateCars(n, type, config) {
    const start = this.getStartInfo();
    const cars = [];
    const color = type === 'AI' ? 'blue' : 'red';
    for (let i = 1; i <= n; i++) {
      const car = new Car({
        x: start.x,
        y: start.y,
        width: config.width,
        height: config.height,
        controlType: type,
        angle: start.angle,
        maxSpeed: config.maxSpeed,
        acceleration: config.acceleration,
        friction: config.friction,
        color,
        hiddenLayers: config.hiddenLayers,
        sensor: config.sensor,
      });
      car.name = type === 'KEYS' ? 'K' : String(i);
      cars.push(car);
    }
    return cars;
  }

  // ── Pool Management ──────────────────────────────────
  #loadPoolFromStorage() {
    // Try unified key first
    const stored = localStorage.getItem('bestPool');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fall through
      }
    }
    // Legacy migration: combine old separate keys into unified pool
    const legacyBrains = localStorage.getItem('bestBrains');
    const legacyBrain = localStorage.getItem('bestBrain');
    const legacyConfig = localStorage.getItem('bestCarInfo');
    if (legacyBrains || legacyBrain) {
      let brains = [];
      if (legacyBrains) {
        brains = JSON.parse(legacyBrains);
      } else if (legacyBrain) {
        brains = [JSON.parse(legacyBrain)];
      }
      const baseConfig = legacyConfig
        ? JSON.parse(legacyConfig)
        : this.getCarSettings();
      const pool = brains.map((brain) => ({
        ...baseConfig,
        sensor: { ...baseConfig.sensor },
        brain,
      }));
      // Migrate: write unified key and remove legacy keys
      localStorage.setItem('bestPool', JSON.stringify(pool));
      localStorage.removeItem('bestBrain');
      localStorage.removeItem('bestBrains');
      localStorage.removeItem('bestCarInfo');
      console.log('Migrated legacy storage to unified bestPool.');
      return pool;
    }
    return [];
  }

  // ── Storage ──────────────────────────────────────────
  save() {
    const sortedCars = this.#getSortedAICars();
    const { poolSize } = this.getSettings();
    const topCars = sortedCars.slice(0, poolSize);
    const pool = topCars.map((c) => c.toInfo());
    if (pool.length > 0) {
      localStorage.setItem('bestPool', JSON.stringify(pool));
      console.log(`Saved top ${pool.length} car(s) to localStorage.`);
    } else {
      console.warn('Could not save: no cars with brains found.');
    }
    // Download .car files only for selected pool cars
    if (this.selectedPoolIndices.size > 0) {
      const selectedCars = [...this.selectedPoolIndices]
        .sort((a, b) => a - b)
        .filter((idx) => idx < topCars.length)
        .map((idx) => ({ car: topCars[idx], poolPosition: idx }));
      this.#downloadSelectedCarFiles(selectedCars);
    }
  }

  #downloadSelectedCarFiles(selectedCars) {
    if (selectedCars.length === 0) return;
    const now = new Date();
    const dateStr =
      String(now.getFullYear()) +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    for (const { car, poolPosition } of selectedCars) {
      const carInfo = car.toInfo();
      const fileName =
        `${dateStr}_p${poolPosition + 1}` +
        `_${carInfo.width}x${carInfo.height}` +
        `_s${carInfo.maxSpeed}` +
        `_rc${carInfo.sensor.rayCount}` +
        `_rl${carInfo.sensor.rayLength}.car`;
      const json = JSON.stringify(carInfo, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    console.log(`Downloaded ${selectedCars.length} car file(s).`);
  }

  discard() {
    localStorage.removeItem('bestPool');
    // Remove legacy keys if they exist
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    console.log('Stored pool discarded from localStorage.');
  }

  #loadInitialCarConfig() {
    // Try unified pool first
    const pool = this.#loadPoolFromStorage();
    if (pool.length > 0) {
      this.setCarSettings(pool[0]);
      // Sync pool count input to match stored pool size
      if (this.poolCountInput) {
        this.poolCountInput.value = String(pool.length);
      }
      return;
    }
    // Fallback to global carInfo variable (e.g. from a .car script tag)
    if (typeof carInfo !== 'undefined') {
      this.setCarSettings(carInfo);
      localStorage.setItem('bestPool', JSON.stringify([carInfo]));
      console.log('Global carInfo loaded to localStorage.');
    }
  }

  // ── Stats & UI Updates ───────────────────────────────
  updateDistance(currentDist) {
    if (currentDist > this.maxDistancePassed) {
      this.maxDistancePassed = currentDist;
    }
  }

  updateStatsDisplay(alive, dead, frozen, maxDist) {
    if (this.statGenEl) this.statGenEl.textContent = String(this.iteration);
    if (this.statAliveEl) this.statAliveEl.textContent = String(alive);
    if (this.statDeadEl) this.statDeadEl.textContent = String(dead);
    if (this.statFrozenEl) this.statFrozenEl.textContent = String(frozen);
    if (this.statDistEl) this.statDistEl.textContent = String(maxDist);
  }

  updateBestCarAndPool() {
    const { poolSize } = this.getSettings();
    const sorted = this.#getSortedAICars();
    this.bestPool = sorted.slice(0, poolSize);
    this.bestCar = this.bestPool.length > 0 ? this.bestPool[0] : null;
    this.#updatePoolTable();
    this.#updateStatusDots();
  }

  #updatePoolTable() {
    if (!this.poolTableBody) return;
    const rows = [];
    for (let i = 0; i < this.bestPool.length; i++) {
      const car = this.bestPool[i];
      const fitness = Math.round(this.evaluateFitness(car));
      const selected = this.selectedPoolIndices.has(i)
        ? ' class="selected"'
        : '';
      rows.push(
        `<tr${selected} data-pool-idx="${i}"><td>${i + 1}</td><td>${car.name || '-'}</td><td>${fitness}</td></tr>`,
      );
    }
    this.poolTableBody.innerHTML = rows.join('');
    // Attach click handlers for selection
    this.poolTableBody.querySelectorAll('tr').forEach((row) => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.poolIdx);
        if (this.selectedPoolIndices.has(idx)) {
          this.selectedPoolIndices.delete(idx);
          row.classList.remove('selected');
        } else {
          this.selectedPoolIndices.add(idx);
          row.classList.add('selected');
        }
      });
    });
  }

  #updateStatusDots() {
    const stored = localStorage.getItem('bestPool');
    let storedPool = null;
    if (stored) {
      try {
        storedPool = JSON.parse(stored);
      } catch {
        // invalid
      }
    }
    if (this.dotStorage) {
      const hasStorage = !!storedPool;
      this.dotStorage.className =
        'status-dot ' + (hasStorage ? 'green' : 'red');
      this.dotStorage.title = hasStorage
        ? `${storedPool.length} car(s) in localStorage`
        : 'No saved cars';
    }
    if (this.dotPool) {
      if (!storedPool) {
        this.dotPool.className = 'status-dot red';
        this.dotPool.title = 'No pool (no storage)';
      } else {
        const settings = this.getSettings();
        const match = storedPool.length === settings.poolSize;
        this.dotPool.className = 'status-dot ' + (match ? 'green' : 'orange');
        this.dotPool.title = match
          ? `Pool: ${storedPool.length}/${settings.poolSize}`
          : `Pool size mismatch: stored ${storedPool.length}, expected ${settings.poolSize}`;
      }
    }
    if (this.dotCarConfig) {
      if (!storedPool || storedPool.length === 0) {
        this.dotCarConfig.className = 'status-dot red';
        this.dotCarConfig.title = 'No stored config to compare';
      } else {
        const storedInfo = storedPool[0];
        const current = this.getCarSettings();
        const matches = CarLoader.compareCarParams(storedInfo, current);
        this.dotCarConfig.className =
          'status-dot ' + (matches ? 'green' : 'orange');
        if (matches) {
          this.dotCarConfig.title = 'Config matches storage';
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
          if (storedInfo.sensor.raySpread !== current.sensor.raySpread)
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
          this.dotCarConfig.title = `Mismatch: ${diffs.join(', ')}`;
        }
      }
    }
  }

  static template = `
<!-- ── Stats ───────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Statistics</div>
  <div id="statsPanel">
    <div class="stat-row">
      <span class="stat-emoji">🧬</span>
      <span class="stat-label">Gen</span>
      <span class="stat-value" id="stat-gen">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">🟢</span>
      <span class="stat-label">Alive</span>
      <span class="stat-value" id="stat-alive">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">💀</span>
      <span class="stat-label">Dead</span>
      <span class="stat-value" id="stat-dead">0</span>
    </div>
    <div class="stat-row stat-row-toggle" id="stat-frozen-row" title="Click to toggle idle (freeze far cars)">
      <span class="stat-emoji">❄️</span>
      <span class="stat-label">Idle</span>
      <span class="stat-value" id="stat-frozen">0</span>
    </div>
    <div class="stat-row">
      <span class="stat-emoji">🛣️</span>
      <span class="stat-label">Best Dist</span>
      <span class="stat-value" id="stat-dist">0</span>
    </div>
  </div>
</div>

<!-- ── Parameters ──────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Training Params</div>
  <div class="param-grid">
    <div class="ctrl">
      <span class="ctrl-label">Cars</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="carCount">➖</button>
        <input
          type="number"
          id="carCount"
          value="500"
          min="0"
          max="5000"
          step="500"
          title="Number of AI cars in the population"
        />
        <button class="num-btn num-btn-inc" data-target="carCount">➕</button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Pool</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="poolCount">➖</button>
        <input
          type="number"
          id="poolCount"
          value="1"
          min="1"
          max="20"
          step="1"
          title="Number of top cars kept in the best pool"
        />
        <button class="num-btn num-btn-inc" data-target="poolCount">➕</button>
      </div>
    </div>
    <div class="ctrl">
      <span class="ctrl-label">Mutation</span>
      <div class="num-input-row">
        <button class="num-btn num-btn-dec" data-target="threshold">➖</button>
        <input
          type="number"
          id="threshold"
          value="0.2"
          step="0.05"
          min="0.001"
          max="1"
          title="Mutation amount applied each generation"
        />
        <button class="num-btn num-btn-inc" data-target="threshold">➕</button>
      </div>
    </div>
  </div>
</div>

<!-- ── Simulation Controls ─────────────────────────── -->
<div class="panel-section">
  <div class="section-title">Simulation</div>
  <div class="btn-group-large">
    <button id="pauseBtn" class="btn-lg" title="Pause / resume the simulation">
      ⏸️ Pause
    </button>
    <button
      id="nextGenBtn"
      class="btn-lg btn-primary"
      title="Start next generation (keeps best brains)"
    >
      🧬 Next Gen
    </button>
    <button
      id="newTrainingBtn"
      class="btn-lg btn-danger"
      title="Start fresh training (no brains carried over)"
    >
      🔄 New Training
    </button>
  </div>
</div>

<!-- ── Pool Statistics ──────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span>Pool</span>
    <span class="status-dot" id="dot-pool"></span>
  </div>
  <div id="poolStatsPanel">
    <table class="pool-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Fitness</th>
        </tr>
      </thead>
      <tbody id="poolTableBody">
      </tbody>
    </table>
  </div>
</div>

<!-- ── Storage ─────────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span>Storage</span>
    <span class="status-dot" id="dot-storage"></span>
  </div>
  <div class="btn-row">
    <button
      id="saveBtn"
      class="btn-sm btn-success-outline"
      title="Save pool to localStorage and download .car files"
    >
      💾 Save
    </button>
    <button
      id="discardBtn"
      class="btn-sm btn-danger-outline"
      title="Delete saved brain from localStorage"
    >
      🗑️ Clear
    </button>
  </div>
</div>

<!-- ── Car Config ──────────────────────────────────── -->
<div class="panel-section">
  <div class="section-title">
    <span>Car Config</span>
    <span class="status-dot" id="dot-car-config"></span>
  </div>
  <div class="car-config-grid">
    <div class="ctrl">
      <span class="ctrl-label">Max Speed</span>
      <input
        type="number"
        id="carMaxSpeed"
        value="3"
        step="0.5"
        min="1"
        max="20"
        title="Car maximum speed"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Accel</span>
      <input
        type="number"
        id="carAcceleration"
        value="0.2"
        step="0.01"
        min="0.01"
        max="1"
        title="Car acceleration"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Friction</span>
      <input
        type="number"
        id="carFriction"
        value="0.05"
        step="0.01"
        min="0.01"
        max="0.5"
        title="Car friction"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Width</span>
      <input
        type="number"
        id="carWidth"
        value="30"
        step="5"
        min="10"
        max="100"
        title="Car width"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Height</span>
      <input
        type="number"
        id="carHeight"
        value="50"
        step="5"
        min="20"
        max="150"
        title="Car height"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Rays</span>
      <input
        type="number"
        id="carRayCount"
        value="5"
        step="1"
        min="1"
        max="20"
        title="Sensor ray count"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Len</span>
      <input
        type="number"
        id="carRayLength"
        value="150"
        step="10"
        min="50"
        max="500"
        title="Sensor ray length"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Spread</span>
      <input
        type="number"
        id="carRaySpread"
        value="1.57"
        step="0.1"
        min="0.1"
        max="6.28"
        title="Sensor ray spread (radians)"
      />
    </div>

    <div class="ctrl">
      <span class="ctrl-label">Ray Offset</span>
      <input
        type="number"
        id="carRayOffset"
        value="0"
        step="0.1"
        min="-3.14"
        max="3.14"
        title="Sensor ray offset (radians)"
      />
    </div>

    <div class="ctrl ctrl-wide">
      <span class="ctrl-label">Hidden Layers</span>
      <input
        type="text"
        id="carHiddenLayers"
        value="6"
        title="Hidden layer sizes (comma-separated, e.g. 6 or 8,6)"
      />
    </div>
  </div>
</div>
`;
}
customElements.define('training-manager-panel', TrainingManagerPanelElement);
