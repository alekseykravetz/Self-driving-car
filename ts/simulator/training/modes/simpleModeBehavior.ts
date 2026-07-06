import type { TrainingSimulator } from '../trainingSimulator.js';
import { SimpleWorld } from '../../../world/simple/simpleWorld.js';
import type { Car } from '../../../car/car.js';
import { Point } from '../../../math/primitives/point.js';
import { Viewport } from '../../../viewport/viewport.js';
import { MiniMap } from '../../../mini-map/miniMap.js';
import { Camera } from '../../../camera/camera.js';
import {
  generateInitialTraffic,
  generateTrafficRow,
} from './trafficFactory.js';
import { drawSimulatorCars } from '../rendering/carRenderer.js';
import { scale } from '../../../math/utils.js';

const INITIAL_TRAFFIC_Y = -700;

export class SimpleSimState {
  traffic: Car[] = [];
  lastGeneratedTrafficY: number = INITIAL_TRAFFIC_Y;
  simpleViewY: number = 0;

  reset(startTrafficY: number = INITIAL_TRAFFIC_Y): void {
    this.traffic = [];
    this.lastGeneratedTrafficY = startTrafficY;
  }
}

export function updateSimpleTraffic(
  state: SimpleSimState,
  bestCar: Car,
  simpleWorld: SimpleWorld,
  roadBorders: Point[][],
  startInfo: { x: number; y: number; angle: number },
): void {
  const TRAFFIC_LOOKAHEAD = 1500;
  const TRAFFIC_ROW_GAP = 200;
  const TRAFFIC_SPEED = 2;

  state.lastGeneratedTrafficY -= TRAFFIC_SPEED;

  while (state.lastGeneratedTrafficY > bestCar.y - TRAFFIC_LOOKAHEAD) {
    state.lastGeneratedTrafficY -= TRAFFIC_ROW_GAP;
    state.traffic.push(
      ...generateTrafficRow(
        state.lastGeneratedTrafficY,
        (lane) => simpleWorld.getLaneCenter(lane),
        simpleWorld.getLaneCount(),
        startInfo.angle,
      ),
    );
  }

  const TRAFFIC_CULL_MARGIN = 600;
  const startY = startInfo.y;
  state.traffic = state.traffic.filter(
    (c) => c.y < startY + TRAFFIC_CULL_MARGIN,
  );

  for (let i = 0; i < state.traffic.length; i++) {
    state.traffic[i].update(roadBorders);
  }

  state.traffic.sort((a, b) => a.y - b.y);
}

export function updateSimpleCars(
  cars: Car[],
  state: SimpleSimState,
  roadBorders: Point[][],
  idleEnabled: boolean,
  bestCar: Car,
  idleRange: number,
): { aliveCount: number; deadCount: number; frozenCount: number } {
  const PROXIMITY_THRESHOLD = 400;
  let aliveCount = 0;
  let deadCount = 0;
  let frozenCount = 0;

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];

    if (car.damaged) {
      deadCount++;
      continue;
    }

    if (
      idleEnabled &&
      car !== bestCar &&
      bestCar.fitness - car.fitness > idleRange
    ) {
      frozenCount++;
      continue;
    }

    const nearbyPolygons: Point[][] = [...roadBorders];

    const minY = car.y - PROXIMITY_THRESHOLD;
    const maxY = car.y + PROXIMITY_THRESHOLD;

    let lo = 0;
    let hi = state.traffic.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (state.traffic[mid].y < minY) lo = mid + 1;
      else hi = mid;
    }
    for (
      let j = lo;
      j < state.traffic.length && state.traffic[j].y <= maxY;
      j++
    ) {
      nearbyPolygons.push(state.traffic[j].polygon);
    }

    car.update(nearbyPolygons);
    aliveCount++;
  }

  return { aliveCount, deadCount, frozenCount };
}

export class SimpleTrainingStrategy {
  #parent: TrainingSimulator;
  #simpleState: SimpleSimState = new SimpleSimState();

  constructor(parent: TrainingSimulator) {
    this.#parent = parent;
  }

  init(): void {
    this.#parent.toolbarPanel.hideGroups('world', 'borders', 'borders-sep');
    this.#parent.toolbarPanel.configureSelectors({ carMode: 'multi' });
    this.#parent.toolbarPanel.hideCameraDebug();
    this.#parent.layoutToolbar.setDefaultLayoutMode('camera-big');

    const SIMPLE_ROAD_WIDTH = 180;
    const simpleWorld = new SimpleWorld(
      this.#parent.gameCanvas.width / 2,
      SIMPLE_ROAD_WIDTH,
    );
    this.#parent.world = simpleWorld;

    this.#parent.viewport = new Viewport(
      this.#parent.gameCanvas,
      1,
      new Point(-simpleWorld.getCenter(), -100),
    );
    this.#parent.viewport.setMode(this.#parent.toolbarPanel.viewportMode);

