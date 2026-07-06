'use strict';
class TrainingSimulator extends SimulatorShell {
  mode;
  world = null;
  roadBorders = null;
  borderGrid = new SpatialHashGrid(150);
  // Simple mode state
  simpleState = new SimpleSimState();
  // Training Manager
  trainingManager;
  // Training-init modal (brain source + settings before training starts).
  initModal = null;
  constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host) {
    super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);
    this.trainingManager = document.querySelector('training-panel');
    this.initModal = document.querySelector('training-init-modal');
    // Detect mode from URL parameter
    const params = new URLSearchParams(window.location.search);
    this.mode = params.get('mode') === 'simple' ? 'simple' : 'world';
    if (this.mode === 'simple') {
      this.#initSimpleMode();
    } else {
      this.#initWorldMode();
    }
    // Route the "New Training" button through the init modal.
    this.trainingManager.setNewTrainingHandler(() =>
      this.#openInitModal('new'),
    );
    // A single left-click on either view (top-down or 3D, big or small)
    // toggles play/pause. Panning uses the middle mouse button, so left-click
    // is free for this.
    this.#initPauseToggleClicks();
    // Populate the shared shortcuts toolbar (informational only — the driving
    // keys are handled by Controls in KEYS tracking mode).
    this.#initShortcutsToolbar();
    // Start animation loop
    this.animate(0);
  }

  /** Fill the shared <shortcuts-toolbar> with the driving keys + zoom modifier. */
  #initShortcutsToolbar() {
    const toolbar = document.querySelector('shortcuts-toolbar');
    toolbar?.setShortcuts([
      {
        id: 'keyUp',
        label: '↑ / W',
        title: 'Arrow Up / W — Accelerate (drive the 🎮 user car)',
        group: 'Drive',
        kind: 'momentary',
        display: true,
        keys: ['ArrowUp', 'w'],
      },
      {
        id: 'keyDown',
        label: '↓ / S',
        title: 'Arrow Down / S — Brake / reverse',
        group: 'Drive',
        kind: 'momentary',
        display: true,
        keys: ['ArrowDown', 's'],
      },
      {
        id: 'keyLeft',
        label: '← / A',
        title: 'Arrow Left / A — Steer left',
        group: 'Drive',
        kind: 'momentary',
        display: true,
        keys: ['ArrowLeft', 'a'],
      },
      {
        id: 'keyRight',
        label: '→ / D',
        title: 'Arrow Right / D — Steer right',
        group: 'Drive',
        kind: 'momentary',
        display: true,
        keys: ['ArrowRight', 'd'],
      },
      {
        id: 'keyCtrl',
        label: 'Ctrl',
        title: 'Ctrl + scroll wheel — Zoom in/out (touchpad mode)',
        group: 'View',
        kind: 'momentary',
        display: true,
        keys: ['Control'],
      },
    ]);
  }

  /** Toggle play/pause when the user left-clicks the top-down or 3D view. */
  #initPauseToggleClicks() {
    const toggle = (e) => {
      if (e.button !== 0) return;
      this.animationLoopToolbar.togglePause();
    };
    this.gameCanvas.addEventListener('click', toggle);
    this.cameraCanvas.addEventListener('click', toggle);
  }

  #initSimpleMode() {
    // Show only Car loader and Tracking in top controls
    this.toolbarPanel.hideGroups('world', 'borders', 'borders-sep');
    this.toolbarPanel.configureSelectors({ carMode: 'multi' });
    // Hide camera debug (not supported in simple mode)
    this.toolbarPanel.hideCameraDebug();
    // Default to camera-big layout for simple simulation
    this.layoutToolbar.setDefaultLayoutMode('camera-big');
    // Create simple world (fixed road width matching original 200px canvas)
    const SIMPLE_ROAD_WIDTH = 180;
    const simpleWorld = new SimpleWorld(
      this.gameCanvas.width / 2,
      SIMPLE_ROAD_WIDTH,
    );
    this.world = simpleWorld;
    // Create viewport for pan/zoom support (centered on road)
    this.viewport = new Viewport(
      this.gameCanvas,
      1,
      new Point(-simpleWorld.getCenter(), -100),
    );
    this.viewport.setMode(this.toolbarPanel.viewportMode);
    // Mini-map of the straight road (shows the lane line + car positions), so
    // simple mode matches the world/traffic simulators.
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      simpleWorld.graph,
      this.miniMapCanvas.width,
    );
    const startInfo = this.#getStartInfo();
    // Initialize camera for 3D view
    this.camera = new Camera(startInfo);
    // Create training manager with distance-based fitness
    this.trainingManager.configure({
      evaluateFitness: (car) => startInfo.y - car.y,
      getStartInfo: () => this.#getStartInfo(),
      onCarsCreated: () => {
        this.simpleState.traffic = generateInitialTraffic(
          (lane) => this.world.getLaneCenter(lane),
          startInfo.angle,
        );
        this.simpleState.lastGeneratedTrafficY = -700;
        this.#updateRoadBorders();
        this.#snapCameraToStart();
        this.animationLoopToolbar.setPaused(false);
      },
    });
    // Generate initial traffic, then ask the user how to start training.
    this.simpleState.traffic = generateInitialTraffic(
      (lane) => simpleWorld.getLaneCenter(lane),
      startInfo.angle,
    );
    this.#updateRoadBorders();
    this.#openInitModal('entry');
  }

  #initWorldMode() {
    this.toolbarPanel.configureSelectors({
      carMode: 'multi',
      onWorldSelected: (entry) =>
        this.#initializeSimulator(entry?.data ?? null),
    });
    // Create training manager
    this.trainingManager.configure({
      evaluateFitness: (car) => car.fitness,
      getStartInfo: () => this.#getStartInfo(),
      onCarsCreated: () => {
        this.#updateRoadBorders();
        this.#snapCameraToStart();
        this.animationLoopToolbar.setPaused(false);
      },
    });
    const storeWorld =
      StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
    this.#initializeSimulator(storeWorld ?? null, false);
    this.#openInitModal('entry');
  }

  /** Open the training-init modal, then apply the chosen brain source + config. */
  #openInitModal(context) {
    const settings = this.trainingManager.getSettings();
    const defaults = {
      carCount: settings.carCount,
      poolSize: settings.poolSize,
      mutationRate: settings.mutationRate,
      idleRange: settings.idleRange,
      carConfig: this.trainingManager.getCarSettings(),
    };
    if (!this.initModal) {
      // No modal in the DOM — fall back to the previous behavior.
      if (context === 'new') this.trainingManager.newTraining();
      else this.trainingManager.initializeCars();
      return;
    }
    this.initModal.open({
      context,
      defaults,
      onStart: (result) => this.#applyInitConfig(result),
      onCancel: () => {
        if (context === 'entry') this.trainingManager.initializeCars();
      },
    });
  }

  /** Apply the modal's chosen settings + brain source, then (re)start training. */
  #applyInitConfig(result) {
    this.trainingManager.setTrainingParams({
      carCount: result.carCount,
      poolSize: result.poolSize,
      mutationRate: result.mutationRate,
      idleRange: result.idleRange,
    });
    this.trainingManager.setCarSettings(result.carConfig);
    switch (result.brainSource) {
      case 'fresh':
        discardStoredPool();
        break;
      case 'pool':
        // Keep the stored pool as-is.
        break;
      case 'selected': {
        const active = StoreManager.getActiveCars();
        const pool = CarLoader.allParamsMatch(active)
          ? active
          : active.slice(0, 1);
        savePoolToStorage(pool);
        break;
      }
    }
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

  #initializeSimulator(worldInfo, startTraining = true) {
    console.log('Initializing simulator with world info:', worldInfo);
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );
    this.viewport.setMode(this.toolbarPanel.viewportMode);
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width,
    );
    if (startTraining) {
      this.trainingManager.initializeCars();
    }
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
      const corridor = this.world.corridors[0] ?? null;
      this.roadBorders = corridor
        ? corridor.borders.map((s) => [s.p1, s.p2])
        : null;
    } else {
      this.roadBorders = [
        ...this.world.roadBorders,
        ...this.world.separatorBorders,
        ...this.world.corridors.flatMap((c) => c.borders),
      ].map((s) => [s.p1, s.p2]);
    }
    // Rebuild the spatial index so per-car border lookups stay O(1)-ish even
    // with city-scale maps and large populations.
    this.borderGrid.build(this.roadBorders ?? []);
  }

  update() {
    if (this.mode === 'simple') {
      this.#updateSimple();
    } else {
      this.#updateWorld();
    }
  }

  draw(time) {
    if (this.mode === 'simple') {
      this.#drawSimple(time);
    } else {
      this.#drawWorld(time);
    }
  }

  onPausedRender() {
    // While paused the world is frozen but the canvas still redraws.
    // Refresh pool UI so indicator dots and the pool table react to
    // settings changes (pool count, save/discard) in real time.
    this.trainingManager.updateBestCarAndPool();
  }

  // ── Shared draw helpers ──────────────────────────────
  #resolveTrackTarget() {
    const cars = this.trainingManager.cars;
    const bestCar = this.trainingManager.bestCar || cars[0];
    const trackTarget = this.#getTrackTarget(bestCar);
    return { bestCar, trackTarget };
  }

  #renderCameraView(bestCar, opts) {
    if (!this.layoutToolbar.showCameraView || !this.camera) return;
    const keysCar = this.trainingManager.cars.find((c) => c.type === 'KEYS');
    this.camera.render(this.cameraCtx, this.world, {
      keyCar: keysCar || bestCar,
      bestCar: keysCar ? bestCar : undefined,
      cars: this.trainingManager.cars,
      showTrees: this.worldLayers.trees,
      showBuildings: this.worldLayers.buildings,
      ...opts,
    });
  }

  // ── Simple mode update & draw ────────────────────────
  #updateSimple() {
    const cars = this.trainingManager.cars;
    const { bestCar, trackTarget } = this.#resolveTrackTarget();
    if (
      !cars.length ||
      !this.world ||
      !this.viewport ||
      !this.roadBorders ||
      !bestCar
    ) {
      return;
    }
    const simpleWorld = this.world;
    // Dynamic traffic
    updateSimpleTraffic(
      this.simpleState,
      bestCar,
      simpleWorld,
      this.roadBorders,
      this.#getStartInfo(),
    );
    // Update AI cars
    const { idleRange } = this.trainingManager.getSettings();
    const { aliveCount, deadCount, frozenCount } = updateSimpleCars(
      cars,
      this.simpleState,
      this.roadBorders,
      this.trainingManager.idleEnabled,
      bestCar,
      idleRange,
      this.borderGrid,
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
    // Viewport tracking (drives simpleViewY used by draw-phase culling)
    if (trackTarget) {
      this.viewport.offset.x = -simpleWorld.getCenter();
      this.viewport.offset.y = -trackTarget.y;
    }
    const totalOffset = this.viewport.getOffset();
    this.simpleState.simpleViewY = -totalOffset.y;
    // Camera tracking
    if (trackTarget && this.camera) {
      this.camera.move(trackTarget);
    }
  }

  #drawSimple(time) {
    const cars = this.trainingManager.cars;
    const bestCar = this.trainingManager.bestCar;
    if (
      !cars.length ||
      !this.world ||
      !this.viewport ||
      !this.roadBorders ||
      !bestCar
    ) {
      return;
    }
    const simpleWorld = this.world;
    // Resize canvases responsively
    this.resizeLayout();
    const viewportTop =
      this.simpleState.simpleViewY -
      this.gameCanvas.height * 0.5 * this.viewport.zoom;
    const viewportBottom =
      this.simpleState.simpleViewY +
      this.gameCanvas.height * 0.5 * this.viewport.zoom;
    // Masks are cached, pre-composited sprites (one drawImage per car), so they
    // stay cheap even with very large populations.
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 5000;
    this.viewport.reset();
    simpleWorld.draw(this.gameCtx, { viewPoint: new Point(0, 0) });
    this.viewport.drawScaleIndicator(this.gameCtx);
    // Draw traffic
    for (let i = 0; i < this.simpleState.traffic.length; i++) {
      if (
        this.simpleState.traffic[i].y > viewportTop - 100 &&
        this.simpleState.traffic[i].y < viewportBottom + 100
      ) {
        this.simpleState.traffic[i].draw(this.gameCtx, {});
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
    this.drawNetworkVisualizer(time, bestCar.brain);
    // Mini-map of the straight road (matches the world/traffic simulators).
    if (this.miniMap) {
      const viewPoint = scale(this.viewport.getOffset(), -1);
      const floatingMiniMap =
        this.layoutToolbar.showMiniMap && !this.layoutToolbar.showVisualizer;
      this.miniMap.draw(
        floatingMiniMap
          ? {
              viewPoint,
              cars,
              roadColor: '#BBB',
              carColor: 'red',
              backgroundColor: '#2a5',
            }
          : { viewPoint, cars },
      );
    }
    this.#renderCameraView(bestCar, { traffic: this.simpleState.traffic });
  }

  // ── World mode update & draw ─────────────────────────
  #updateWorld() {
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
    const corridor = this.world.corridors[0] ?? null;
    const collisionBorders = corridor
      ? corridor.skeleton
      : [...this.world.roadBorders, ...this.world.separatorBorders];
    const { idleRange } = this.trainingManager.getSettings();
    const { aliveCount, deadCount, frozenCount } = updateWorldCars(
      cars,
      this.borderGrid,
      this.toolbarPanel.borderMode,
      collisionBorders,
      bestCar,
      this.trainingManager.idleEnabled,
      idleRange,
    );
    const bestFitness = Math.round(bestCar.fitness);
    this.#updateTrainingMetrics(
      bestFitness,
      aliveCount,
      deadCount,
      frozenCount,
    );
    // Re-read after updateBestCarAndPool (called inside #updateTrainingMetrics)
    const currentBestCar = this.trainingManager.bestCar || bestCar;
    const trackTarget = this.#getTrackTarget(currentBestCar);
    // Viewport tracking
    if (trackTarget) {
      this.viewport.offset.x = -trackTarget.x;
      this.viewport.offset.y = -trackTarget.y;
    }
    // Camera tracking
    if (trackTarget && this.camera) {
      this.camera.move(trackTarget);
    }
  }

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
    // Resize game canvas responsively (before viewport reset)
    this.resizeLayout();
    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    // Draw world without cars (we draw them ourselves to show pool rankings)
    this.world.draw(this.gameCtx, {
      viewPoint,
      showStartMarkings: false,
      layers: this.worldLayers,
    });
    this.viewport.drawScaleIndicator(this.gameCtx);
    // Masks are cached, pre-composited sprites (one drawImage per car), so they
    // stay cheap even with very large populations.
    const viewportTop = bestCar.y - this.gameCanvas.height * 2;
    const viewportBottom = bestCar.y + this.gameCanvas.height * 2;
    const viewportLeft = bestCar.x - this.gameCanvas.width * 2;
    const viewportRight = bestCar.x + this.gameCanvas.width * 2;
    const settings = this.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 5000;
    drawSimulatorCars(
      this.gameCtx,
      cars,
      this.trainingManager.bestPool,
      viewportTop,
      viewportBottom,
      drawMasks,
      'gold',
      this.trainingManager.prevPoolCars,
      'deepskyblue',
      viewportLeft,
      viewportRight,
    );
    // When the network visualizer is hidden the mini-map floats over the green
    // game canvas, so it mirrors the world editor's palette (grey roads). Next
    // to the network panel it sits on a black backdrop and uses white roads.
    const floatingMiniMap =
      this.layoutToolbar.showMiniMap && !this.layoutToolbar.showVisualizer;
    this.miniMap.draw(
      floatingMiniMap
        ? {
            viewPoint,
            cars,
            roadColor: '#BBB',
            carColor: 'red',
            backgroundColor: '#2a5',
          }
        : { viewPoint, cars },
    );
    this.drawNetworkVisualizer(time, bestCar.brain);
    const debugCtx = this.toolbarPanel.showCameraDebug
      ? this.gameCtx
      : undefined;
    this.#renderCameraView(bestCar, { debugCtx });
  }

  // ── Utilities ────────────────────────────────────────
  #getTrackTarget(bestCar) {
    switch (this.toolbarPanel.trackingMode) {
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

  #snapCameraToStart() {
    if (this.camera) {
      this.camera.simpleMove(this.#getStartInfo());
    }
  }

  #updateTrainingMetrics(distance, aliveCount, deadCount, frozenCount) {
    this.trainingManager.updateDistance(distance);
    // Update bestCar first so the current-frame speed is available below.
    this.trainingManager.updateBestCarAndPool();
    this.trainingManager.updateStatsDisplay(
      aliveCount,
      deadCount,
      frozenCount,
      this.trainingManager.maxDistancePassed,
      this.trainingManager.bestCar?.speed ?? 0,
    );
  }
}
