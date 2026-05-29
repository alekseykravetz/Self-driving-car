'use strict';
class TrainingManager {
  iteration = 0;
  maxDistancePassed = 0;
  paused = false;
  cars = [];
  bestCar = null;
  bestPool = [];
  evaluateFitness;
  getStartInfo;
  onCarsCreatedCallback;
  onPauseToggleCallback;
  // DOM Elements
  carCountInput = null;
  thresholdInput = null;
  poolCountInput = null;
  showVisualizerCheckbox = null;
  showCameraViewCheckbox = null;
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
  saveCarBtn = null;
  loadCarInput = null;
  statGenEl = null;
  statAliveEl = null;
  statDeadEl = null;
  statFrozenEl = null;
  statDistEl = null;
  constructor(options) {
    this.evaluateFitness = options.evaluateFitness;
    this.getStartInfo = options.getStartInfo;
    this.onCarsCreatedCallback = options.onCarsCreated;
    this.onPauseToggleCallback = options.onPauseToggle;
    this.initDOMElements();
    this.addEventListeners();
  }

  initDOMElements() {
    this.carCountInput = document.getElementById('carCount');
    this.thresholdInput = document.getElementById('threshold');
    this.poolCountInput = document.getElementById('poolCount');
    this.showVisualizerCheckbox = document.getElementById('showVisualizer');
    this.showCameraViewCheckbox = document.getElementById('showCameraView');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.nextGenBtn = document.getElementById('nextGenBtn');
    this.newTrainingBtn = document.getElementById('newTrainingBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.discardBtn = document.getElementById('discardBtn');
    // Car config inputs
    this.carMaxSpeedInput = document.getElementById('carMaxSpeed');
    this.carAccelerationInput = document.getElementById('carAcceleration');
    this.carFrictionInput = document.getElementById('carFriction');
    this.carWidthInput = document.getElementById('carWidth');
    this.carHeightInput = document.getElementById('carHeight');
    this.carRayCountInput = document.getElementById('carRayCount');
    this.carRayLengthInput = document.getElementById('carRayLength');
    this.carRaySpreadInput = document.getElementById('carRaySpread');
    this.carRayOffsetInput = document.getElementById('carRayOffset');
    this.saveCarBtn = document.getElementById('saveCarBtn');
    this.loadCarInput = document.getElementById('loadCarInput');
    this.statGenEl = document.getElementById('stat-gen');
    this.statAliveEl = document.getElementById('stat-alive');
    this.statDeadEl = document.getElementById('stat-dead');
    this.statFrozenEl = document.getElementById('stat-frozen');
    this.statDistEl = document.getElementById('stat-dist');
    // Initialize car config from localStorage or global carInfo
    this.#loadInitialCarConfig();
  }

  addEventListeners() {
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
    if (this.saveCarBtn) {
      this.saveCarBtn.addEventListener('click', () => this.saveCarToFile());
    }
    if (this.loadCarInput) {
      this.loadCarInput.addEventListener('change', (e) =>
        this.#loadCarFromFile(e),
      );
    }
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
    ];
    for (const input of carParamInputs) {
      if (input) {
        input.addEventListener('change', () => this.newTraining());
      }
    }
  }

  getSettings() {
    const carCount = this.carCountInput
      ? parseInt(this.carCountInput.value) || 100
      : 100;
    const poolSize = this.poolCountInput
      ? parseInt(this.poolCountInput.value) || 5
      : 5;
    const mutationRate = this.thresholdInput
      ? parseFloat(this.thresholdInput.value) || 0.1
      : 0.1;
    return { carCount, poolSize, mutationRate };
  }

  get showVisualizer() {
    return this.showVisualizerCheckbox
      ? this.showVisualizerCheckbox.checked
      : true;
  }

