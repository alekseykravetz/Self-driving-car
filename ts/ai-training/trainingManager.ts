interface TrainingManagerOptions {
  getCars: () => Car[];
  evaluateFitness: (car: Car) => number;
  onRestart: (bestBrainPool: NeuralNetwork[]) => void;
  onPauseToggle?: (paused: boolean) => void;
}

class TrainingManager {
  public iteration: number = 0;
  public maxDistancePassed: number = 0;
  public paused: boolean = false;

  private getCars: () => Car[];
  private evaluateFitness: (car: Car) => number;
  private onRestartCallback: (bestBrainPool: NeuralNetwork[]) => void;
  private onPauseToggleCallback?: (paused: boolean) => void;

  // DOM Elements
  private carCountInput: HTMLInputElement | null = null;
  private thresholdInput: HTMLInputElement | null = null;
  private poolCountInput: HTMLInputElement | null = null;
  private showVisualizerCheckbox: HTMLInputElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private restartBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private discardBtn: HTMLButtonElement | null = null;

  private statGenEl: HTMLElement | null = null;
  private statAliveEl: HTMLElement | null = null;
  private statDeadEl: HTMLElement | null = null;
  private statFrozenEl: HTMLElement | null = null;
  private statDistEl: HTMLElement | null = null;

  constructor(options: TrainingManagerOptions) {
    this.getCars = options.getCars;
    this.evaluateFitness = options.evaluateFitness;
    this.onRestartCallback = options.onRestart;
    this.onPauseToggleCallback = options.onPauseToggle;

    this.initDOMElements();
    this.addEventListeners();
  }

  private initDOMElements(): void {
    this.carCountInput = document.getElementById(
      'carCount',
    ) as HTMLInputElement | null;
    this.thresholdInput = document.getElementById(
      'threshold',
    ) as HTMLInputElement | null;
    this.poolCountInput = document.getElementById(
      'poolCount',
    ) as HTMLInputElement | null;
    this.showVisualizerCheckbox = document.getElementById(
      'showVisualizer',
    ) as HTMLInputElement | null;
    this.pauseBtn = document.getElementById(
      'pauseBtn',
    ) as HTMLButtonElement | null;
    this.restartBtn = document.getElementById(
      'restartBtn',
    ) as HTMLButtonElement | null;
    this.saveBtn = document.getElementById(
      'saveBtn',
    ) as HTMLButtonElement | null;
    this.discardBtn = document.getElementById(
      'discardBtn',
    ) as HTMLButtonElement | null;

    this.statGenEl = document.getElementById('stat-gen');
    this.statAliveEl = document.getElementById('stat-alive');
    this.statDeadEl = document.getElementById('stat-dead');
    this.statFrozenEl = document.getElementById('stat-frozen');
    this.statDistEl = document.getElementById('stat-dist');
  }

  private addEventListeners(): void {
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

  public getSettings(): {
    carCount: number;
    poolSize: number;
    mutationRate: number;
  } {
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

  public get showVisualizer(): boolean {
    return this.showVisualizerCheckbox
      ? this.showVisualizerCheckbox.checked
      : true;
  }

  public togglePause(forceState?: boolean): void {
    this.paused = forceState !== undefined ? forceState : !this.paused;
    if (this.pauseBtn) {
      this.pauseBtn.textContent = this.paused ? '▶️' : '⏸️';
    }
    if (this.onPauseToggleCallback) {
      this.onPauseToggleCallback(this.paused);
    }
  }

  public restart(): void {
    this.iteration++;
    const cars = this.getCars();
    const settings = this.getSettings();

    const sortedCars = cars
      .filter((c: Car) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));

    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c: Car) => c.brain!);

    if (this.paused) {
      this.togglePause(false);
    }

    this.onRestartCallback(bestBrainPool);
  }

  public updateCarsWithBrain(cars: Car[]): void {
    const storedBrains = localStorage.getItem('bestBrains');
    const storedBrain = localStorage.getItem('bestBrain');
    const settings = this.getSettings();

    let pool: NeuralNetwork[] = [];
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

  public applyBrainPool(cars: Car[], bestBrainPool: NeuralNetwork[]): void {
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

  public save(): void {
    const cars = this.getCars();
    const settings = this.getSettings();
    const sortedCars = cars
      .filter((c: Car) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));

    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c: Car) => c.brain!);

    if (bestBrainPool.length > 0) {
      localStorage.setItem('bestBrains', JSON.stringify(bestBrainPool));
      localStorage.setItem('bestBrain', JSON.stringify(bestBrainPool[0]));
      console.log(`Saved top ${bestBrainPool.length} brains to localStorage.`);
    } else {
      console.warn('Could not save brains: no cars with brains found.');
    }
  }

  public discard(): void {
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    console.log('Stored brains discarded from localStorage.');
  }

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
  ): void {
    if (this.statGenEl) this.statGenEl.textContent = String(this.iteration);
    if (this.statAliveEl) this.statAliveEl.textContent = String(alive);
    if (this.statDeadEl) this.statDeadEl.textContent = String(dead);
    if (this.statFrozenEl) this.statFrozenEl.textContent = String(frozen);
    if (this.statDistEl) this.statDistEl.textContent = String(maxDist);
  }

  public updateBestCarAndPool(cars: Car[]): {
    bestCar: Car | null;
    bestPool: Car[];
  } {
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
