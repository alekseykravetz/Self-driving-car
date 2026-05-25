'use strict';
class TrainingManager {
  iteration = 0;
  maxDistancePassed = 0;
  paused = false;
  getCars;
  evaluateFitness;
  onRestartCallback;
  onPauseToggleCallback;
  // DOM Elements
  carCountInput = null;
  thresholdInput = null;
  poolCountInput = null;
  showVisualizerCheckbox = null;
  pauseBtn = null;
  restartBtn = null;
  saveBtn = null;
  discardBtn = null;
  statGenEl = null;
  statAliveEl = null;
  statDeadEl = null;
  statFrozenEl = null;
  statDistEl = null;
  constructor(options) {
    this.getCars = options.getCars;
    this.evaluateFitness = options.evaluateFitness;
    this.onRestartCallback = options.onRestart;
    this.onPauseToggleCallback = options.onPauseToggle;
    this.initDOMElements();
    this.addEventListeners();
  }

  initDOMElements() {
    this.carCountInput = document.getElementById('carCount');
    this.thresholdInput = document.getElementById('threshold');
    this.poolCountInput = document.getElementById('poolCount');
    this.showVisualizerCheckbox = document.getElementById('showVisualizer');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.discardBtn = document.getElementById('discardBtn');
    this.statGenEl = document.getElementById('stat-gen');
    this.statAliveEl = document.getElementById('stat-alive');
    this.statDeadEl = document.getElementById('stat-dead');
    this.statFrozenEl = document.getElementById('stat-frozen');
    this.statDistEl = document.getElementById('stat-dist');
  }

  addEventListeners() {
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => this.togglePause());
    }
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.restart());
    }
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.save());
    }
    if (this.discardBtn) {
      this.discardBtn.addEventListener('click', () => this.discard());
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

  togglePause(forceState) {
    this.paused = forceState !== undefined ? forceState : !this.paused;
    if (this.pauseBtn) {
      this.pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
    }
    if (this.onPauseToggleCallback) {
      this.onPauseToggleCallback(this.paused);
    }
  }

  restart() {
    this.iteration++;
    const cars = this.getCars();
    const settings = this.getSettings();
    const sortedCars = cars
      .filter((c) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));
    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c) => c.brain);
    if (this.paused) {
      this.togglePause(false);
    }
    this.onRestartCallback(bestBrainPool);
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
    const cars = this.getCars();
    const settings = this.getSettings();
    const sortedCars = cars
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
  }

  discard() {
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    console.log('Stored brains discarded from localStorage.');
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

  updateBestCarAndPool(cars) {
    const settings = this.getSettings();
    const aiBrainCars = cars.filter((c) => c.brain && c.type !== 'KEYS');
    aiBrainCars.sort(
      (a, b) => this.evaluateFitness(b) - this.evaluateFitness(a),
    );
    const bestPool = aiBrainCars.slice(0, settings.poolSize);
    for (const car of aiBrainCars) {
      car.name = undefined;
    }
    for (let i = 0; i < bestPool.length; i++) {
      bestPool[i].name = String(i + 1);
    }
    const bestCar = bestPool.length > 0 ? bestPool[0] : null;
    return { bestCar, bestPool };
  }
}
