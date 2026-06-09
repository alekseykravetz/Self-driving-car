class Race {
  gameCanvas: HTMLCanvasElement;
  gameCtx: CanvasRenderingContext2D;
  cameraCanvas: HTMLCanvasElement;
  cameraCtx: CanvasRenderingContext2D;
  miniMapCanvas: HTMLCanvasElement;
  controls: Controls | null;

  topControlsPanel!: TopControlsPanelElement;
  racePanel!: HTMLElement;
  carsInput!: HTMLInputElement;

  world!: World;
  camera: Camera | null = null;
  viewport: Viewport | null = null;
  miniMap: MiniMap | null = null;

  N: number = 10;
  cars: Car[] | null = null;
  myCar: Car | null = null;
  roadBorders: [Point, Point][] | null = null;

  frameCount: number = 0;
  started: boolean = false;
  animating: boolean = false;

  statistics!: HTMLElement;
  counter!: HTMLElement;

  constructor(
    gameCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    controls: Controls | null = null,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d')!;

    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d')!;

    this.miniMapCanvas = miniMapCanvas;
    this.controls = controls;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo: World | null = worldString
        ? JSON.parse(worldString)
        : null;
      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // note: global world
    }

    if (this.controls && this.myCar) {
      this.myCar.controls = this.controls;
    }
  }

  generateCars(n: number, type: 'AI' | 'KEYS'): Car[] {
    const startMarkings = this.world.markings.filter(
      (m): m is Start => m instanceof Start,
    );
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);
    const startAngle = -angle(direction) + Math.PI / 2;

    const pool = type === 'AI' ? this.#loadPoolFromStorage() : [];

    const cars: Car[] = [];
    for (let i = 1; i <= n; i++) {
      const color = type === 'AI' ? getRandomColor() : 'blue';
      const car = new Car({
        x: startPoint.x,
        y: startPoint.y,
        controlType: type,
        angle: startAngle,
        color,
      });
      car.name = type === 'AI' ? 'AI ' + i : 'Player ' + i;

      if (type === 'AI') {
        const poolIndex = i - 1; // 0-based index for AI cars
        if (poolIndex < pool.length) {
          // Apply pool car as-is (no mutation)
          car.load(pool[poolIndex]);
        } else if (pool.length > 0) {
          // Beyond pool: mutated copy of pool[0]
          car.load(pool[0]);
          if (car.brain) {
            NeuralNetwork.mutate(car.brain, 0.1);
          }
        } else if (typeof carInfo !== 'undefined') {
          car.load(carInfo);
        }
      } else {
        // KEYS car: load from global carInfo only (never from pool)
        if (typeof carInfo !== 'undefined') {
          car.load(carInfo);
        }
      }
      cars.push(car);
    }
    return cars;
  }

  #loadPoolFromStorage(): CarInfo[] {
    const stored = localStorage.getItem('bestPool');
    if (stored) {
      try {
        return JSON.parse(stored) as CarInfo[];
      } catch {
        // fall through
      }
    }
    // Legacy migration
    const legacyBrains = localStorage.getItem('bestBrains');
    const legacyBrain = localStorage.getItem('bestBrain');
    const legacyConfig = localStorage.getItem('bestCarInfo');
    if (legacyBrains || legacyBrain) {
      let brains: NeuralNetwork[] = [];
      if (legacyBrains) {
        brains = JSON.parse(legacyBrains);
      } else if (legacyBrain) {
        brains = [JSON.parse(legacyBrain)];
      }
      const baseConfig: CarInfo = legacyConfig
        ? JSON.parse(legacyConfig)
        : {
            maxSpeed: 3,
            acceleration: 0.2,
            friction: 0.05,
            width: 30,
            height: 50,
            sensor: {
              rayCount: 5,
              rayLength: 150,
              raySpread: Math.PI / 2,
              rayOffset: 0,
            },
          };
      const pool: CarInfo[] = brains.map((brain) => ({
        ...baseConfig,
        sensor: { ...baseConfig.sensor },
        brain,
      }));
      localStorage.setItem('bestPool', JSON.stringify(pool));
      localStorage.removeItem('bestBrain');
      localStorage.removeItem('bestBrains');
      localStorage.removeItem('bestCarInfo');
      return pool;
    }
    return [];
  }

  #addEventListeners(): void {
    this.topControlsPanel = document.querySelector(
      'top-controls-panel',
    ) as TopControlsPanelElement;

    // World loading via WorldLoader (binds to #loadWorldInput inside the panel)
    new WorldLoader((worldInfo) => this.#initializeRace(worldInfo as World));

    // Car loading via CarLoader (binds to #loadCarInput inside the panel)
    new CarLoader((carInfos: CarInfo[]) => this.#handleCarsLoaded(carInfos));

    this.statistics = document.getElementById('statistics')!;
    this.counter = document.getElementById('counter')!;

    this.#createRacePanel();
  }

  #createRacePanel(): void {
    this.racePanel = document.createElement('div');
    this.racePanel.id = 'racePanel';

    const label = document.createElement('label');
    label.textContent = 'Cars:';
    label.className = 'race-panel-label';

    this.carsInput = document.createElement('input');
    this.carsInput.type = 'number';
    this.carsInput.id = 'carsInRaceInput';
    this.carsInput.min = '1';
    this.carsInput.max = '100';
    this.carsInput.value = String(this.N);
    this.carsInput.addEventListener('change', () => {
      const val = parseInt(this.carsInput.value);
      if (val > 0) {
        this.N = val;
      }
    });

    const restartBtn = document.createElement('button');
    restartBtn.id = 'restartRaceBtn';
    restartBtn.textContent = '🔄 Restart';
    restartBtn.className = 'race-panel-btn';
    restartBtn.addEventListener('click', () =>
      this.#initializeRace(this.world),
    );

    label.appendChild(this.carsInput);
    this.racePanel.appendChild(label);
    this.racePanel.appendChild(restartBtn);
    document.body.appendChild(this.racePanel);
  }

  #handleCarsLoaded(carInfos: CarInfo[]): void {
    if (carInfos.length === 0) return;

    // Store full pool (all cars, regardless of different params)
    localStorage.setItem('bestPool', JSON.stringify(carInfos));

    // Restart race with new pool
    this.#initializeRace(this.world);
  }

  #initializeRace(worldInfo: World | null): void {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );

    this.cars = this.generateCars(1, 'KEYS').concat(
      this.generateCars(this.N, 'AI'),
    );
    this.myCar = this.cars[0];

    if (!this.myCar) throw new Error('Player car not created');
    if (this.controls) {
      this.myCar.controls = this.controls;
    }
    this.camera = new Camera(this.myCar);

    const target = this.world.markings.find(
      (m): m is Target => m instanceof Target,
    );
    if (target) {
      this.world.generateCorridor(
        new Point(this.myCar.x, this.myCar.y),
        target.center,
        true,
      );
      if (!this.world.corridor) throw new Error('Corridor generation failed');
      this.roadBorders = this.world.corridor.borders.map(
        (s: Segment): [Point, Point] => [s.p1, s.p2],
      );
    } else {
      this.roadBorders = this.world.roadBorders.map(
        (s: Segment): [Point, Point] => [s.p1, s.p2],
      );
    }

    if (this.world.corridor) {
      const miniMapGraph = new Graph([], this.world.corridor.skeleton);
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        miniMapGraph,
        this.miniMapCanvas.width,
        0.1,
      );
    } else {
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        this.world.graph,
        this.miniMapCanvas.width,
      );
    }
    this.miniMap.cars = this.cars;

    this.statistics.innerHTML = ''; // Clear previous stats
    for (let i = 0; i < this.cars.length; i++) {
      const div = document.createElement('div');
      div.id = 'stat_' + i;
      div.innerText = String(i);
      div.style.color = this.cars[i].color;
      div.classList.add('stat');
      this.statistics.appendChild(div);
    }

    this.started = false;
    if (!this.animating) {
      this.animating = true;
      this.animate();
    }
    this.startCounter();
  }

  updateCarProgress(car: Car): void {
    if (!this.world.corridor) return;

    const carPoint = new Point(car.x, car.y);

    if (!car.finishTime) {
      car.progress = 0;
      const carSegment = getNearestSegment(
        carPoint,
        this.world.corridor.skeleton,
      );
      if (!carSegment) return; // Could not find nearest segment

      for (let i = 0; i < this.world.corridor.skeleton.length; i++) {
        const segment = this.world.corridor.skeleton[i];
        if (segment.equals(carSegment)) {
          const projection = segment.projectPoint(carPoint);
          const firstPartOfSegment = new Segment(segment.p1, projection.point);
          car.progress += firstPartOfSegment.length();
          break;
        } else {
          car.progress += segment.length();
        }
      }
      const totalDistance = this.world.corridor.skeleton.reduce(
        (acc: number, segment: Segment) => acc + segment.length(),
        0,
      );

      if (totalDistance === 0) return; // Avoid division by zero

      car.progress /= totalDistance;
      if (car.progress >= 1) {
        car.progress = 1;
        car.finishTime = this.frameCount;
        if (car === this.myCar) {
          taDaa();
        }
      }
    }
  }

  startCounter(): void {
    if (!this.counter) return;

    this.counter.innerText = '3';
    beep(400);
    setTimeout(() => {
      if (!this.counter) return;
      this.counter.innerText = '2';
      beep(400);
      setTimeout(() => {
        if (!this.counter) return;
        this.counter.innerText = '1';
        beep(400);
        setTimeout(() => {
          if (!this.counter) return;
          this.counter.innerText = 'GO!';
          beep(700);
          setTimeout(() => {
            if (!this.counter) return;
            this.counter.innerText = '';
            this.started = true;
            this.frameCount = 0;
            if (this.myCar) {
              this.myCar.engine = new Engine();
            }
            // Special code part for video camera controls
            if (
              this.controls &&
              typeof CameraControls !== 'undefined' && // Keep runtime check if CameraControls might not exist
              this.controls instanceof CameraControls
            ) {
              this.controls.saveExpectedSize();
            }
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  handleCollisionWithRoadBorders(car: Car): void {
    const bordersToCheck: Segment[] = this.world.corridor
      ? this.world.corridor.skeleton
      : this.world.roadBorders;
    handleCollisionWithRoadBorders(car, bordersToCheck);
  }

  draw(): void {
    if (
      !this.cars ||
      !this.viewport ||
      !this.myCar ||
      !this.camera ||
      !this.miniMap
    )
      return;

    const borderMode = this.topControlsPanel.borderMode;

    if (this.started) {
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        if (car.damaged && borderMode === 'collision') {
          this.handleCollisionWithRoadBorders(car);
        }
        const borders: [Point, Point][] =
          borderMode === 'none' ? [] : (this.roadBorders ?? []);
        car.update(borders);
      }
    }

    // Determine tracking target
    const trackTarget = this.#getTrackTarget();

    this.world.cars = this.cars;
    this.world.bestCar = trackTarget ?? this.myCar;

    if (trackTarget) {
      this.viewport.offset.x = -trackTarget.x;
      this.viewport.offset.y = -trackTarget.y;
    }

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.world.draw(this.gameCtx, viewPoint, false);
    this.miniMap.draw(viewPoint);
    // Rotate the minimap canvas itself to match tracked car orientation
    const rotationTarget = trackTarget ?? this.myCar;
    this.miniMapCanvas.style.transform = `rotate(${rotationTarget.angle}rad)`;

    for (let i = 0; i < this.cars.length; i++) {
      this.updateCarProgress(this.cars[i]);
    }
    // Sort cars based on progress (descending)
    this.cars.sort((a, b) => b.progress! - a.progress!);

    // Update statistics display
    for (let i = 0; i < this.cars.length; i++) {
      const stat = document.getElementById('stat_' + i) as HTMLElement;
      stat.style.color =
        this.cars[i].type === 'AI' ? 'white' : this.cars[i].color;
      stat.innerText = `${i + 1}: ${this.cars[i].name} ${this.cars[i].damaged ? '💀' : ''}`;
      stat.style.backgroundColor =
        this.cars[i].type === 'AI' ? 'black' : 'white';
      if (this.cars[i].finishTime) {
        stat.innerHTML +=
          '<span style="float: right;">' +
          (this.cars[i].finishTime! / 60).toFixed(1) +
          's </span>';
      }
    }

    const cameraTarget = trackTarget ?? this.myCar;
    this.camera.move(cameraTarget);
    this.camera.render(this.cameraCtx, this.world, {
      keyCar: this.myCar,
      traffic: this.cars.filter((c) => c !== cameraTarget),
    });

    if (this.started) {
      this.frameCount++;
    }
  }

  #getTrackTarget(): Car | null {
    switch (this.topControlsPanel.trackingMode) {
      case 'none':
        return null;
      case 'best':
        // Best car by progress (first in sorted order, but sorting happens later in draw)
        // Use live progress: find car with highest progress
        if (this.cars && this.cars.length > 0) {
          return this.cars.reduce((best, car) =>
            (car.progress ?? 0) > (best.progress ?? 0) ? car : best,
          );
        }
        return this.myCar;
      case 'keys':
        return this.myCar;
    }
  }

  animate(): void {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
