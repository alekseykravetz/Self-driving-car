'use strict';
class Simulator {
  gameCanvas;
  gameCtx;
  networkCanvas;
  networkCtx;
  miniMapCanvas;
  cameraCanvas;
  cameraCtx;
  mode;
  world = null;
  viewport = null;
  miniMap = null;
  camera = null;
  roadBorders = null;
  // Simple mode: dynamic traffic state
  traffic = [];
  lastGeneratedTrafficY = -700;
  simpleViewY = 0;
  simpleUpdateCycle = 0;
  trafficIdleStart = new Map();
  // Panel elements
  topControlsPanel;
  viewControlsPanel;
  // Layout constants
  CONTROL_PANEL_WIDTH = 200;
  NETWORK_PANEL_WIDTH = 300;
  SMALL_VIEW_WIDTH = 300;
  // Loop control
  animationFrameId = -1;
  // Training Manager
  trainingManager;
  constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d');
    // Get panel element references
    this.topControlsPanel = document.querySelector('top-controls-panel');
    this.viewControlsPanel = document.querySelector('view-controls-panel');
    this.trainingManager = document.querySelector('training-manager-panel');
    // Detect mode from URL parameter
    const params = new URLSearchParams(window.location.search);
    this.mode = params.get('mode') === 'simple' ? 'simple' : 'world';
    if (this.mode === 'simple') {
      this.#initSimpleMode();
    } else {
      this.#initWorldMode();
    }
    // Start animation loop
    this.animate(0);
  }

  #initSimpleMode() {
    // Show only Car loader and Tracking in top controls
    this.topControlsPanel.hideGroups('world', 'borders', 'borders-sep');
    new CarLoader((carInfos) => this.#handleCarsLoaded(carInfos));
    // Disable minimap toggle (no minimap for simple road)
    this.viewControlsPanel.disableMiniMap();
    // Hide camera debug (not supported in simple mode)
    this.viewControlsPanel.hideCameraDebug();
    // Default to camera-big layout for simple simulation
    this.viewControlsPanel.setDefaultLayoutMode('camera-big');
    // Create simple world (fixed road width matching original 200px canvas)
    const SIMPLE_ROAD_WIDTH = 180;
    const simpleWorld = new SimpleWorld(
      this.gameCanvas.width / 2,
      SIMPLE_ROAD_WIDTH,
    );
    this.world = simpleWorld;
    const startInfo = this.#getStartInfo();
    // Initialize camera for 3D view
    this.camera = new Camera(startInfo);
    // Create training manager with distance-based fitness
    this.trainingManager.configure({
      evaluateFitness: (car) => startInfo.y - car.y,
      getStartInfo: () => this.#getStartInfo(),
      onCarsCreated: () => {
        if (this.world) this.world.cars = this.trainingManager.cars;
        this.traffic = generateInitialTraffic(
          (lane) => this.world.getLaneCenter(lane),
          startInfo.angle,
        );
        this.lastGeneratedTrafficY = -700;
        this.simpleUpdateCycle = 0;
        this.trafficIdleStart.clear();
        this.#updateRoadBorders();
        this.#snapCameraToStart();
      },
      onPauseToggle: (paused) => this.#handlePauseToggle(paused),
    });
    // Initialize cars and traffic
    this.trainingManager.initializeCars();
    this.world.cars = this.trainingManager.cars;
    this.traffic = generateInitialTraffic(
      (lane) => simpleWorld.getLaneCenter(lane),
      startInfo.angle,
    );
    this.#updateRoadBorders();
  }

  #initWorldMode() {
    new WorldLoader((worldInfo) => this.#initializeSimulator(worldInfo));
    new CarLoader((carInfos) => this.#handleCarsLoaded(carInfos));
    // Create training manager
    this.trainingManager.configure({
      evaluateFitness: (car) => car.fitness,
      getStartInfo: () => this.#getStartInfo(),
      onCarsCreated: (cars) => {
        if (this.world) this.world.cars = cars;
        if (this.miniMap) this.miniMap.cars = cars;
        this.#updateRoadBorders();
        this.#snapCameraToStart();
      },
      onPauseToggle: (paused) => this.#handlePauseToggle(paused),
    });
    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;
      this.#initializeSimulator(worldInfo);
    } else {
      this.#initializeSimulator(world); // note: global world
    }
  }

  #handleCarsLoaded(carInfos) {
    if (carInfos.length === 0) return;
    const allMatch = CarLoader.allParamsMatch(carInfos);
    let pool;
    if (allMatch) {
      pool = carInfos;
    } else {
      alert(
        'Selected car files have different parameters. Only the first car will be used for training.',
      );
      pool = [carInfos[0]];
    }
    // Apply car settings from the first file
    this.trainingManager.setCarSettings(pool[0]);
    // Store unified pool to localStorage
    localStorage.setItem('bestPool', JSON.stringify(pool));
    // Restart training with the loaded pool
    this.trainingManager.newTraining();
  }

  #getStartInfo() {
    if (!this.world) {
      return { x: 100, y: 100, angle: 0 };
    }
    const startMarkings = this.world.markings.filter((m) => m instanceof Start);
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);
    const startAngle = -angle(direction) + Math.PI / 2;
    return { x: startPoint.x, y: startPoint.y, angle: startAngle };
  }

  #initializeSimulator(worldInfo) {
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

  #updateRoadBorders() {
    if (!this.world) return;
    const bestCar = this.trainingManager.bestCar;
    const target = this.world.markings.find((m) => m instanceof Target);
    if (target && bestCar) {
      this.world.generateCorridor(
        new Point(bestCar.x, bestCar.y),
        target.center,
      );
      this.roadBorders = this.world.corridor
        ? this.world.corridor.borders.map((s) => [s.p1, s.p2])
        : null;
    } else {
      this.roadBorders = [...this.world.roadBorders.map((s) => [s.p1, s.p2])];
    }
  }

  draw(time) {
    if (this.mode === 'simple') {
      this.#drawSimple(time);
    } else {
      this.#drawWorld(time);
    }
  }

  // ── Shared draw helpers ──────────────────────────────
  #resolveTrackTarget() {
    const cars = this.trainingManager.cars;
    const bestCar = this.trainingManager.bestCar || cars[0];
    const trackTarget = this.#getTrackTarget(bestCar);
    return { bestCar, trackTarget };
  }

  #renderCameraView(trackTarget, bestCar, opts) {
    if (!this.viewControlsPanel.showCameraView || !this.camera) return;
    if (trackTarget) {
      this.camera.move(trackTarget);
    }
    const keysCar = this.trainingManager.cars.find((c) => c.type === 'KEYS');
    this.camera.render(this.cameraCtx, this.world, {
      keyCar: keysCar || bestCar,
      bestCar: keysCar ? bestCar : undefined,
      ...opts,
    });
  }

  // ── Simple mode draw ─────────────────────────────────
  #drawSimple(time) {
    const cars = this.trainingManager.cars;
    const { bestCar, trackTarget } = this.#resolveTrackTarget();
    if (!cars.length || !this.world || !this.roadBorders || !bestCar) {
      return;
    }
    if (trackTarget) {
      this.simpleViewY = trackTarget.y;
    }
    const simpleWorld = this.world;
    // Resize canvases responsively
    this.#resizeGameCanvas();
    const viewportTop = this.simpleViewY - this.gameCanvas.height * 0.7;
    const viewportBottom = this.simpleViewY + this.gameCanvas.height * 0.3;
    // --- Dynamic traffic ---
    this.#updateSimpleTraffic(bestCar, simpleWorld);
    // --- Update AI cars ---
    const { aliveCount, deadCount, frozenCount } = this.#updateSimpleCars(
      cars,
      viewportTop,
      viewportBottom,
    );
    // Distance metric
    const startInfo = this.#getStartInfo();
    const currentDist = Math.round(startInfo.y - bestCar.y);
    this.#updateTrainingMetrics(
      currentDist,
      aliveCount,
      deadCount,
      frozenCount,
    );
    // --- Draw Game Canvas ---
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 500;
    this.gameCtx.save();
    this.gameCtx.translate(
      this.gameCanvas.width / 2 - simpleWorld.getCenter(),
      -this.simpleViewY + this.gameCanvas.height * 0.7,
    );
    simpleWorld.draw(this.gameCtx, new Point(0, 0));
    // Draw traffic
    for (let i = 0; i < this.traffic.length; i++) {
      if (
        this.traffic[i].y > viewportTop - 100 &&
        this.traffic[i].y < viewportBottom + 100
      ) {
        this.traffic[i].draw(this.gameCtx);
      }
    }
    drawSimulatorCars(
      this.gameCtx,
      cars,
      this.trainingManager.bestPool,
      viewportTop - 100,
      viewportBottom + 100,
      drawMasks,
      'gold',
      this.trainingManager.prevPoolCars,
    );
    this.gameCtx.restore();
    // --- Network + Camera ---
    this.#drawNetworkVisualizer(time, bestCar);
    this.world.bestCar = bestCar;
    this.#renderCameraView(trackTarget, bestCar, { traffic: this.traffic });
  }

  #updateSimpleTraffic(bestCar, simpleWorld) {
    const TRAFFIC_LOOKAHEAD = 1500;
    const TRAFFIC_ROW_GAP = 200;
    const TRAFFIC_SPEED = 2;
    const startInfo = this.#getStartInfo();
    this.lastGeneratedTrafficY -= TRAFFIC_SPEED;
    while (this.lastGeneratedTrafficY > bestCar.y - TRAFFIC_LOOKAHEAD) {
      this.lastGeneratedTrafficY -= TRAFFIC_ROW_GAP;
      this.traffic.push(
        ...generateTrafficRow(
          this.lastGeneratedTrafficY,
          (lane) => simpleWorld.getLaneCenter(lane),
          simpleWorld.getLaneCount(),
          startInfo.angle,
        ),
      );
    }
    // Cull traffic behind
    // this.traffic = this.traffic.filter((c) => c.y < bestCar.y + 600);
    // Cull traffic far behind start (don't cull based on bestCar to preserve road for stuck cars)
    const startY = startInfo.y;
    this.traffic = this.traffic.filter((c) => c.y < startY + 600);
    // Update traffic
    const trafficBorders = this.roadBorders;
    for (let i = 0; i < this.traffic.length; i++) {
      this.traffic[i].update(trafficBorders);
    }
    // Sort by y for binary-search spatial lookups
    this.traffic.sort((a, b) => a.y - b.y);
  }

  #updateSimpleCars(cars, viewportTop, viewportBottom) {
    const PROXIMITY_THRESHOLD = 400;
    const TRAFFIC_IDLE_CYCLES = 150;
    const idleEnabled = this.trainingManager.idleEnabled;
    let aliveCount = 0;
    let deadCount = 0;
    let frozenCount = 0;
    this.simpleUpdateCycle++;
    // Find the lowest (closest to start) traffic car y
    // Traffic is sorted ascending by y, so the last element has the highest y (closest to start)
    const lowestTrafficY =
      this.traffic.length > 0
        ? this.traffic[this.traffic.length - 1].y
        : -Infinity;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const inRange =
        !idleEnabled ||
        (car.y > viewportTop - 1000 && car.y < viewportBottom + 1000);
      const behindTraffic = idleEnabled && car.y > lowestTrafficY;
      // Track when car first fell behind traffic
      if (behindTraffic) {
        if (!this.trafficIdleStart.has(car)) {
          this.trafficIdleStart.set(car, this.simpleUpdateCycle);
        }
      } else {
        this.trafficIdleStart.delete(car);
      }
      const stuckBehindTraffic =
        behindTraffic &&
        this.simpleUpdateCycle - this.trafficIdleStart.get(car) >=
          TRAFFIC_IDLE_CYCLES;
      if (car.damaged) {
        deadCount++;
      } else if (!inRange || stuckBehindTraffic) {
        frozenCount++;
      } else {
        const nearbyPolygons = [...this.roadBorders];
        const minY = car.y - PROXIMITY_THRESHOLD;
        const maxY = car.y + PROXIMITY_THRESHOLD;
        // Binary search for first traffic car with y >= minY
        let lo = 0;
        let hi = this.traffic.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (this.traffic[mid].y < minY) lo = mid + 1;
          else hi = mid;
        }
        for (
          let j = lo;
          j < this.traffic.length && this.traffic[j].y <= maxY;
          j++
        ) {
          nearbyPolygons.push(this.traffic[j].polygon);
        }
        car.update(nearbyPolygons);
        aliveCount++;
      }
    }
    return { aliveCount, deadCount, frozenCount };
  }

  // ── World mode draw ──────────────────────────────────
  #drawWorld(time) {
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
    // --- Update AI cars ---
    const { aliveCount, deadCount, frozenCount } = this.#updateWorldCars(cars);
    // Update fitness distance metric
    const bestFitness = bestCar ? Math.round(bestCar.fitness) : 0;
    this.#updateTrainingMetrics(
      bestFitness,
      aliveCount,
      deadCount,
      frozenCount,
    );
    // Re-read after update (bestCar may have changed)
    const currentBestCar = this.trainingManager.bestCar || bestCar;
    // Resize game canvas responsively based on visible panels (before viewport reset)
    this.#resizeGameCanvas();
    // Viewport camera centering based on tracking mode
    const trackTarget = this.#getTrackTarget(currentBestCar);
    if (trackTarget) {
      this.viewport.offset.x = -trackTarget.x;
      this.viewport.offset.y = -trackTarget.y;
    }
    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    // Draw world without cars (draw them ourselves to show pool rankings)
    this.world.cars = [];
    this.world.bestCar = null;
    this.world.draw(this.gameCtx, viewPoint, false);
    // Draw cars inside viewport coordinate space
    const viewportTop = currentBestCar.y - this.gameCanvas.height * 2;
    const viewportBottom = currentBestCar.y + this.gameCanvas.height * 2;
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 500;
    drawSimulatorCars(
      this.gameCtx,
      cars,
      this.trainingManager.bestPool,
      viewportTop,
      viewportBottom,
      drawMasks,
      'gold',
      this.trainingManager.prevPoolCars,
    );
    // Restore references for minimap
    this.world.cars = cars;
    this.world.bestCar = currentBestCar;
    this.miniMap.cars = cars;
    this.miniMap.draw(viewPoint);
    // --- Network + Camera ---
    this.#drawNetworkVisualizer(time, currentBestCar);
    const debugCtx = this.viewControlsPanel.showCameraDebug
      ? this.gameCtx
      : undefined;
    this.#renderCameraView(trackTarget, currentBestCar, { debugCtx });
  }

  #updateWorldCars(cars) {
    // Pre-compute midpoints and half-lengths for each border segment (for spatial filtering)
    const PROXIMITY_THRESHOLD = 400;
    const borderMidpoints = [];
    for (let i = 0; i < this.roadBorders.length; i++) {
      const seg = this.roadBorders[i];
      const mx = (seg[0].x + seg[1].x) * 0.5;
      const my = (seg[0].y + seg[1].y) * 0.5;
      const dx = seg[1].x - seg[0].x;
      const dy = seg[1].y - seg[0].y;
      const halfLen = Math.sqrt(dx * dx + dy * dy) * 0.5;
      borderMidpoints.push({ mx, my, halfLen });
    }
    let aliveCount = 0;
    let deadCount = 0;
    let frozenCount = 0;
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      if (car.damaged && this.topControlsPanel.borderMode !== 'collision') {
        deadCount++;
      } else {
        if (car.damaged && this.topControlsPanel.borderMode === 'collision') {
          const bordersToCheck = this.world.corridor
            ? this.world.corridor.skeleton
            : this.world.roadBorders;
          handleCollisionWithRoadBorders(car, bordersToCheck);
        }
        // Only pass nearby road border segments to the car
        const bordersForUpdate =
          this.topControlsPanel.borderMode === 'none' ? [] : [];
        if (this.topControlsPanel.borderMode !== 'none') {
          const threshold = PROXIMITY_THRESHOLD;
          for (let j = 0; j < this.roadBorders.length; j++) {
            const { mx, my, halfLen } = borderMidpoints[j];
            const dist = Math.abs(mx - car.x) + Math.abs(my - car.y);
            if (dist < threshold + halfLen) {
              bordersForUpdate.push(this.roadBorders[j]);
            }
          }
        }
        car.update(bordersForUpdate);
        aliveCount++;
      }
    }
    return { aliveCount, deadCount, frozenCount };
  }

  // ── Layout & Resize ──────────────────────────────────
  #resizeGameCanvas() {
    const showCamera = this.viewControlsPanel.showCameraView;
    const showNetwork = this.viewControlsPanel.showVisualizer;
    const showMiniMap = this.viewControlsPanel.showMiniMap;
    // Calculate used width by fixed panels
    let usedWidth = this.CONTROL_PANEL_WIDTH;
    // Network + minimap panel
    const networkPanelWidth =
      showNetwork || showMiniMap ? this.NETWORK_PANEL_WIDTH : 0;
    usedWidth += networkPanelWidth;
    // Right panel element visibility
    const rightPanel = document.getElementById('rightPanel');
    if (rightPanel) {
      rightPanel.style.display = showNetwork || showMiniMap ? 'flex' : 'none';
    }
    // Network canvas
    if (showNetwork) {
      this.networkCanvas.style.display = 'block';
      this.networkCanvas.width = this.NETWORK_PANEL_WIDTH;
      this.networkCanvas.height = showMiniMap
        ? window.innerHeight - this.NETWORK_PANEL_WIDTH
        : window.innerHeight;
    } else {
      this.networkCanvas.style.display = 'none';
    }
    // Mini map canvas
    if (showMiniMap) {
      this.miniMapCanvas.style.display = 'block';
      this.miniMapCanvas.width = this.NETWORK_PANEL_WIDTH;
      this.miniMapCanvas.height = this.NETWORK_PANEL_WIDTH;
    } else {
      this.miniMapCanvas.style.display = 'none';
    }
    // Layout mode: compute main and secondary view widths
    const availableWidth = window.innerWidth - usedWidth;
    const layoutMode = this.viewControlsPanel.layoutMode;
    if (showCamera) {
      const secondaryWidth = this.SMALL_VIEW_WIDTH;
      const mainWidth = availableWidth - secondaryWidth;
      const topViewBig = layoutMode === 'topview-big';
      this.gameCanvas.width = topViewBig ? mainWidth : secondaryWidth;
      this.gameCanvas.height = window.innerHeight;
      this.cameraCanvas.width = topViewBig ? secondaryWidth : mainWidth;
      this.cameraCanvas.height = window.innerHeight;
      this.cameraCanvas.style.display = 'block';
      this.gameCanvas.style.order = topViewBig ? '0' : '1';
      this.cameraCanvas.style.order = topViewBig ? '1' : '0';
    } else {
      // No camera view - game canvas takes all available space
      this.gameCanvas.width = availableWidth;
      this.gameCanvas.height = window.innerHeight;
      this.cameraCanvas.style.display = 'none';
      this.gameCanvas.style.order = '0';
    }
    if (this.viewport) {
      this.viewport.center = new Point(
        this.gameCanvas.width / 2,
        window.innerHeight / 2,
      );
    }
  }

  // ── Utilities ────────────────────────────────────────
  #getTrackTarget(bestCar) {
    switch (this.topControlsPanel.trackingMode) {
      case 'none':
        return null;
      case 'best':
        return bestCar;
      case 'keys': {
        const keysCar = this.trainingManager.cars.find(
          (c) => c.type === 'KEYS',
        );
        return keysCar || bestCar;
      }
    }
  }

  #handlePauseToggle(paused) {
    if (paused) {
      cancelAnimationFrame(this.animationFrameId);
    } else {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }

  #snapCameraToStart() {
    if (this.camera) {
      this.camera.simpleMove(this.#getStartInfo());
    }
  }

  #updateTrainingMetrics(distance, aliveCount, deadCount, frozenCount) {
    this.trainingManager.updateDistance(distance);
    this.trainingManager.updateStatsDisplay(
      aliveCount,
      deadCount,
      frozenCount,
      this.trainingManager.maxDistancePassed,
    );
    this.trainingManager.updateBestCarAndPool();
  }

  #drawNetworkVisualizer(time, bestCar) {
    if (!this.viewControlsPanel.showVisualizer) return;
    this.networkCtx.lineDashOffset = -time / 50;
    this.networkCtx.clearRect(
      0,
      0,
      this.networkCanvas.width,
      this.networkCanvas.height,
    );
    if (bestCar.brain) {
      Visualizer.drawNetwork(this.networkCtx, bestCar.brain);
    }
  }

  animate(time) {
    this.draw(time);
    if (!this.trainingManager.paused) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }
}
