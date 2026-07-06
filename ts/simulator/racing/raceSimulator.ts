import { SimulatorShell } from '../core/simulatorShell.js';
import type { SimulatorPageHost } from '../views/simulatorPageHost.js';
import { RacePanel } from './racePanel.js';
import { SpatialHashGrid } from '../../math/spatialGrid.js';
import { World } from '../../world/world.js';
import { Graph } from '../../math/graph/graph.js';
import type { CarInfo } from '../../car/car.js';
import { Car } from '../../car/car.js';
import type { CarControls } from '../../car/car.js';
import { PhoneControls } from '../../car/controls/phoneControls.js';
import { CameraControls } from '../../car/controls/cameraControls.js';
import { Viewport } from '../../viewport/viewport.js';
import { MiniMap } from '../../mini-map/miniMap.js';
import { Camera } from '../../camera/camera.js';
import { StoreManager } from '../../store/storeManager.js';
import { getRandomColor } from '../../math/color.js';
import { buildRoadBorders, queryBordersNearCar } from '../spatialGridUtils.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { Start } from '../../world/markings/start.js';
import { Target } from '../../world/markings/target.js';
import { angle, getNearestSegment, scale } from '../../math/utils.js';

import { loadPoolFromStorage } from '../training/genetics/storageManager.js';
import { handleCollisionWithRoadBorders } from '../training/modes/borderCollision.js';
import { SoundEngine, taDaa, explode } from '../../audio/sound.js';

export class RaceSimulator extends SimulatorShell {
  controls: CarControls | null;
  racePanel: RacePanel;

  #world!: World;
  #cars: Car[] | null = null;
  #myCar: Car | null = null;
  #roadBorders: [Point, Point][] | null = null;
  #borderGrid: SpatialHashGrid = new SpatialHashGrid(150);
  #frameCount: number = 0;
  #started: boolean = false;

  constructor(
    gameCanvas: HTMLCanvasElement,
    networkCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    host: SimulatorPageHost,
    controls: CarControls | null = null,
  ) {
    super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);

    this.controls = controls;

    this.racePanel = new RacePanel();
    this.racePanel.configureToolbar({
      carMode: 'multi',
      onWorldSelected: (entry) =>
        this.#initializeRace((entry?.data as World) ?? null),
      onViewportModeChange: (mode) => this.viewport?.setMode(mode),
    });
    this.racePanel.createPanel(() => this.#initializeRace(this.#world));

    const storeWorld =
      StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
    const worldInfo: World | null = (storeWorld as World | null) ?? null;
    this.#initializeRace(worldInfo);

    if (this.controls && this.#myCar) {
      this.#myCar.controls = this.controls;
    }

    if (this.controls instanceof PhoneControls) {
      this.racePanel.setTrackingMode('keys');
    }

    this.animate(0);
  }

