import { SimulatorShell } from '../core/simulatorShell.js';
import { SimpleTrainingStrategy } from './modes/simpleModeBehavior.js';
import { WorldTrainingStrategy } from './modes/worldModeBehavior.js';
import { StoreManager } from '../../store/storeManager.js';
import { CarLoader } from '../../car/loader/carLoader.js';
import { discardStoredPool, savePoolToStorage, } from './genetics/storageManager.js';
import { Start } from '../../world/markings/start.js';
import { Target } from '../../world/markings/target.js';
import { Point } from '../../math/primitives/point.js';
import { World } from '../../world/world.js';
import { Light } from '../../world/markings/light.js';
import { angle } from '../../math/utils.js';
import { buildRoadBorders } from '../spatialGridUtils.js';
export class TrainingSimulator extends SimulatorShell {
    #strategy;
    #globalGreenWave = false;
    world = null;
    roadBorders = null;
    trainingManager;
    initModal = null;
    constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host) {
        super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);
        this.trainingManager = document.querySelector('training-panel');
        this.initModal = document.querySelector('training-init-modal');
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'simple') {
            this.#strategy = new SimpleTrainingStrategy(this);
            this.#strategy.init();
        }
        else {
            this.#strategy = new WorldTrainingStrategy(this);
            this.#strategy.init(null);
        }
        this.trainingManager.setNewTrainingHandler(() => this.openInitModal('new'));
        this.#initPauseToggleClicks();
        this.#initGreenWaveHandler();
        this.#initShortcutsToolbar();
        this.animate(0);
    }
    #initShortcutsToolbar() {
        const toolbar = document.querySelector('shortcuts-toolbar');
        toolbar?.setShortcuts([
            {
                id: 'keyUp',
                label: '\u2191 / W',
                title: 'Arrow Up / W \u2014 Accelerate (drive the \u{1f3ae} user car)',
                group: 'Drive',
                kind: 'momentary',
                display: true,
                keys: ['ArrowUp', 'w'],
            },
            {
                id: 'keyDown',
                label: '\u2193 / S',
                title: 'Arrow Down / S \u2014 Brake / reverse',
                group: 'Drive',
                kind: 'momentary',
                display: true,
                keys: ['ArrowDown', 's'],
            },
            {
                id: 'keyLeft',
                label: '\u2190 / A',
                title: 'Arrow Left / A \u2014 Steer left',
                group: 'Drive',
                kind: 'momentary',
                display: true,
                keys: ['ArrowLeft', 'a'],
            },
            {
                id: 'keyRight',
                label: '\u2192 / D',
                title: 'Arrow Right / D \u2014 Steer right',
                group: 'Drive',
                kind: 'momentary',
                display: true,
                keys: ['ArrowRight', 'd'],
            },
            {
                id: 'keyG',
                label: 'G',
                title: 'G \u2014 Toggle global green wave for all traffic lights. Press once to force all lights green, again to restore normal cycling.',
                group: 'Traffic',
                kind: 'toggle',
            },
            {
                id: 'keyCtrl',
                label: 'Ctrl',
                title: 'Ctrl + scroll wheel \u2014 Zoom in/out (touchpad mode)',
                group: 'View',
                kind: 'momentary',
                display: true,
                keys: ['Control'],
            },
        ]);
    }
    #initPauseToggleClicks() {
        const toggle = (e) => {
            if (e.button !== 0)
                return;
            this.animationLoopToolbar.togglePause();
        };
        this.gameCanvas.addEventListener('click', toggle);
        this.cameraCanvas.addEventListener('click', toggle);
    }
    #initGreenWaveHandler() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                this.#toggleGreenWave();
            }
        });
    }
    /** Toggle global green wave: force all lights green or restore normal cycling. */
    #toggleGreenWave() {
        if (!this.world || !(this.world instanceof World))
            return;
        const toolbar = document.querySelector('shortcuts-toolbar');
        if (this.#globalGreenWave) {
            this.world.trafficManager.releaseAllOverrides();
            this.#globalGreenWave = false;
        }
        else {
            for (const marking of this.world.markings) {
                if (marking instanceof Light) {
                    this.world.trafficManager.overrideLight(marking, 'green');
                }
            }
            this.#globalGreenWave = true;
        }
        toolbar?.setActive('keyG', this.#globalGreenWave);
    }
    openInitModal(context) {
        const settings = this.trainingManager.getSettings();
        const defaults = {
            carCount: settings.carCount,
            poolSize: settings.poolSize,
            mutationRate: settings.mutationRate,
            idleRange: settings.idleRange,
            carConfig: this.trainingManager.getCarSettings(),
        };
        if (!this.initModal) {
            if (context === 'new')
                this.trainingManager.newTraining();
            else
                this.trainingManager.initializeCars();
            return;
        }
        this.initModal.open({
            context,
            defaults,
            onStart: (result) => this.applyInitConfig(result),
            onCancel: () => {
                if (context === 'entry')
                    this.trainingManager.initializeCars();
            },
        });
    }
    applyInitConfig(result) {
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
    getStartInfo() {
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
    updateRoadBorders() {
        if (!this.world)
            return;
        const bestCar = this.trainingManager.bestCar;
        const target = this.world.markings.find((m) => m instanceof Target);
        if (target && bestCar) {
            this.world.generateCorridor(new Point(bestCar.x, bestCar.y), target.center);
            const corridor = this.world.corridors[0] ?? null;
            this.roadBorders = corridor
                ? corridor.borders.map((s) => [s.p1, s.p2])
                : null;
        }
        else {
            this.roadBorders = buildRoadBorders(this.world);
        }
    }
    getTrackTarget(bestCar) {
        switch (this.toolbarPanel.trackingMode) {
            case 'none':
                return null;
            case 'best':
                return bestCar;
            case 'keys': {
                const keysCar = this.trainingManager.cars.find((c) => c.type === 'KEYS');
                return keysCar || bestCar;
            }
        }
    }
    snapCameraToStart() {
        if (this.camera) {
            this.camera.simpleMove(this.getStartInfo());
        }
    }
    updateTrainingMetrics(distance, aliveCount, deadCount, frozenCount) {
        this.trainingManager.updateDistance(distance);
        this.trainingManager.updateBestCarAndPool();
        this.trainingManager.updateStatsDisplay(aliveCount, deadCount, frozenCount, this.trainingManager.maxDistancePassed, this.trainingManager.bestCar?.speed ?? 0);
    }
    resolveTrackTarget() {
        const cars = this.trainingManager.cars;
        const bestCar = this.trainingManager.bestCar || cars[0];
        const trackTarget = this.getTrackTarget(bestCar);
        return { bestCar, trackTarget };
    }
    renderCameraView(bestCar, opts) {
        if (!this.layoutToolbar.showCameraView || !this.camera)
            return;
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
    update() {
        this.#strategy.update();
    }
    draw(time) {
        this.#strategy.draw(time);
    }
    onPausedRender() {
        this.trainingManager.updateBestCarAndPool();
    }
}
