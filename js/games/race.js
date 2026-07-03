'use strict';
class Race {
  gameCanvas;
  gameCtx;
  cameraCanvas;
  cameraCtx;
  miniMapCanvas;
  controls;
  toolbarPanel;
  racePanel;
  world;
  camera = null;
  viewport = null;
  miniMap = null;
  cars = null;
  myCar = null;
  roadBorders = null;
  frameCount = 0;
  started = false;
  animating = false;
  statistics;
  counter;
  constructor(gameCanvas, cameraCanvas, miniMapCanvas, controls = null) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    this.controls = controls;
    this.#addEventListeners();
    const storeWorld =
      StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
    const worldInfo = storeWorld ?? null;
    this.#initializeRace(worldInfo);
    if (this.controls && this.myCar) {
      this.myCar.controls = this.controls;
    }
    // In phone-controls mode the toolbar is hidden, so default the camera to
    // follow the player's car instead of the best AI.
    if (
      typeof PhoneControls !== 'undefined' &&
      this.controls instanceof PhoneControls
    ) {
      this.toolbarPanel.setTrackingMode('keys');
    }
  }

  generateCars() {
    const startMarkings = this.world.markings.filter((m) => m instanceof Start);
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);
    const startAngle = -angle(direction) + Math.PI / 2;
    // Two independent AI car sources (all applied as-is, no mutation):
    //  1. training results pool (read-only)
    //  2. cars selected in the world panel (store or loaded; multiple or none)
    const pool = loadPoolFromStorage();
    const selected = StoreManager.getActiveCars();
    const aiSources = [...pool, ...selected];
    // Player car physical params come from the first available source
    // (brain is intentionally not applied — the player drives manually).
    const keyParams = pool[0] ?? selected[0] ?? null;
    const cars = [];
    // Create player car from saved params (if available), but without the AI brain
    const keyCarInfo = keyParams ? { ...keyParams, brain: undefined } : null;
    const keyCar = Car.fromInfo(
      {
        x: startPoint.x,
        y: startPoint.y,
        controlType: 'KEYS',
        angle: startAngle,
        color: 'blue',
      },
      keyCarInfo,
    );
    keyCar.name = 'Player';
    cars.push(keyCar);
    let i = 1;
    for (const info of aiSources) {
      const car = Car.fromInfo(
        {
          x: startPoint.x,
          y: startPoint.y,
          controlType: 'AI',
          angle: startAngle,
          color: getRandomColor(),
        },
        info,
      );
      car.name = 'AI ' + i;
      cars.push(car);
      i++;
    }
    return cars;
  }

  #addEventListeners() {
    this.toolbarPanel = document.querySelector('world-toolbar');
    // Keep the active viewport's wheel behavior in sync with the toolbar toggle
    this.toolbarPanel.setViewportModeListener((mode) =>
      this.viewport?.setMode(mode),
    );
    // World + car selectors. Loading a file adds it to the library without
    // applying it; the user picks a world to race and the car(s) to add.
    this.toolbarPanel.configureSelectors({
      carMode: 'multi',
      onWorldSelected: (entry) => this.#initializeRace(entry?.data ?? null),
    });
    // Camera debug overlay is not implemented in the race game.
    this.toolbarPanel.hideCameraDebug();
    this.statistics = document.getElementById('statistics');
    this.counter = document.getElementById('counter');
    this.#createRacePanel();
  }

  #createRacePanel() {
    this.racePanel = document.createElement('div');
    this.racePanel.id = 'racePanel';
    const group = document.createElement('div');
    group.className = 'controls-group';
    const label = document.createElement('span');
    label.className = 'controls-group-label';
    label.textContent = 'Race';
    const restartBtn = document.createElement('button');
    restartBtn.id = 'restartRaceBtn';
    restartBtn.style.margin = '0';
    restartBtn.textContent = '🔄 Restart';
    restartBtn.className = 'race-panel-btn';
    restartBtn.addEventListener('click', () =>
      this.#initializeRace(this.world),
    );
    group.appendChild(label);
    group.appendChild(restartBtn);
    this.racePanel.appendChild(group);
    const toolbar =
      document.getElementById('simulatorToolbar') ?? document.body;
    toolbar.appendChild(this.racePanel);
  }

  #initializeRace(worldInfo) {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );
    this.viewport.setMode(this.toolbarPanel.viewportMode);
    this.cars = this.generateCars();
    this.myCar = this.cars[0];
    if (!this.myCar) throw new Error('Player car not created');
    if (this.controls) {
      this.myCar.controls = this.controls;
    }
    this.camera = new Camera(this.myCar);
    const target = this.world.markings.find((m) => m instanceof Target);
    if (target) {
      this.world.generateCorridor(
        new Point(this.myCar.x, this.myCar.y),
        target.center,
        true,
      );
      if (!this.world.corridor) throw new Error('Corridor generation failed');
      this.roadBorders = this.world.corridor.borders.map((s) => [s.p1, s.p2]);
    } else {
      this.roadBorders = [
        ...this.world.roadBorders,
        ...this.world.separatorBorders,
        ...this.world.corridors.flatMap((c) => c.borders),
      ].map((s) => [s.p1, s.p2]);
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

  updateCarProgress(car) {
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
        (acc, segment) => acc + segment.length(),
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

  startCounter() {
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
              this.myCar.engine = new SoundEngine();
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

  handleCollisionWithRoadBorders(car) {
    const bordersToCheck = this.world.corridor
      ? this.world.corridor.skeleton
      : [...this.world.roadBorders, ...this.world.separatorBorders];
    handleCollisionWithRoadBorders(car, bordersToCheck);
  }

  draw() {
    if (
      !this.cars ||
      !this.viewport ||
      !this.myCar ||
      !this.camera ||
      !this.miniMap
    )
      return;
    const borderMode = this.toolbarPanel.borderMode;
    if (this.started) {
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        if (car.damaged && borderMode === 'collision') {
          this.handleCollisionWithRoadBorders(car);
        }
        const borders = borderMode === 'none' ? [] : (this.roadBorders ?? []);
        car.update(borders);
      }
    }
    // Determine tracking target
    const trackTarget = this.#getTrackTarget();
    const worldBestCar = trackTarget ?? this.myCar;
    if (trackTarget) {
      this.viewport.offset.x = -trackTarget.x;
      this.viewport.offset.y = -trackTarget.y;
    }
    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.world.draw(this.gameCtx, {
      viewPoint,
      cars: this.cars,
      bestCar: worldBestCar,
      showStartMarkings: false,
      carAlpha: 1,
      showCarNames: true,
    });
    this.viewport.drawScaleIndicator(this.gameCtx);
    this.miniMap.draw({ viewPoint, cars: this.cars });
    // Rotate the minimap canvas itself to match tracked car orientation
    const rotationTarget = trackTarget ?? this.myCar;
    this.miniMapCanvas.style.transform = `rotate(${rotationTarget.angle}rad)`;
    for (let i = 0; i < this.cars.length; i++) {
      this.updateCarProgress(this.cars[i]);
    }
    // Sort cars based on progress (descending) — only if corridor exists
    if (this.world.corridor) {
      this.cars.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    }
    // Update statistics display
    for (let i = 0; i < this.cars.length; i++) {
      const stat = document.getElementById('stat_' + i);
      stat.style.color =
        this.cars[i].type === 'AI' ? 'white' : this.cars[i].color;
      stat.innerText = `${i + 1}: ${this.cars[i].name} ${this.cars[i].damaged ? '💀' : ''}`;
      stat.style.backgroundColor =
        this.cars[i].type === 'AI' ? 'black' : 'white';
      if (this.cars[i].finishTime) {
        stat.innerHTML +=
          '<span style="float: right;">' +
          (this.cars[i].finishTime / 60).toFixed(1) +
          's </span>';
      }
    }
    const cameraTarget = trackTarget ?? this.myCar;
    // Only move the camera while actively tracking a car; when tracking is
    // turned off ('none') the camera stays where it is, like the simulator.
    if (trackTarget) {
      this.camera.move(trackTarget);
    }
    this.camera.render(this.cameraCtx, this.world, {
      keyCar: this.myCar,
      bestCar: cameraTarget !== this.myCar ? cameraTarget : undefined,
      cars: this.cars,
      traffic: this.cars.filter((c) => c !== this.myCar && c !== cameraTarget),
    });
    if (this.started) {
      this.frameCount++;
    }
  }

  #getTrackTarget() {
    switch (this.toolbarPanel.trackingMode) {
      case 'none':
        return null;
      case 'best': {
        // "Best" follows the leading AI opponent (the player already has the
        // dedicated "keys" tracking mode). Rank by corridor progress when a
        // corridor exists; otherwise fall back to fitness (accumulated speed),
        // which is always available, so we don't just stick to the first AI.
        const aiCars = this.cars?.filter((car) => car !== this.myCar) ?? [];
        if (aiCars.length === 0) return this.myCar;
        const score = this.world.corridor
          ? (car) => car.progress ?? 0
          : (car) => car.fitness;
        return aiCars.reduce((best, car) =>
          score(car) > score(best) ? car : best,
        );
      }
      case 'keys':
        return this.myCar;
    }
  }

  animate() {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
