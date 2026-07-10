import { SpatialHashGrid } from '../../../math/spatialGrid.js';
import { TrafficControlGrid } from '../../../math/trafficControlGrid.js';
import { World } from '../../../world/world.js';
import { Graph } from '../../../math/graph/graph.js';
import { Viewport } from '../../../viewport/viewport.js';
import { MiniMap } from '../../../mini-map/miniMap.js';
import { Camera } from '../../../camera/camera.js';
import { StoreManager } from '../../../store/storeManager.js';
import { queryBordersNearCar } from '../../spatialGridUtils.js';
import { buildTrafficControls, queryTrafficControlsNearCar, } from '../../trafficControlUtils.js';
import { handleCollisionWithRoadBorders } from './borderCollision.js';
import { drawSimulatorCars } from '../rendering/carRenderer.js';
import { scale } from '../../../math/utils.js';
export function updateWorldCars(cars, borderGrid, trafficGrid, borderMode, collisionBorders, bestCar, idleEnabled, idleRange) {
    let aliveCount = 0;
    let deadCount = 0;
    let frozenCount = 0;
    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        if (car.damaged && borderMode !== 'collision') {
            deadCount++;
            continue;
        }
        if (idleEnabled &&
            car !== bestCar &&
            bestCar.fitness - car.fitness > idleRange &&
            !(car.damaged && borderMode === 'collision')) {
            frozenCount++;
            continue;
        }
        if (car.damaged && borderMode === 'collision') {
            handleCollisionWithRoadBorders(car, collisionBorders);
        }
        let bordersForUpdate = [];
        if (borderMode !== 'none') {
            bordersForUpdate = queryBordersNearCar(borderGrid, car);
        }
        const trafficControls = car.sensor?.stateAware
            ? queryTrafficControlsNearCar(trafficGrid, car)
            : [];
        car.update(bordersForUpdate, trafficControls, []);
        aliveCount++;
    }
    return { aliveCount, deadCount, frozenCount };
}
export class WorldTrainingStrategy {
    #parent;
    #borderGrid = new SpatialHashGrid(150);
    #trafficGrid = new TrafficControlGrid(150);
    constructor(parent) {
        this.#parent = parent;
    }
    init(_worldInfo) {
        this.#parent.toolbarPanel.configureSelectors({
            carMode: 'multi',
            onWorldSelected: (entry) => this.initializeSimulator(entry?.data ?? null),
        });
        this.#parent.trainingManager.configure({
            evaluateFitness: (car) => car.fitness,
            getStartInfo: () => this.#parent.getStartInfo(),
            onCarsCreated: () => {
                this.#parent.updateRoadBorders();
                this.#rebuildGrid();
                this.#parent.snapCameraToStart();
                this.#parent.animationLoopToolbar.setPaused(false);
                this.#parent.resetHeatmap();
            },
        });
        const storeWorld = StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
        this.initializeSimulator(storeWorld ?? null);
        this.#parent.openInitModal('entry');
    }
    initializeSimulator(worldInfo) {
        console.log('Initializing simulator with world info:', worldInfo);
        this.#parent.world = worldInfo
            ? World.load(worldInfo)
            : new World(new Graph());
        this.#parent.viewport = new Viewport(this.#parent.gameCanvas, this.#parent.world.zoom, this.#parent.world.offset);
        this.#parent.viewport.setMode(this.#parent.toolbarPanel.viewportMode);
        this.#parent.miniMap = new MiniMap(this.#parent.miniMapCanvas, this.#parent.world.graph, this.#parent.miniMapCanvas.width);
        const startInfo = this.#parent.getStartInfo();
        this.#parent.camera = new Camera(startInfo);
        this.#parent.updateRoadBorders();
        this.#rebuildGrid();
        this.#parent.resetHeatmap();
    }
    #rebuildGrid() {
        this.#borderGrid.build((this.#parent.roadBorders ?? []));
        if (this.#parent.world) {
            this.#trafficGrid.rebuild(buildTrafficControls(this.#parent.world));
        }
        else {
            this.#trafficGrid.rebuild([]);
        }
    }
    update() {
        const cars = this.#parent.trainingManager.cars;
        const bestCar = this.#parent.trainingManager.bestCar;
        if (!cars.length ||
            !this.#parent.world ||
            !this.#parent.viewport ||
            !this.#parent.miniMap ||
            !this.#parent.roadBorders ||
            !bestCar) {
            return;
        }
        const corridor = this.#parent.world.corridors[0] ?? null;
        const collisionBorders = corridor
            ? corridor.skeleton
            : [
                ...this.#parent.world.roadBorders,
                ...this.#parent.world.separatorBorders,
            ];
        const { idleRange } = this.#parent.trainingManager.getSettings();
        const { aliveCount, deadCount, frozenCount } = updateWorldCars(cars, this.#borderGrid, this.#trafficGrid, this.#parent.toolbarPanel.borderMode, collisionBorders, bestCar, this.#parent.trainingManager.idleEnabled, idleRange);
        const bestFitness = Math.round(bestCar.fitness);
        this.#parent.updateTrainingMetrics(bestFitness, aliveCount, deadCount, frozenCount);
        this.#parent.recordHeatmap(cars);
        const currentBestCar = this.#parent.trainingManager.bestCar || bestCar;
        const trackTarget = this.#parent.getTrackTarget(currentBestCar);
        if (trackTarget) {
            this.#parent.viewport.offset.x = -trackTarget.x;
            this.#parent.viewport.offset.y = -trackTarget.y;
        }
        if (trackTarget && this.#parent.camera) {
            this.#parent.camera.move(trackTarget);
        }
    }
    draw(time) {
        const cars = this.#parent.trainingManager.cars;
        const bestCar = this.#parent.trainingManager.bestCar;
        if (!cars.length ||
            !this.#parent.world ||
            !this.#parent.viewport ||
            !this.#parent.miniMap ||
            !this.#parent.roadBorders ||
            !bestCar) {
            return;
        }
        this.#parent.resizeLayout();
        this.#parent.viewport.reset();
        const viewPoint = scale(this.#parent.viewport.getOffset(), -1);
        this.#parent.world.draw(this.#parent.gameCtx, {
            viewPoint,
            showStartMarkings: false,
            layers: this.#parent.worldLayers,
        });
        this.#parent.viewport.drawScaleIndicator(this.#parent.gameCtx);
        const viewportTop = bestCar.y - this.#parent.gameCanvas.height * 2;
        const viewportBottom = bestCar.y + this.#parent.gameCanvas.height * 2;
        const viewportLeft = bestCar.x - this.#parent.gameCanvas.width * 2;
        const viewportRight = bestCar.x + this.#parent.gameCanvas.width * 2;
        const settings = this.#parent.trainingManager.getSettings();
        const drawMasks = settings.carCount <= 5000;
        const trackingKeys = this.#parent.toolbarPanel.trackingMode === 'keys';
        const keysCar = trackingKeys
            ? cars.find((c) => c.type === 'KEYS')
            : undefined;
        drawSimulatorCars(this.#parent.gameCtx, cars, this.#parent.trainingManager.bestPool, viewportTop, viewportBottom, drawMasks, 'gold', this.#parent.trainingManager.prevPoolCars, 'deepskyblue', viewportLeft, viewportRight, trackingKeys);
        this.#parent.drawHeatmap(viewPoint);
        const floatingMiniMap = this.#parent.layoutToolbar.showMiniMap &&
            !this.#parent.layoutToolbar.showVisualizer;
        this.#parent.miniMap.draw(floatingMiniMap
            ? {
                viewPoint,
                cars,
                roadColor: '#BBB',
                carColor: 'red',
                backgroundColor: '#2a5',
            }
            : { viewPoint, cars });
        this.#parent.drawNetworkVisualizer(time, keysCar?.brain ?? bestCar.brain);
        const debugCtx = this.#parent.toolbarPanel.showCameraDebug
            ? this.#parent.gameCtx
            : undefined;
        this.#parent.renderCameraView(bestCar, { debugCtx });
    }
}
