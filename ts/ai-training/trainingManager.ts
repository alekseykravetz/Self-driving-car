interface TrainingManagerOptions {
  evaluateFitness: (car: Car) => number;
  getStartInfo: () => { x: number; y: number; angle: number };
  onCarsCreated: (cars: Car[]) => void;
  onPauseToggle?: (paused: boolean) => void;
}

class TrainingManager {
  public iteration: number = 0;
  public maxDistancePassed: number = 0;
  public paused: boolean = false;
  public cars: Car[] = [];
  public bestCar: Car | null = null;
  public bestPool: Car[] = [];

  private evaluateFitness: (car: Car) => number;
  private getStartInfo: () => { x: number; y: number; angle: number };
  private onCarsCreatedCallback: (cars: Car[]) => void;
  private onPauseToggleCallback?: (paused: boolean) => void;

  // DOM Elements
  private carCountInput: HTMLInputElement | null = null;
  private thresholdInput: HTMLInputElement | null = null;
  private poolCountInput: HTMLInputElement | null = null;
  private showVisualizerCheckbox: HTMLInputElement | null = null;
  private showCameraViewCheckbox: HTMLInputElement | null = null;
  private pauseBtn: HTMLButtonElement | null = null;
  private nextGenBtn: HTMLButtonElement | null = null;
  private newTrainingBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private discardBtn: HTMLButtonElement | null = null;

  // Car config DOM elements
  private carMaxSpeedInput: HTMLInputElement | null = null;
  private carAccelerationInput: HTMLInputElement | null = null;
  private carFrictionInput: HTMLInputElement | null = null;
  private carWidthInput: HTMLInputElement | null = null;
  private carHeightInput: HTMLInputElement | null = null;
  private carRayCountInput: HTMLInputElement | null = null;
  private carRayLengthInput: HTMLInputElement | null = null;
  private carRaySpreadInput: HTMLInputElement | null = null;
  private carRayOffsetInput: HTMLInputElement | null = null;
  private saveCarBtn: HTMLButtonElement | null = null;
  private loadCarInput: HTMLInputElement | null = null;

  private statGenEl: HTMLElement | null = null;
  private statAliveEl: HTMLElement | null = null;
  private statDeadEl: HTMLElement | null = null;
  private statFrozenEl: HTMLElement | null = null;
  private statDistEl: HTMLElement | null = null;

  constructor(options: TrainingManagerOptions) {
    this.evaluateFitness = options.evaluateFitness;
    this.getStartInfo = options.getStartInfo;
    this.onCarsCreatedCallback = options.onCarsCreated;
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
    this.showCameraViewCheckbox = document.getElementById(
      'showCameraView',
    ) as HTMLInputElement | null;
    this.pauseBtn = document.getElementById(
      'pauseBtn',
    ) as HTMLButtonElement | null;
    this.nextGenBtn = document.getElementById(
      'nextGenBtn',
    ) as HTMLButtonElement | null;
    this.newTrainingBtn = document.getElementById(
      'newTrainingBtn',
    ) as HTMLButtonElement | null;
    this.saveBtn = document.getElementById(
      'saveBtn',
    ) as HTMLButtonElement | null;
    this.discardBtn = document.getElementById(
      'discardBtn',
    ) as HTMLButtonElement | null;

    // Car config inputs
    this.carMaxSpeedInput = document.getElementById(
      'carMaxSpeed',
    ) as HTMLInputElement | null;
    this.carAccelerationInput = document.getElementById(
      'carAcceleration',
    ) as HTMLInputElement | null;
    this.carFrictionInput = document.getElementById(
      'carFriction',
    ) as HTMLInputElement | null;
    this.carWidthInput = document.getElementById(
      'carWidth',
    ) as HTMLInputElement | null;
    this.carHeightInput = document.getElementById(
      'carHeight',
    ) as HTMLInputElement | null;
    this.carRayCountInput = document.getElementById(
      'carRayCount',
    ) as HTMLInputElement | null;
    this.carRayLengthInput = document.getElementById(
      'carRayLength',
    ) as HTMLInputElement | null;
    this.carRaySpreadInput = document.getElementById(
      'carRaySpread',
    ) as HTMLInputElement | null;
    this.carRayOffsetInput = document.getElementById(
      'carRayOffset',
    ) as HTMLInputElement | null;
    this.saveCarBtn = document.getElementById(
      'saveCarBtn',
    ) as HTMLButtonElement | null;
    this.loadCarInput = document.getElementById(
      'loadCarInput',
    ) as HTMLInputElement | null;

    this.statGenEl = document.getElementById('stat-gen');
    this.statAliveEl = document.getElementById('stat-alive');
    this.statDeadEl = document.getElementById('stat-dead');
    this.statFrozenEl = document.getElementById('stat-frozen');
    this.statDistEl = document.getElementById('stat-dist');

    // Initialize car config from localStorage or global carInfo
    this.#loadInitialCarConfig();
  }

  private addEventListeners(): void {
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

  public get showCameraView(): boolean {
    return this.showCameraViewCheckbox
      ? this.showCameraViewCheckbox.checked
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

  public nextGeneration(): void {
    this.iteration++;
    this.maxDistancePassed = 0;
    const settings = this.getSettings();

    const sortedCars = this.cars
      .filter((c: Car) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));

    const bestBrainPool = sortedCars
      .slice(0, settings.poolSize)
      .map((c: Car) => c.brain!);

    if (this.paused) {
      this.togglePause(false);
    }

    this.#createCarsWithBrainPool(bestBrainPool);
  }

  public newTraining(): void {
    this.iteration = 0;
    this.maxDistancePassed = 0;

    if (this.paused) {
      this.togglePause(false);
    }

    this.#createCarsWithBrainPool([]);
  }

  /** Shared logic: create cars and apply brains from pool or localStorage. */
  #createCarsWithBrainPool(bestBrainPool: NeuralNetwork[]): void {
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
  public initializeCars(): void {
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
  private generateCars(n: number, type: string, config: CarInfo): Car[] {
    const start = this.getStartInfo();
    const cars: Car[] = [];
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
    const settings = this.getSettings();
    const sortedCars = this.cars
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

    // Also save full car config to localStorage
    const carSettings = this.getCarSettings();
    localStorage.setItem('bestCarInfo', JSON.stringify(carSettings));
    console.log('Car config saved to localStorage.');
  }

  public discard(): void {
    localStorage.removeItem('bestBrain');
    localStorage.removeItem('bestBrains');
    localStorage.removeItem('bestCarInfo');
    console.log('Stored brains and car config discarded from localStorage.');
  }

  public getCarSettings(): CarInfo {
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

  public setCarSettings(info: CarInfo): void {
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

  public applyCarSettingsToCars(cars: Car[]): void {
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

  public saveCarToFile(): void {
    const sortedCars = this.cars
      .filter((c: Car) => c.brain && c.type !== 'KEYS')
      .sort((a, b) => this.evaluateFitness(b) - this.evaluateFitness(a));

    const bestCar = sortedCars.length > 0 ? sortedCars[0] : null;
    const carInfo: CarInfo = bestCar ? bestCar.toInfo() : this.getCarSettings();

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

  #loadCarFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const content = event.target.result as string;
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

  #parseCarFile(content: string): CarInfo | null {
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

  #loadInitialCarConfig(): void {
    // Priority: localStorage > global carInfo > defaults (already in HTML)
    const stored = localStorage.getItem('bestCarInfo');
    if (stored) {
      try {
        const info: CarInfo = JSON.parse(stored);
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

  public updateBestCarAndPool(): void {
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
