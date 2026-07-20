import { SimulatorShell } from '../core/simulatorShell.js';
import type { SimulatorPageHost } from '../views/simulatorPageHost.js';
import { SimpleTrainingStrategy } from './modes/simpleModeBehavior.js';
import { WorldTrainingStrategy } from './modes/worldModeBehavior.js';
import type { TrainingPanelElement } from '../../ui/organisms/trainingPanel.js';
import type {
  TrainingInitModalElement,
  TrainingInitResult,
} from '../../ui/organisms/trainingInitModal.js';
import { KeyboardManager } from '../../ui/atoms/keyboardManager.js';
import type { ShortcutsToolbarElement } from '../../ui/molecules/shortcutsToolbar.js';
import { StoreManager } from '../../store/storeManager.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import {
  discardStoredPool,
  savePoolToStorage,
} from './genetics/storageManager.js';
import { Start } from '../../world/markings/start.js';
import { Target } from '../../world/markings/target.js';
import { Point } from '../../math/primitives/point.js';
import type { Segment } from '../../math/primitives/segment.js';
import type { Car } from '../../car/car.js';
import type { IWorld } from '../../world/types.js';
import { World } from '../../world/world.js';
import { Light } from '../../world/markings/light.js';
import { angle } from '../../math/utils.js';
import { buildRoadBorders } from '../spatialGridUtils.js';

export class TrainingSimulator extends SimulatorShell {
  #strategy!: SimpleTrainingStrategy | WorldTrainingStrategy;
  #keyboardManager: KeyboardManager | null = null;
  world: IWorld | null = null;
  roadBorders: Point[][] | null = null;
  trainingManager!: TrainingPanelElement;
  protected initModal: TrainingInitModalElement | null = null;

  constructor(
    gameCanvas: HTMLCanvasElement,
    networkCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    host: SimulatorPageHost,
  ) {
    super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);

    this.trainingManager = document.querySelector(
      'training-panel',
    ) as TrainingPanelElement;