  #generateCars(): Car[] {
    const startMarkings = this.#world.markings.filter(
      (m): m is Start => m instanceof Start,
    );
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);
    const startAngle = -angle(direction) + Math.PI / 2;

    const pool = loadPoolFromStorage();
    const selected = StoreManager.getActiveCars();
    const aiSources: CarInfo[] = [...pool, ...selected];

    const keyParams = pool[0] ?? selected[0] ?? null;

    const cars: Car[] = [];

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

  #initializeRace(worldInfo: World | null): void {
    this.#world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.#world.zoom,
      this.#world.offset,
    );
    this.viewport.setMode(this.racePanel.viewportMode);

    this.#cars = this.#generateCars();
    this.#myCar = this.#cars[0];

    if (!this.#myCar) throw new Error('Player car not created');
    if (this.controls) {
      this.#myCar.controls = this.controls;
    }
    this.camera = new Camera(this.#myCar);

    const target = this.#world.markings.find(
      (m): m is Target => m instanceof Target,
    );
    if (target) {
      this.#world.generateCorridor(
        new Point(this.#myCar.x, this.#myCar.y),
        target.center,
        true,
      );
      if (!this.#world.corridor) throw new Error('Corridor generation failed');
      this.#roadBorders = this.#world.corridor.borders.map(
        (s: Segment): [Point, Point] => [s.p1, s.p2],
      );
    } else {
      this.#roadBorders = buildRoadBorders(this.#world);
    }

    if (this.#roadBorders) {
      this.#borderGrid.build(this.#roadBorders);
    }

    if (this.#world.corridor) {
      const miniMapGraph = new Graph([], this.#world.corridor.skeleton);
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        miniMapGraph,
        this.miniMapCanvas.width,
        0.1,
      );
    } else {
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        this.#world.graph,
        this.miniMapCanvas.width,
      );
    }

    this.racePanel.createStatistics(this.#cars);

    this.#started = false;
    this.#frameCount = 0;

    this.racePanel.startCounter(() => {
      this.#started = true;
      this.#frameCount = 0;
      if (this.#myCar) {
        const engine = new SoundEngine();
        this.#myCar.setCallbacks({
          onDamaged: () => {
            explode();
          },
          onEngineUpdate: (speed: number, maxSpeed: number) => {
            const percent = Math.abs(speed / maxSpeed);
            engine.setVolume(percent);
            engine.setPitch(percent);
          },
        });
      }
      if (this.controls instanceof CameraControls) {
        this.controls.saveExpectedSize();
      }
    });
  }

  #updateCarProgress(car: Car): void {
    if (!this.#world.corridor) return;

    const carPoint = new Point(car.x, car.y);

    if (!car.finishTime) {
      car.progress = 0;
      const carSegment = getNearestSegment(
        carPoint,
        this.#world.corridor.skeleton,
      );
      if (!carSegment) return;

      for (let i = 0; i < this.#world.corridor.skeleton.length; i++) {
        const segment = this.#world.corridor.skeleton[i];
        if (segment.equals(carSegment)) {
          const projection = segment.projectPoint(carPoint);
          const firstPartOfSegment = new Segment(segment.p1, projection.point);
          car.progress += firstPartOfSegment.length();
          break;
        } else {
          car.progress += segment.length();
        }
      }
      const totalDistance = this.#world.corridor.skeleton.reduce(
        (acc: number, segment: Segment) => acc + segment.length(),
        0,
      );

      if (totalDistance === 0) return;

      car.progress /= totalDistance;
      if (car.progress >= 1) {
        car.progress = 1;
        car.finishTime = this.#frameCount;
        if (car === this.#myCar) {
          taDaa();
        }
      }
    }
  }

  #handleCollisionWithRoadBorders(car: Car): void {
    const bordersToCheck: Segment[] = this.#world.corridor
      ? this.#world.corridor.skeleton
      : [...this.#world.roadBorders, ...this.#world.separatorBorders];
    handleCollisionWithRoadBorders(car, bordersToCheck);
  }

  protected update(): void {
    if (!this.#cars || !this.viewport || !this.#myCar) return;

    const borderMode = this.racePanel.borderMode;

    if (this.#started) {
      for (let i = 0; i < this.#cars.length; i++) {
        const car = this.#cars[i];
        if (car.damaged && borderMode === 'collision') {
          this.#handleCollisionWithRoadBorders(car);
        }
        let obstacles: Point[][] = [];
        if (borderMode !== 'none' && this.#roadBorders) {
          obstacles = queryBordersNearCar(this.#borderGrid, car);
        }
        car.update(obstacles);
      }
    }

    const trackTarget = this.#getTrackTarget();

    if (trackTarget) {
      this.viewport.offset.x = -trackTarget.x;
      this.viewport.offset.y = -trackTarget.y;
    }

    for (let i = 0; i < this.#cars.length; i++) {
      this.#updateCarProgress(this.#cars[i]);
    }
    if (this.#world.corridor) {
      this.#cars.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    }

    this.racePanel.updateStatistics(this.#cars);

    const cameraTarget = trackTarget ?? this.#myCar;
    if (trackTarget) {
      this.camera?.move(cameraTarget);
    }

    if (this.#started) {
      this.#frameCount++;
    }
  }

  protected draw(_time: number): void {
    if (
      !this.#cars ||
      !this.viewport ||
      !this.#myCar ||
      !this.camera ||
      !this.miniMap
    )
      return;

    const trackTarget = this.#getTrackTarget();
    const worldBestCar = trackTarget ?? this.#myCar;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.#world.draw(this.gameCtx, {
      viewPoint,
      cars: this.#cars,
      bestCar: worldBestCar,
      showStartMarkings: false,
      carAlpha: 1,
      showCarNames: true,
    });
    this.viewport.drawScaleIndicator(this.gameCtx);
    this.miniMap.draw({ viewPoint, cars: this.#cars });
    const rotationTarget = trackTarget ?? this.#myCar;
    this.miniMapCanvas.style.transform = `rotate(${rotationTarget.angle}rad)`;

    const cameraTarget = trackTarget ?? this.#myCar;
    this.camera.render(this.cameraCtx, this.#world, {
      keyCar: this.#myCar,
      bestCar: cameraTarget !== this.#myCar ? cameraTarget : undefined,
      cars: this.#cars,
      traffic: this.#cars.filter(
        (c) => c !== this.#myCar && c !== cameraTarget,
      ),
    });
  }

  #getTrackTarget(): Car | null {
    switch (this.racePanel.trackingMode) {
      case 'none':
        return null;
      case 'best': {
        const aiCars = this.#cars?.filter((car) => car !== this.#myCar) ?? [];
        if (aiCars.length === 0) return this.#myCar;
        const score = this.#world.corridor
          ? (car: Car) => car.progress ?? 0
          : (car: Car) => car.fitness;
        return aiCars.reduce((best, car) =>
          score(car) > score(best) ? car : best,
        );
      }
      case 'keys':
        return this.#myCar;
      default:
        return null;
    }
  }
}