    this.#parent.miniMap = new MiniMap(
      this.#parent.miniMapCanvas,
      simpleWorld.graph,
      this.#parent.miniMapCanvas.width,
    );

    const startInfo = this.#parent.getStartInfo();
    this.#parent.camera = new Camera(startInfo);

    this.#parent.trainingManager.configure({
      evaluateFitness: (car: Car) => startInfo.y - car.y,
      getStartInfo: () => this.#parent.getStartInfo(),
      onCarsCreated: () => {
        this.#simpleState.traffic = generateInitialTraffic(
          (lane) => (this.#parent.world as SimpleWorld).getLaneCenter(lane),
          startInfo.angle,
        );
        this.#simpleState.lastGeneratedTrafficY = -700;
        this.#parent.updateRoadBorders();
        this.#parent.snapCameraToStart();
        this.#parent.animationLoopToolbar.setPaused(false);
      },
    });

    this.#simpleState.traffic = generateInitialTraffic(
      (lane) => simpleWorld.getLaneCenter(lane),
      startInfo.angle,
    );

    this.#parent.updateRoadBorders();
    this.#parent.openInitModal('entry');
  }

  update(): void {
    const cars = this.#parent.trainingManager.cars;
    const { bestCar, trackTarget } = this.#parent.resolveTrackTarget();

    if (
      !cars.length ||
      !this.#parent.world ||
      !this.#parent.viewport ||
      !this.#parent.roadBorders ||
      !bestCar
    ) {
      return;
    }

    const simpleWorld = this.#parent.world as SimpleWorld;

    updateSimpleTraffic(
      this.#simpleState,
      bestCar,
      simpleWorld,
      this.#parent.roadBorders,
      this.#parent.getStartInfo(),
    );

    const { idleRange } = this.#parent.trainingManager.getSettings();
    const { aliveCount, deadCount, frozenCount } = updateSimpleCars(
      cars,
      this.#simpleState,
      this.#parent.roadBorders,
      this.#parent.trainingManager.idleEnabled,
      bestCar,
      idleRange,
    );

    const startInfo = this.#parent.getStartInfo();
    const currentDist = Math.round(startInfo.y - bestCar.y);
    this.#parent.updateTrainingMetrics(
      currentDist,
      aliveCount,
      deadCount,
      frozenCount,
    );

    if (trackTarget) {
      this.#parent.viewport.offset.x = -simpleWorld.getCenter();
      this.#parent.viewport.offset.y = -trackTarget.y;
    }
    const totalOffset = this.#parent.viewport.getOffset();
    this.#simpleState.simpleViewY = -totalOffset.y;

    if (trackTarget && this.#parent.camera) {
      this.#parent.camera.move(trackTarget);
    }
  }

  draw(time: number): void {
    const cars = this.#parent.trainingManager.cars;
    const bestCar = this.#parent.trainingManager.bestCar;

    if (
      !cars.length ||
      !this.#parent.world ||
      !this.#parent.viewport ||
      !this.#parent.roadBorders ||
      !bestCar
    ) {
      return;
    }

    const simpleWorld = this.#parent.world as SimpleWorld;

    this.#parent.resizeLayout();

    const viewportTop =
      this.#simpleState.simpleViewY -
      this.#parent.gameCanvas.height * 0.5 * this.#parent.viewport.zoom;
    const viewportBottom =
      this.#simpleState.simpleViewY +
      this.#parent.gameCanvas.height * 0.5 * this.#parent.viewport.zoom;

    const settings = this.#parent.trainingManager.getSettings();
    const drawMasks = settings.carCount <= 5000;

    this.#parent.viewport.reset();
    simpleWorld.draw(this.#parent.gameCtx, { viewPoint: new Point(0, 0) });
    this.#parent.viewport.drawScaleIndicator(this.#parent.gameCtx);

    for (let i = 0; i < this.#simpleState.traffic.length; i++) {
      if (
        this.#simpleState.traffic[i].y > viewportTop - 100 &&
        this.#simpleState.traffic[i].y < viewportBottom + 100
      ) {
        this.#simpleState.traffic[i].draw(this.#parent.gameCtx, {});
      }
    }

    drawSimulatorCars(
      this.#parent.gameCtx,
      cars,
      this.#parent.trainingManager.bestPool,
      viewportTop - 100,
      viewportBottom + 100,
      drawMasks,
      'gold',
      this.#parent.trainingManager.prevPoolCars,
    );

    this.#parent.drawNetworkVisualizer(time, bestCar.brain);

    if (this.#parent.miniMap) {
      const viewPoint = scale(this.#parent.viewport.getOffset(), -1);
      const floatingMiniMap =
        this.#parent.layoutToolbar.showMiniMap &&
        !this.#parent.layoutToolbar.showVisualizer;
      this.#parent.miniMap.draw(
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

    this.#parent.renderCameraView(bestCar, {
      traffic: this.#simpleState.traffic,
    });
  }
}
