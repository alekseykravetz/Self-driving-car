class Simulator {
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private networkCanvas: HTMLCanvasElement;
  private networkCtx: CanvasRenderingContext2D;
  private miniMapCanvas: HTMLCanvasElement;
  private cameraCanvas: HTMLCanvasElement;
  private cameraCtx: CanvasRenderingContext2D;

  private world: World | null = null;
  private viewport: Viewport | null = null;
  private miniMap: MiniMap | null = null;
  private camera: Camera | null = null;

  private roadBorders: Point[][] | null = null;

  // Layout constants
  private readonly BUTTONS_PANEL_WIDTH = 200;
  private readonly RIGHT_PANEL_WIDTH = 300;
  private readonly CAMERA_VIEW_WIDTH = 400;

  // Loop control
  private animationFrameId: number = -1;

  // Training Manager
  private trainingManager!: TrainingManager;

  constructor(
    gameCanvas: HTMLCanvasElement,
    networkCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d')!;
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d')!;
    this.miniMapCanvas = miniMapCanvas;
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d')!;

    new WorldLoader((worldInfo) =>
      this.#initializeSimulator(worldInfo as World),
    );

    // Create training manager
    this.trainingManager = new TrainingManager({
      evaluateFitness: (car: Car) => car.fitness,
      getStartInfo: () => this.#getStartInfo(),
      onCarsCreated: (cars: Car[]) => {
        if (this.world) this.world.cars = cars;
        if (this.miniMap) this.miniMap.cars = cars;
        this.#updateRoadBorders();
        // Snap camera to new best car position to avoid rendering crash
        if (this.camera) {
          const startInfo = this.#getStartInfo();
          this.camera.simpleMove(startInfo);
        }
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

  #getStartInfo(): { x: number; y: number; angle: number } {
    if (!this.world) {
      return { x: 100, y: 100, angle: 0 };
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

    return { x: startPoint.x, y: startPoint.y, angle: startAngle };
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

    this.trainingManager.initializeCars();

    if (this.world) this.world.cars = this.trainingManager.cars;
    if (this.miniMap) this.miniMap.cars = this.trainingManager.cars;

    // Initialize camera for 3D view
    const startInfo = this.#getStartInfo();
    this.camera = new Camera(startInfo);

    this.#updateRoadBorders();
  }

  #updateRoadBorders(): void {
    if (!this.world) return;
    const bestCar = this.trainingManager.bestCar;
    const target = this.world.markings.find(
      (m): m is Target => m instanceof Target,
    );
    if (target && bestCar) {
      this.world.generateCorridor(
        new Point(bestCar.x, bestCar.y),
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

  private draw(time: number): void {
    const cars = this.trainingManager.cars;
    const bestCar = this.trainingManager.bestCar;

    if (
      !cars.length ||
      !this.world ||
      !this.viewport ||
      !this.miniMap ||
      !this.roadBorders ||
      !bestCar
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

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
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
    const bestFitness = bestCar ? Math.round(bestCar.fitness) : 0;
    this.trainingManager.updateDistance(bestFitness);

    // Update stats display
    this.trainingManager.updateStatsDisplay(
      aliveCount,
      deadCount,
      frozenCount,
      this.trainingManager.maxDistancePassed,
    );

    // Update best car and best pool
    this.trainingManager.updateBestCarAndPool();

    // Re-read after update (bestCar may have changed)
    const currentBestCar = this.trainingManager.bestCar || bestCar;

    const showVisualizer = this.trainingManager.showVisualizer;
    const showCameraView = this.trainingManager.showCameraView && this.camera;

    // Resize game canvas responsively based on visible panels (before viewport reset)
    this.#resizeGameCanvas(!!showCameraView, showVisualizer);

    // Viewport camera centering
    this.viewport.offset.x = -currentBestCar.x;
    this.viewport.offset.y = -currentBestCar.y;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);

    // Draw world without cars (draw them ourselves to show pool rankings)
    this.world.cars = [];
    this.world.bestCar = null;
    this.world.draw(this.gameCtx, viewPoint, false);

    // Draw cars customly inside viewport coordinate space
    const viewportTop = currentBestCar.y - this.gameCanvas.height * 2;
    const viewportBottom = currentBestCar.y + this.gameCanvas.height * 2;
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 300;

    drawSimulatorCars(
      this.gameCtx,
      cars,
      this.trainingManager.bestPool,
      viewportTop,
      viewportBottom,
      drawMasks,
      'gold',
    );

    // Restore references for minimap
    this.world.cars = cars;
    this.world.bestCar = currentBestCar;

    this.miniMap.cars = cars;
    this.miniMap.draw(viewPoint);

    if (showVisualizer) {
      this.networkCanvas.style.display = 'block';
      this.networkCtx.lineDashOffset = -time / 50;
      this.networkCtx.clearRect(
        0,
        0,
        this.networkCanvas.width,
        this.networkCanvas.height,
      );
      if (currentBestCar.brain) {
        Visualizer.drawNetwork(this.networkCtx, currentBestCar.brain);
      }
    } else {
      this.networkCanvas.style.display = 'none';
    }

    // 3D Camera perspective view
    if (showCameraView) {
      this.cameraCanvas.style.display = 'block';
      this.camera!.move(currentBestCar);
      this.camera!.render(this.cameraCtx, this.world, this.gameCtx);
    } else {
      this.cameraCanvas.style.display = 'none';
    }
  }

  #resizeGameCanvas(showCamera: boolean, showNetwork: boolean): void {
    const rightWidth = showNetwork ? this.RIGHT_PANEL_WIDTH : 0;
    const cameraWidth = showCamera ? this.CAMERA_VIEW_WIDTH : 0;
    const newWidth =
      window.innerWidth - this.BUTTONS_PANEL_WIDTH - rightWidth - cameraWidth;
    if (this.gameCanvas.width !== newWidth) {
      this.gameCanvas.width = newWidth;
      this.gameCanvas.height = window.innerHeight;
      if (this.viewport) {
        this.viewport.center = new Point(newWidth / 2, window.innerHeight / 2);
      }
    }
  }

  private animate(time: number): void {
    this.draw(time);
    if (!this.trainingManager.paused) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }
}