    this.initModal = document.querySelector(
      'training-init-modal',
    ) as TrainingInitModalElement | null;

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'simple') {
      this.#strategy = new SimpleTrainingStrategy(this);
      this.#strategy.init();
    } else {
      this.#strategy = new WorldTrainingStrategy(this);
      this.#strategy.init(null);
    }

    this.trainingManager.setNewTrainingHandler(() => this.openInitModal('new'));

    this.#initPauseToggleClicks();
    this.#initKeyboardManager();
    this.initModal?.setKeyboardManager(this.#keyboardManager);
    this.animate(0);
  }

  #initPauseToggleClicks(): void {
    const toggle = (e: MouseEvent) => {
      if (e.button !== 0) return;
      this.animationLoopToolbar.togglePause();
    };
    this.gameCanvas.addEventListener('click', toggle);
    this.cameraCanvas.addEventListener('click', toggle);
  }

  #initKeyboardManager(): void {
    const toolbar = document.querySelector(
      'shortcuts-toolbar',
    ) as ShortcutsToolbarElement | null;
    if (!toolbar) return;
    this.#keyboardManager = new KeyboardManager(toolbar);
    this.#keyboardManager.setBindings([
      {
        id: 'keyUp',
        key: '',
        label: '\u2191 / W',
        title: 'Arrow Up / W \u2014 Accelerate (drive the \u{1f3ae} user car)',
        group: 'Drive',
        kind: 'display',
        keys: ['ArrowUp', 'w'],
      },
      {
        id: 'keyDown',
        key: '',
        label: '\u2193 / S',
        title: 'Arrow Down / S \u2014 Brake / reverse',
        group: 'Drive',
        kind: 'display',
        keys: ['ArrowDown', 's'],
      },
      {
        id: 'keyLeft',
        key: '',
        label: '\u2190 / A',
        title: 'Arrow Left / A \u2014 Steer left',
        group: 'Drive',
        kind: 'display',
        keys: ['ArrowLeft', 'a'],
      },
      {
        id: 'keyRight',
        key: '',
        label: '\u2192 / D',
        title: 'Arrow Right / D \u2014 Steer right',
        group: 'Drive',
        kind: 'display',
        keys: ['ArrowRight', 'd'],
      },
      {
        id: 'keyG',
        key: 'g',
        label: 'G',
        title:
          'G \u2014 Toggle global green wave for all traffic lights. Press once to force all lights green, again to restore normal cycling.',
        group: 'Traffic',
        kind: 'toggle',
        toggle: {
          onActivate: () => this.#enableGreenWave(),
          onDeactivate: () => this.#disableGreenWave(),
        },
      },
      {
        id: 'keyCtrl',
        key: '',
        label: 'Ctrl',
        title: 'Ctrl + scroll wheel \u2014 Zoom in/out (touchpad mode)',
        group: 'View',
        kind: 'display',
        keys: ['Control'],
      },
      {
        id: 'visDensity',
        key: 'v',
        label: 'V',
        title: 'V \u2014 Toggle network visualizer density (show all values)',
        group: 'Visualizer',
        kind: 'momentary',
        handler: {
          onKeyDown: () => this.networkVisualizer.toggleDensity(),
        },
      },
    ]);
  }

  #enableGreenWave(): void {
    if (!this.world || !(this.world instanceof World)) return;
    for (const marking of this.world.markings) {
      if (marking instanceof Light) {
        this.world.trafficManager.overrideLight(marking, 'green');
      }
    }
  }

  #disableGreenWave(): void {
    if (!this.world || !(this.world instanceof World)) return;
    this.world.trafficManager.releaseAllOverrides();
  }

  openInitModal(context: 'entry' | 'new'): void {
    const settings = this.trainingManager.getSettings();
    const defaults = {
      carCount: settings.carCount,
      poolSize: settings.poolSize,
      mutationRate: settings.mutationRate,
      idleRange: settings.idleRange,
      carConfig: this.trainingManager.getCarSettings(),
    };

    if (!this.initModal) {
      if (context === 'new') this.trainingManager.newTraining();
      else this.trainingManager.initializeCars();
      return;
    }

    this.initModal.open({
      context,
      defaults,
      onStart: (result) => this.applyInitConfig(result),
      onCancel: () => {
        if (context === 'entry') this.trainingManager.initializeCars();
      },
    });
  }

  applyInitConfig(result: TrainingInitResult): void {
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

  getStartInfo(): { x: number; y: number; angle: number } {
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

  updateRoadBorders(): void {
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
      const corridor = this.world.corridors[0] ?? null;
      this.roadBorders = corridor
        ? corridor.borders.map((s: Segment): [Point, Point] => [s.p1, s.p2])
        : null;
    } else {
      this.roadBorders = buildRoadBorders(this.world);
    }
  }

  getTrackTarget(bestCar: Car): Car | null {
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

  snapCameraToStart(): void {
    if (this.camera) {
      this.camera.simpleMove(this.getStartInfo());
    }
  }

  updateTrainingMetrics(
    distance: number,
    aliveCount: number,
    deadCount: number,
    frozenCount: number,
  ): void {
    this.trainingManager.updateDistance(distance);
    this.trainingManager.updateBestCarAndPool();
    this.trainingManager.updateStatsDisplay(
      aliveCount,
      deadCount,
      frozenCount,
      this.trainingManager.maxDistancePassed,
      this.trainingManager.bestCar?.speed ?? 0,
    );
  }

  resolveTrackTarget(): { bestCar: Car; trackTarget: Car | null } {
    const cars = this.trainingManager.cars;
    const bestCar = this.trainingManager.bestCar || cars[0];
    const trackTarget = this.getTrackTarget(bestCar);
    return { bestCar, trackTarget };
  }

  renderCameraView(
    bestCar: Car,
    opts?: { traffic?: Car[]; debugCtx?: CanvasRenderingContext2D },
  ): void {
    if (!this.layoutToolbar.showCameraView || !this.camera) return;

    const keysCar = this.trainingManager.cars.find((c) => c.type === 'KEYS');
    this.camera.render(this.cameraCtx, this.world!, {
      keyCar: keysCar || bestCar,
      bestCar: keysCar ? bestCar : undefined,
      cars: this.trainingManager.cars,
      showTrees: this.worldLayers.trees,
      showBuildings: this.worldLayers.buildings,
      ...opts,
    });
  }

  protected update(): void {
    this.#strategy.update();
  }

  protected draw(time: number): void {
    this.#strategy.draw(time);
  }

  protected onPausedRender(): void {
    this.trainingManager.updateBestCarAndPool();
  }
}
