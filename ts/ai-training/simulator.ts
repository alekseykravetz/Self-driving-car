class Simulator {
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private networkCanvas: HTMLCanvasElement;
  private networkCtx: CanvasRenderingContext2D;
  private miniMapCanvas: HTMLCanvasElement;

  private world: World | null = null;
  private viewport: Viewport | null = null;
  private miniMap: MiniMap | null = null;

  private cars: Car[] = [];
  private bestCar: Car | null = null;
  private roadBorders: Point[][] | null = null;

  // DOM Elements
  private loadWorldInput!: HTMLInputElement;

  // Loop control
  private animationFrameId: number = -1;

  // Training Manager
  private trainingManager!: TrainingManager;

  constructor(
    gameCanvas: HTMLCanvasElement,
    networkCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d')!;
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d')!;
    this.miniMapCanvas = miniMapCanvas;

    // Load file input listener
    this.loadWorldInput = document.getElementById(
      'loadWorldInput',
    )! as HTMLInputElement;
    this.loadWorldInput.addEventListener(
      'change',
      this.#loadWorldFromFile.bind(this),
    );

    // Create training manager
    this.trainingManager = new TrainingManager({
      getCars: () => this.cars,
      evaluateFitness: (car: Car) => car.fitness,
      onRestart: (bestBrainPool: NeuralNetwork[]) => {
        const settings = this.trainingManager.getSettings();
        this.cars = [
          ...this.generateCars(1, 'KEYS'),
          ...this.generateCars(settings.carCount, 'AI'),
        ];
        this.bestCar = this.cars[0];

        this.trainingManager.applyBrainPool(this.cars, bestBrainPool);

        if (this.world) this.world.cars = this.cars;
        if (this.miniMap) this.miniMap.cars = this.cars;

        this.#updateRoadBorders();

        console.log(
          `Generation ${this.trainingManager.iteration} started with ${settings.carCount} cars.`,
        );
      },
      onPauseToggle: (paused: boolean) => {
        if (paused) {
          cancelAnimationFrame(this.animationFrameId);
        } else {
          this.animationFrameId = requestAnimationFrame(
            this.animate.bind(this),
          );
        }
      },
    });

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo: World | null = worldString
        ? JSON.parse(worldString)
        : null;
      this.#initializeSimulator(worldInfo);
    } else {
      this.#initializeSimulator(world); // note: global world
    }

    // Start animation loop
    this.animate(0);
  }

  generateCars(n: number, type: string): Car[] {
    if (!this.world) {
      console.error('World not initialized in generateCars');
      return [];
    }

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

    const cars: Car[] = [];
    for (let i = 1; i <= n; i++) {
      const color = type === 'AI' ? getRandomColor() : 'blue';
      const car = new Car(
        startPoint.x,
        startPoint.y,
        30, // width
        50, // height
        type,
        startAngle,
        3, // maxSpeed
        color,
      );
      car.name = type === 'AI' ? `AI ${i}` : `Player ${i}`;

      if (typeof carInfo !== 'undefined') {
        car.load(carInfo);
      } else {
        console.warn('carInfo not found for car.load()');
      }
      cars.push(car);
    }
    return cars;
  }

  #initializeSimulator(worldInfo: World | null): void {
    console.log('Initializing simulator with world info:', worldInfo);
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width,
    );

    const settings = this.trainingManager.getSettings();
    this.cars = [
      ...this.generateCars(1, 'KEYS'),
      ...this.generateCars(settings.carCount, 'AI'),
    ];
    this.bestCar = this.cars[0];

    this.trainingManager.updateCarsWithBrain(this.cars);

    this.#updateRoadBorders();
  }

  #updateRoadBorders(): void {
    if (!this.world) return;
    const target = this.world.markings.find(
      (m): m is Target => m instanceof Target,
    );
    if (target && this.bestCar) {
      this.world.generateCorridor(
        new Point(this.bestCar.x, this.bestCar.y),
        target.center,
      );
      this.roadBorders = this.world.corridor
        ? this.world.corridor.borders.map((s: Segment): [Point, Point] => [
            s.p1,
            s.p2,
          ])
        : null;
    } else {
      this.roadBorders = [...this.world.roadBorders.map((s) => [s.p1, s.p2])];
    }
  }

  #loadWorldFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const worldFile = input.files?.[0];

    if (!worldFile) {
      alert('No file selected');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = (event) => this.#onLoadWorldFromFileRead(event);
  }

  #onLoadWorldFromFileRead(e: ProgressEvent<FileReader>): void {
    if (!e.target?.result) {
      alert('Could not read file content');
      return;
    }
    const worldFileContent = e.target.result as string;

    let worldJsonString: string | null = null;
    try {
      const startIndex = worldFileContent.indexOf('(');
      const endIndex = worldFileContent.lastIndexOf(')');
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        worldJsonString = worldFileContent.substring(startIndex + 1, endIndex);
      } else if (
        worldFileContent.trim().startsWith('{') &&
        worldFileContent.trim().endsWith('}')
      ) {
        worldJsonString = worldFileContent.trim();
      }
    } catch (error) {
      console.error('Error processing world file content:', error);
      alert('Error processing world file content. Check console for details.');
      return;
    }

    if (!worldJsonString) {
      alert(
        'Could not extract world data from the file. Ensure it contains a valid JSON object within parentheses or as the main content.',
      );
      return;
    }

    try {
      const worldInfo = JSON.parse(worldJsonString);
      this.#initializeSimulator(worldInfo);
    } catch (error) {
      console.error('Error parsing world JSON:', error);
      alert('Failed to parse world data. Ensure the file contains valid JSON.');
      return;
    }
  }

  private draw(time: number): void {
    if (
      !this.cars.length ||
      !this.world ||
      !this.viewport ||
      !this.miniMap ||
      !this.roadBorders ||
      !this.bestCar
    ) {
      return;
    }

    // Pre-compute midpoints and half-lengths for each border segment (for spatial filtering)
    const PROXIMITY_THRESHOLD = 250; // sensor ray length (150) + car size + buffer
    const borderMidpoints: { mx: number; my: number; halfLen: number }[] = [];
    for (let i = 0; i < this.roadBorders.length; i++) {
      const seg = this.roadBorders[i];
      const mx = (seg[0].x + seg[1].x) * 0.5;
      const my = (seg[0].y + seg[1].y) * 0.5;
      const dx = seg[1].x - seg[0].x;
      const dy = seg[1].y - seg[0].y;
      const halfLen = Math.sqrt(dx * dx + dy * dy) * 0.5;
      borderMidpoints.push({ mx, my, halfLen });
    }

    // Update cars with spatial filtering
    let aliveCount = 0;
    let deadCount = 0;
    let frozenCount = 0;

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (car.damaged) {
        deadCount++;
      } else {
        // Only pass nearby road border segments to the car
        const nearbyBorders: Point[][] = [];
        const threshold = PROXIMITY_THRESHOLD;
        for (let j = 0; j < this.roadBorders.length; j++) {
          const { mx, my, halfLen } = borderMidpoints[j];
          const dist = Math.abs(mx - car.x) + Math.abs(my - car.y);
          if (dist < threshold + halfLen) {
            nearbyBorders.push(this.roadBorders[j]);
          }
        }
        car.update(nearbyBorders);
        aliveCount++;
      }
    }

    // Update fitness distance metric
    const bestFitness = this.bestCar ? Math.round(this.bestCar.fitness) : 0;
    this.trainingManager.updateDistance(bestFitness);

    // Update stats display
    this.trainingManager.updateStatsDisplay(
      aliveCount,
      deadCount,
      frozenCount,
      this.trainingManager.maxDistancePassed,
    );

    // Update best car and best pool
    const res = this.trainingManager.updateBestCarAndPool(this.cars);
    if (res.bestCar) {
      this.bestCar = res.bestCar;
    }
    const bestPool = res.bestPool;

    // Viewport camera centering
    this.viewport.offset.x = -this.bestCar.x;
    this.viewport.offset.y = -this.bestCar.y;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);

    // Draw world without cars (draw them ourselves to show pool rankings)
    this.world.cars = [];
    this.world.bestCar = null;
    this.world.draw(this.gameCtx, viewPoint, false);

    // Draw cars customly inside viewport coordinate space
    const viewportTop = this.bestCar.y - this.gameCanvas.height * 2;
    const viewportBottom = this.bestCar.y + this.gameCanvas.height * 2;
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 300;

    drawSimulatorCars(
      this.gameCtx,
      this.cars,
      bestPool,
      viewportTop,
      viewportBottom,
      drawMasks,
      'gold',
    );

    // Restore references for minimap
    this.world.cars = this.cars;
    this.world.bestCar = this.bestCar;

    this.miniMap.cars = this.cars;
    this.miniMap.draw(viewPoint);

    if (this.trainingManager.showVisualizer) {
      this.networkCanvas.style.display = 'block';
      this.networkCtx.lineDashOffset = -time / 50;
      this.networkCtx.clearRect(
        0,
        0,
        this.networkCanvas.width,
        this.networkCanvas.height,
      );
      if (this.bestCar.brain) {
        Visualizer.drawNetwork(this.networkCtx, this.bestCar.brain);
      }
    } else {
      this.networkCanvas.style.display = 'none';
    }
  }

  private animate(time: number): void {
    this.draw(time);
    if (!this.trainingManager.paused) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }
}