  get showCameraView() {
    return this.showCameraViewCheckbox
      ? this.showCameraViewCheckbox.checked
      : true;
  }

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
    const settings = this.getSettings();
    const sortedCars = this.cars
      .filter((c) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));
    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c) => c.brain);
    if (this.paused) {
      this.togglePause(false);
    }
    this.#createCarsWithBrainPool(bestBrainPool);
  }

  newTraining() {
    this.iteration = 0;
    this.maxDistancePassed = 0;
    if (this.paused) {
      this.togglePause(false);
    }
    this.#createCarsWithBrainPool([]);
  }

  /** Shared logic: create cars and apply brains from pool or localStorage. */
  #createCarsWithBrainPool(bestBrainPool) {
    const settings = this.getSettings();
    const config = this.getCarSettings();
    const aiCars = this.generateCars(settings.carCount, 'AI', config);
    const keysCar = this.generateCars(1, 'KEYS', config);
    this.cars = [...keysCar, ...aiCars];
    this.bestCar = this.cars[0];
    this.bestPool = [];
    this.applyCarSettingsToCars(this.cars);
    this.applyBrainPool(this.cars, bestBrainPool);
    this.onCarsCreatedCallback(this.cars);
    console.log(
      `Generation ${this.iteration} started with ${settings.carCount} cars.`,
    );
  }

  /** Called once at startup to create the initial population. */
  initializeCars() {
    const settings = this.getSettings();
    const config = this.getCarSettings();
    const aiCars = this.generateCars(settings.carCount, 'AI', config);
    const keysCar = this.generateCars(1, 'KEYS', config);
    this.cars = [...keysCar, ...aiCars];
    this.bestCar = this.cars[0];
    this.applyCarSettingsToCars(this.cars);
    this.updateCarsWithBrain(this.cars);
    this.onCarsCreatedCallback(this.cars);
  }

  /** Creates n cars of the given type at the start position. */
  generateCars(n, type, config) {
    const start = this.getStartInfo();
    const cars = [];
    const color = type === 'AI' ? 'blue' : 'red';
    for (let i = 1; i <= n; i++) {
      const car = new Car(
        start.x,
        start.y,
        config.width,
        config.height,
        type,
        start.angle,
        config.maxSpeed,
        color,
      );
      car.acceleration = config.acceleration;
      car.friction = config.friction;
      cars.push(car);
    }
    return cars;
  }

  updateCarsWithBrain(cars) {
    const storedBrains = localStorage.getItem('bestBrains');
    const storedBrain = localStorage.getItem('bestBrain');
    const settings = this.getSettings();
    let pool = [];
    if (storedBrains) {
      pool = JSON.parse(storedBrains);
    } else if (storedBrain) {
      pool = [JSON.parse(storedBrain)];
    }
    if (pool.length > 0) {
      let aiIndex = 0;
      for (let i = 0; i < cars.length; i++) {
        if (cars[i].type === 'KEYS') continue;
        if (aiIndex < pool.length) {
          cars[i].brain = JSON.parse(JSON.stringify(pool[aiIndex]));
        } else {
          cars[i].brain = NeuralNetwork.mutateFromPool(
            pool,
            settings.mutationRate,
          );
        }
        aiIndex++;
      }
    }
  }

  applyBrainPool(cars, bestBrainPool) {
    const settings = this.getSettings();
    if (bestBrainPool.length > 0) {
      let aiIndex = 0;
      for (let i = 0; i < cars.length; i++) {
        if (cars[i].type === 'KEYS') continue;
        if (aiIndex < bestBrainPool.length) {
          cars[i].brain = JSON.parse(JSON.stringify(bestBrainPool[aiIndex]));
        } else {
          cars[i].brain = NeuralNetwork.mutateFromPool(
            bestBrainPool,
            settings.mutationRate,
          );
        }
        aiIndex++;
      }
    } else {
      this.updateCarsWithBrain(cars);
    }
  }

  save() {
    const settings = this.getSettings();
    const sortedCars = this.cars
      .filter((c) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));
    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c) => c.brain);
    if (bestBrainPool.length > 0) {
      localStorage.setItem('bestBrains', JSON.stringify(bestBrainPool));
      localStorage.setItem('bestBrain', JSON.stringify(bestBrainPool[0]));
      console.log(`Saved top ${bestBrainPool.length} brains to localStorage.`);
    } else {
      console.warn('Could not save brains: no cars with brains found.');
    }
    // Also save full car config to localStorage
    const carSettings = this.getCarSettings();
    localStorage.setItem('bestCarInfo', JSON.stringify(carSettings));
    console.log('Car config saved to localStorage.');
  }

  discard() {
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    console.log('Stored brains and car config discarded from localStorage.');
  }

  getCarSettings() {
    return {
      maxSpeed: this.carMaxSpeedInput
        ? parseFloat(this.carMaxSpeedInput.value) || 3
        : 3,
      acceleration: this.carAccelerationInput
        ? parseFloat(this.carAccelerationInput.value) || 0.2
        : 0.2,
      friction: this.carFrictionInput
        ? parseFloat(this.carFrictionInput.value) || 0.05
        : 0.05,
      width: this.carWidthInput ? parseInt(this.carWidthInput.value) || 30 : 30,
      height: this.carHeightInput
        ? parseInt(this.carHeightInput.value) || 50
        : 50,
      sensor: {
        rayCount: this.carRayCountInput
          ? parseInt(this.carRayCountInput.value) || 5
          : 5,
        rayLength: this.carRayLengthInput
          ? parseInt(this.carRayLengthInput.value) || 150
          : 150,
        raySpread: this.carRaySpreadInput
          ? parseFloat(this.carRaySpreadInput.value) || Math.PI / 2
          : Math.PI / 2,
        rayOffset: this.carRayOffsetInput
          ? parseFloat(this.carRayOffsetInput.value) || 0
          : 0,
      },
    };
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
    if (this.carRayCountInput)
      this.carRayCountInput.value = String(info.sensor.rayCount);
    if (this.carRayLengthInput)
      this.carRayLengthInput.value = String(info.sensor.rayLength);
    if (this.carRaySpreadInput)
      this.carRaySpreadInput.value = String(info.sensor.raySpread);
    if (this.carRayOffsetInput)
      this.carRayOffsetInput.value = String(info.sensor.rayOffset);
  }

  applyCarSettingsToCars(cars) {
    const config = this.getCarSettings();
    for (const car of cars) {
      car.maxSpeed = config.maxSpeed;
      car.acceleration = config.acceleration;
      car.friction = config.friction;
      car.width = config.width;
      car.height = config.height;
      if (car.sensor) {
        const rayCountChanged = car.sensor.rayCount !== config.sensor.rayCount;
        car.sensor.rayCount = config.sensor.rayCount;
        car.sensor.rayLength = config.sensor.rayLength;
        car.sensor.raySpread = config.sensor.raySpread;
        car.sensor.rayOffset = config.sensor.rayOffset;
        // Rebuild brain if ray count changed and brain exists
        if (rayCountChanged && car.brain) {
          car.brain = new NeuralNetwork([config.sensor.rayCount + 1, 6, 4]);
        }
      }
    }
  }

  saveCarToFile() {
    const sortedCars = this.cars
      .filter((c) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));
    const bestCar = sortedCars.length > 0 ? sortedCars[0] : null;
    const carInfo = bestCar ? bestCar.toInfo() : this.getCarSettings();
    const json = JSON.stringify(carInfo, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'car.car';
    a.click();
    URL.revokeObjectURL(url);
    console.log('Car config saved to file.');
  }

  #loadCarFromFile(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const content = event.target.result;
      const carInfo = this.#parseCarFile(content);
      if (carInfo) {
        this.setCarSettings(carInfo);
        // Store brain from loaded file if present
        if (carInfo.brain) {
          localStorage.setItem('bestBrain', JSON.stringify(carInfo.brain));
          localStorage.setItem('bestBrains', JSON.stringify([carInfo.brain]));
        } else {
          // No brain in file — clear stored brains to start fresh
          localStorage.removeItem('bestBrain');
          localStorage.removeItem('bestBrains');
        }
        localStorage.setItem('bestCarInfo', JSON.stringify(carInfo));
        console.log('Car config loaded from file.');
        // Start a fresh training with the new car config
        this.newTraining();
      } else {
        alert('Failed to parse car file.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  #parseCarFile(content) {
    try {
      // Try plain JSON first
      const trimmed = content.trim();
      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed);
      }
      // Legacy format: let carInfo = { ... }
      const match = content.match(/=\s*([\s\S]*?)\s*;?\s*$/);
      if (match) {
        // Remove trailing semicolons and whitespace
        let jsonStr = match[1].trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1).trim();
        return JSON.parse(jsonStr);
      }
      return null;
    } catch (err) {
      console.error('Error parsing car file:', err);
      return null;
    }
  }

  #loadInitialCarConfig() {
    // Priority: localStorage > global carInfo > defaults (already in HTML)
    const stored = localStorage.getItem('bestCarInfo');
    if (stored) {
      try {
        const info = JSON.parse(stored);
        this.setCarSettings(info);
        return;
      } catch (e) {
        console.warn('Failed to parse stored car config', e);
      }
    }
    // Check global carInfo (from legacy script tag)
    if (typeof carInfo !== 'undefined') {
      this.setCarSettings(carInfo);
      if (carInfo.brain) {
        localStorage.setItem('bestBrain', JSON.stringify(carInfo.brain));
        localStorage.setItem('bestBrains', JSON.stringify([carInfo.brain]));
      }
      localStorage.setItem('bestCarInfo', JSON.stringify(carInfo));
      console.log('Global Car info loaded to localStorage.');
    }
  }

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
    const settings = this.getSettings();
    const aiBrainCars = this.cars.filter((c) => c.brain && c.type !== 'KEYS');
    aiBrainCars.sort(
      (a, b) => this.evaluateFitness(b) - this.evaluateFitness(a),
    );
    this.bestPool = aiBrainCars.slice(0, settings.poolSize);
    for (const car of aiBrainCars) {
      car.name = undefined;
    }
    for (let i = 0; i < this.bestPool.length; i++) {
      this.bestPool[i].name = String(i + 1);
    }
    this.bestCar = this.bestPool.length > 0 ? this.bestPool[0] : null;
  }
}
