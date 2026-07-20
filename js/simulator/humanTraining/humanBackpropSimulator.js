import { SimulatorShell } from '../core/simulatorShell.js';
import { KeyboardManager } from '../../ui/atoms/keyboardManager.js';
import { StoreManager } from '../../store/storeManager.js';
import { Point } from '../../math/primitives/point.js';
import { Car as CarClass } from '../../car/car.js';
import { CarBrainAdapter } from '../../car/brain/carBrainAdapter.js';
import { World } from '../../world/world.js';
import { Graph } from '../../math/graph/graph.js';
import { SimpleWorld } from '../../world/simple/simpleWorld.js';
import { Start } from '../../world/markings/start.js';
import { Viewport } from '../../viewport/viewport.js';
import { MiniMap } from '../../mini-map/miniMap.js';
import { Camera } from '../../camera/camera.js';
import { SpatialHashGrid } from '../../math/spatialGrid.js';
import { TrafficControlGrid } from '../../math/trafficControlGrid.js';
import { angle, scale } from '../../math/utils.js';
import { buildRoadBorders } from '../spatialGridUtils.js';
import { queryBordersNearCar } from '../spatialGridUtils.js';
import { buildTrafficControls, queryTrafficControlsNearCar, } from '../trafficControlUtils.js';
import { DEFAULT_CAR_CONFIG, NN_OUTPUT_COUNT, DEFAULT_HIDDEN_LAYERS, } from '../../car/config.js';
import { SIMPLE_MODE_CONFIG, SimpleSimState, updateSimpleTraffic, updateSimpleCars, } from '../training/modes/simpleModeBehavior.js';
import { generateInitialTraffic } from '../training/modes/trafficFactory.js';
import { downloadCarFiles } from '../training/genetics/storageManager.js';
import { safeJsonParse } from '../../store/serialization.js';
import { pxPerFrameToKmh } from '../../math/worldUnits.js';
export class HumanBackpropSimulator extends SimulatorShell {
    #mode;
    #panel;
    #configModal;
    #carConfig = null;
    #car = null;
    world = null;
    roadBorders = null;
    #borderGrid = new SpatialHashGrid(150);
    #trafficGrid = new TrafficControlGrid(150);
    #simpleState = new SimpleSimState();
    #keyboardManager = null;
    #accuracyWindow = [];
    #ACCURACY_WINDOW_SIZE = 120;
    #currentMatch = [null, null, null, null];
    #trainingFrames = 0;
    #autoSaveFrameCounter = 0;
    #AUTO_SAVE_INTERVAL = 60;
    #brainInspectorCounter = 0;
    #BRAIN_INSPECTOR_INTERVAL = 10;
    constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host) {
        super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);
        this.#mode =
            new URLSearchParams(window.location.search).get('mode') === 'simple'
                ? 'simple'
                : 'world';
        this.#panel = document.querySelector('human-training-panel');
        this.#configModal = document.querySelector('human-training-config-modal');
        this.#panel.setMode(this.#mode);
        this.#initMode();
        this.#wirePanel();
        this.#initPauseToggleClicks();
        this.#initKeyboardManager();
        this.#configModal.setKeyboardManager(this.#keyboardManager);
        this.#openConfigModal('entry');
        window.addEventListener('beforeunload', () => this.#saveCar());
        this.animate(0);
    }
    #initMode() {
        if (this.#mode === 'world') {
            this.toolbarPanel.configureSelectors({
                carMode: 'single',
                onWorldSelected: (entry) => this.#initWorld(entry?.data ?? null),
            });
            const storeWorld = StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
            this.#initWorld(storeWorld ?? null);
        }
        else {
            this.toolbarPanel.hideGroups('world', 'borders', 'borders-sep');
            this.toolbarPanel.configureSelectors({ carMode: 'single' });
            this.toolbarPanel.hideCameraDebug();
            this.layoutToolbar.setDefaultLayoutMode('camera-big');
            const simpleWorld = new SimpleWorld(this.gameCanvas.width / 2, SIMPLE_MODE_CONFIG.simpleRoadWidth);
            this.world = simpleWorld;
            this.viewport = new Viewport(this.gameCanvas, 1, new Point(-simpleWorld.getCenter(), -100));
            this.viewport.setMode(this.toolbarPanel.viewportMode);
            this.miniMap = new MiniMap(this.miniMapCanvas, simpleWorld.graph, this.miniMapCanvas.width);
            const startInfo = this.getStartInfo();
            this.camera = new Camera(startInfo);
            this.#simpleState.traffic = generateInitialTraffic((lane) => simpleWorld.getLaneCenter(lane), startInfo.angle);
            this.updateRoadBorders();
            this.#snapCameraToStart();
        }
    }
    #initWorld(worldInfo) {
        this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
        this.viewport = new Viewport(this.gameCanvas, this.world.zoom ?? 1, this.world.offset ?? new Point(0, 0));
        this.viewport.setMode(this.toolbarPanel.viewportMode);
        this.miniMap = new MiniMap(this.miniMapCanvas, this.world.graph, this.miniMapCanvas.width);
        const startInfo = this.getStartInfo();
        this.camera = new Camera(startInfo);
        this.updateRoadBorders();
        this.#rebuildGrid();
        this.#snapCameraToStart();
    }
    #openConfigModal(context) {
        const savedInfo = safeJsonParse(localStorage.getItem('humanTrainedCar'));
        let defaults;
        if (this.#car) {
            defaults = this.#car.toInfo();
        }
        else if (savedInfo) {
            defaults = savedInfo;
        }
        else {
            defaults = {
                maxSpeed: DEFAULT_CAR_CONFIG.maxSpeed,
                acceleration: DEFAULT_CAR_CONFIG.acceleration,
                friction: DEFAULT_CAR_CONFIG.friction,
                width: DEFAULT_CAR_CONFIG.width,
                height: DEFAULT_CAR_CONFIG.height,
                hiddenLayers: DEFAULT_HIDDEN_LAYERS,
                sensor: {
                    rayCount: DEFAULT_CAR_CONFIG.sensor.rayCount,
                    rayLength: DEFAULT_CAR_CONFIG.sensor.rayLength,
                    raySpread: DEFAULT_CAR_CONFIG.sensor.raySpread,
                    rayOffset: DEFAULT_CAR_CONFIG.sensor.rayOffset,
                    stateAware: false,
                },
            };
        }
        this.#configModal.open({
            defaults,
            lockedToSavedBrain: false,
            onStart: (result) => this.#applyConfigAndCreateCar(result.carConfig, savedInfo),
            onCancel: () => this.#onConfigCancel(context),
        });
    }
    #applyConfigAndCreateCar(carConfig, savedInfo) {
        this.#carConfig = carConfig;
        this.#trainingFrames = 0;
        const startInfo = this.getStartInfo();
        const opts = {
            x: startInfo.x,
            y: startInfo.y,
            angle: startInfo.angle,
            controlType: 'KEYS',
            width: carConfig.width,
            height: carConfig.height,
            maxSpeed: carConfig.maxSpeed,
            acceleration: carConfig.acceleration,
            friction: carConfig.friction,
            hiddenLayers: carConfig.hiddenLayers,
            sensor: {
                rayCount: carConfig.sensor.rayCount,
                raySpread: carConfig.sensor.raySpread,
                rayLength: carConfig.sensor.rayLength,
                rayOffset: carConfig.sensor.rayOffset,
                stateAware: carConfig.sensor.stateAware ?? false,
            },
        };
        this.#car = new CarClass(opts);
        if (savedInfo) {
            const brainLoaded = this.#tryLoadBrain(savedInfo, carConfig);
            this.#panel.setStatus(brainLoaded
                ? 'Brain: loaded from save'
                : 'Brain: fresh (config changed, brain reset)');
        }
        else {
            this.#panel.setStatus('Brain: fresh');
        }
        this.#car.setLearningFromHuman(true);
        this.#car.setLearningRate(this.#panel.learningRate);
        this.#car.setCallbacks({ onDamaged: () => this.#onCrash() });
        this.#panel.setLearningState(true);
        this.#keyboardManager?.setToggleActive('keyLearn', true);
        this.#snapCameraToStart();
        this.animationLoopToolbar.setPaused(false);
    }
    #onConfigCancel(context) {
        if (context === 'entry' && !this.#car) {
            this.#applyConfigAndCreateCar(this.#defaultCarInfo(), null);
        }
    }
    #tryLoadBrain(savedInfo, config) {
        if (!savedInfo.brain)
            return false;
        const savedBrain = CarBrainAdapter.deserialize(savedInfo.brain);
        if (!savedBrain ||
            !CarBrainAdapter.brainsCompatible(savedBrain, config.sensor.rayCount, config.sensor.stateAware ?? false)) {
            return false;
        }
        this.#car.brain = savedBrain;
        const nn = savedBrain;
        this.#car.hiddenLayers = nn.levels
            .slice(0, -1)
            .map((l) => l.outputs.length);
        return true;
    }
    #defaultCarInfo() {
        return {
            maxSpeed: DEFAULT_CAR_CONFIG.maxSpeed,
            acceleration: DEFAULT_CAR_CONFIG.acceleration,
            friction: DEFAULT_CAR_CONFIG.friction,
            width: DEFAULT_CAR_CONFIG.width,
            height: DEFAULT_CAR_CONFIG.height,
            hiddenLayers: DEFAULT_HIDDEN_LAYERS,
            sensor: {
                rayCount: DEFAULT_CAR_CONFIG.sensor.rayCount,
                rayLength: DEFAULT_CAR_CONFIG.sensor.rayLength,
                raySpread: DEFAULT_CAR_CONFIG.sensor.raySpread,
                rayOffset: DEFAULT_CAR_CONFIG.sensor.rayOffset,
                stateAware: false,
            },
        };
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
        this.roadBorders = buildRoadBorders(this.world);
    }
    #rebuildGrid() {
        this.#borderGrid.build((this.roadBorders ?? []));
        if (this.world) {
            this.#trafficGrid.rebuild(buildTrafficControls(this.world));
        }
        else {
            this.#trafficGrid.rebuild([]);
        }
    }
    #snapCameraToStart() {
        if (this.camera) {
            this.camera.simpleMove(this.getStartInfo());
        }
    }
    update() {
        if (!this.#car || !this.world || !this.viewport || !this.roadBorders)
            return;
        if (this.#mode === 'simple') {
            const simpleWorld = this.world;
            updateSimpleTraffic(this.#simpleState, this.#car, simpleWorld, this.roadBorders, this.getStartInfo());
            updateSimpleCars([this.#car], this.#simpleState, this.roadBorders, false, this.#car, 0);
            this.viewport.offset.x = -simpleWorld.getCenter();
            this.viewport.offset.y = -this.#car.y;
        }
        else {
            const borders = queryBordersNearCar(this.#borderGrid, this.#car);
            const trafficControls = this.#car.sensor?.stateAware
                ? queryTrafficControlsNearCar(this.#trafficGrid, this.#car)
                : [];
            this.#car.update(borders, trafficControls, []);
            this.viewport.offset.x = -this.#car.x;
            this.viewport.offset.y = -this.#car.y;
        }
        if (this.camera) {
            this.camera.move(this.#car);
        }
        this.#updateAccuracy();
        if (this.#car.learningFromHuman &&
            !this.#car.autopilot &&
            !this.#car.damaged) {
            this.#trainingFrames++;
        }
        this.#panel.setSpeed(pxPerFrameToKmh(Math.abs(this.#car.speed)));
        this.#panel.setWeightChangePulse(this.#car.brainChangedThisFrame);
        this.#panel.setTrainingFrames(this.#trainingFrames);
        this.#brainInspectorCounter++;
        if (this.#brainInspectorCounter >= this.#BRAIN_INSPECTOR_INTERVAL) {
            this.#updateBrainInspector();
            this.#brainInspectorCounter = 0;
        }
        this.#autoSaveFrameCounter++;
        if (this.#autoSaveFrameCounter >= this.#AUTO_SAVE_INTERVAL) {
            this.#saveCar();
            this.#autoSaveFrameCounter = 0;
        }
    }
    #setLearning(enabled) {
        this.#car?.setLearningFromHuman(enabled);
        this.#panel.setLearningState(enabled);
    }
    #updateAccuracy() {
        if (!this.#car)
            return;
        if (this.#panel.autopilotEnabled || this.#car.damaged) {
            this.#currentMatch = [null, null, null, null];
            this.#panel.setAccuracy(this.#currentMatch, null);
            this.#panel.setPerChannelAccuracy([null, null, null, null]);
            this.#accuracyWindow = [];
            return;
        }
        const human = this.#car.controls;
        // Accuracy compares the brain's prediction against the keys you're actually
        // pressing. On idle frames (no keys held) there is nothing meaningful to
        // compare — the trained brain still "wants" to drive forward — so freeze the
        // display instead of feeding brain-vs-idle mismatches into the rolling
        // window (which would otherwise drag the number to 0% whenever you stop
        // driving, even with learning turned off).
        const driving = human.forward || human.left || human.right || human.reverse;
        if (!driving) {
            this.#currentMatch = [null, null, null, null];
            return;
        }
        const brain = this.#car.lastBrainOutput;
        const match = [
            brain.forward === human.forward,
            brain.left === human.left,
            brain.right === human.right,
            brain.reverse === human.reverse,
        ];
        this.#currentMatch = match;
        this.#accuracyWindow.push(match);
        if (this.#accuracyWindow.length > this.#ACCURACY_WINDOW_SIZE) {
            this.#accuracyWindow.shift();
        }
        let total = 0, matched = 0;
        const perChannelMatched = [0, 0, 0, 0];
        const perChannelTotal = [0, 0, 0, 0];
        for (const frame of this.#accuracyWindow) {
            for (let i = 0; i < 4; i++) {
                total++;
                perChannelTotal[i]++;
                if (frame[i]) {
                    matched++;
                    perChannelMatched[i]++;
                }
            }
        }
        const pct = total > 0 ? Math.round((100 * matched) / total) : null;
        this.#panel.setAccuracy(match, pct);
        const perChannel = perChannelTotal.map((t, i) => t > 0 ? Math.round((100 * perChannelMatched[i]) / t) : null);
        this.#panel.setPerChannelAccuracy(perChannel);
    }
    #updateBrainInspector() {
        if (!this.#car?.brain)
            return;
        const nn = this.#car
            .brain;
        let html = '';
        for (let i = 0; i < nn.levels.length; i++) {
            const level = nn.levels[i];
            html += '<div class="ht-brain-layer">';
            html += `<div class="ht-brain-layer-title">Layer ${i + 1}: ${level.inputs.length}\u2192${level.outputs.length}</div>`;
            html +=
                '<div class="ht-brain-row"><span class="ht-brain-label">biases:</span> ';
            html += level.biases
                .map((b) => `<span class="ht-brain-val ${b > 0 ? 'pos' : 'neg'}">${b.toFixed(2)}</span>`)
                .join(' ');
            html += '</div>';
            html +=
                '<div class="ht-brain-row"><span class="ht-brain-label">weights:</span></div>';
            html += '<div class="ht-brain-weights">';
            for (let j = 0; j < level.weights.length; j++) {
                html += '<div class="ht-brain-weight-row">';
                for (let k = 0; k < level.weights[j].length; k++) {
                    const w = level.weights[j][k];
                    html += `<span class="ht-brain-val ${w > 0 ? 'pos' : 'neg'}">${w.toFixed(2)}</span>`;
                }
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
        }
        this.#panel.setBrainInfo(html);
    }
    draw(time) {
        if (!this.#car || !this.world || !this.viewport || !this.roadBorders)
            return;
        this.resizeLayout();
        this.viewport.reset();
        if (this.#mode === 'world') {
            const viewPoint = scale(this.viewport.getOffset(), -1);
            this.world.draw(this.gameCtx, {
                viewPoint,
                showStartMarkings: false,
                layers: this.worldLayers,
            });
            this.viewport.drawScaleIndicator(this.gameCtx);
        }
        else {
            const simpleWorld = this.world;
            simpleWorld.draw(this.gameCtx, { viewPoint: new Point(0, 0) });
            this.viewport.drawScaleIndicator(this.gameCtx);
            const viewportTop = -this.viewport.offset.y -
                this.gameCanvas.height * 0.5 * this.viewport.zoom;
            const viewportBottom = -this.viewport.offset.y +
                this.gameCanvas.height * 0.5 * this.viewport.zoom;
            for (let i = 0; i < this.#simpleState.traffic.length; i++) {
                const car = this.#simpleState.traffic[i];
                if (car.y > viewportTop - 100 && car.y < viewportBottom + 100) {
                    car.draw(this.gameCtx, {});
                }
            }
        }
        this.#car.draw(this.gameCtx, { showSensor: true, showMask: true });
        this.drawNetworkVisualizer(time, this.#car.brain, this.#car.sensor?.stateAware, this.#currentMatch);
        if (this.miniMap) {
            const viewPoint = scale(this.viewport.getOffset(), -1);
            const floatingMiniMap = this.layoutToolbar.showMiniMap && !this.layoutToolbar.showVisualizer;
            this.miniMap.draw(floatingMiniMap
                ? {
                    viewPoint,
                    cars: [this.#car],
                    roadColor: '#BBB',
                    carColor: 'red',
                    backgroundColor: '#2a5',
                }
                : { viewPoint, cars: [this.#car] });
        }
        if (this.layoutToolbar.showCameraView && this.camera) {
            this.camera.render(this.cameraCtx, this.world, {
                keyCar: this.#car,
                bestCar: this.#car,
                cars: [this.#car],
                showTrees: this.worldLayers.trees,
                showBuildings: this.worldLayers.buildings,
                traffic: this.#mode === 'simple' ? this.#simpleState.traffic : undefined,
            });
        }
    }
    onPausedRender() {
        // No-op — keep the last visualizer frame
    }
    #regenTraffic() {
        if (this.#mode !== 'simple' || !this.world)
            return;
        const simpleWorld = this.world;
        const startInfo = this.getStartInfo();
        this.#simpleState.traffic = generateInitialTraffic((lane) => simpleWorld.getLaneCenter(lane), startInfo.angle);
        this.#simpleState.lastGeneratedTrafficY =
            SIMPLE_MODE_CONFIG.initialTrafficY;
    }
    #onCrash() {
        this.#saveCar();
        this.#car?.respawn(this.getStartInfo());
        if (this.#car && this.viewport) {
            this.viewport.offset.x = -this.#car.x;
            this.viewport.offset.y = -this.#car.y;
        }
        this.#regenTraffic();
        this.#accuracyWindow = [];
    }
    #saveCar() {
        if (!this.#car)
            return;
        localStorage.setItem('humanTrainedCar', JSON.stringify(this.#car.toInfo()));
    }
    #wirePanel() {
        const panel = this.#panel;
        panel.onAutopilotChange = (enabled) => {
            this.#car?.setAutopilot(enabled);
            this.#panel.setAutopilotActive(enabled);
            this.#accuracyWindow = [];
        };
        panel.onLearningRateChange = (v) => {
            this.#car?.setLearningRate(v);
        };
        panel.onConfig = () => {
            this.#openConfigModal('config');
        };
        panel.onDownload = () => {
            if (this.#car)
                downloadCarFiles([{ car: this.#car, poolPosition: 0 }]);
        };
        panel.onResetBrain = () => {
            this.#resetBrain();
        };
        panel.onResetCar = () => {
            this.#car?.respawn(this.getStartInfo());
            if (this.#car && this.viewport) {
                this.viewport.offset.x = -this.#car.x;
                this.viewport.offset.y = -this.#car.y;
            }
            this.#snapCameraToStart();
            this.#regenTraffic();
            this.#accuracyWindow = [];
            this.#trainingFrames = 0;
        };
    }
    #resetBrain() {
        localStorage.removeItem('humanTrainedCar');
        if (this.#car && this.#car.sensor) {
            this.#car.brain = CarBrainAdapter.createBrain([
                CarBrainAdapter.inputLayerSize(this.#car.sensor.rayCount, this.#car.sensor.stateAware),
                ...(this.#carConfig?.hiddenLayers ?? this.#car.hiddenLayers),
                NN_OUTPUT_COUNT,
            ]);
        }
        this.#car?.respawn(this.getStartInfo());
        if (this.#car && this.viewport) {
            this.viewport.offset.x = -this.#car.x;
            this.viewport.offset.y = -this.#car.y;
        }
        this.#regenTraffic();
        this.#panel.setStatus('Brain: fresh');
        this.#accuracyWindow = [];
        this.#trainingFrames = 0;
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
    #initKeyboardManager() {
        const toolbar = document.querySelector('shortcuts-toolbar');
        if (!toolbar)
            return;
        this.#keyboardManager = new KeyboardManager(toolbar);
        this.#keyboardManager.setBindings([
            {
                id: 'keyLearn',
                key: 'l',
                label: 'L',
                title: 'L \u2014 Toggle learning on/off (when off, driving does not train the brain)',
                group: 'Training',
                kind: 'toggle',
                latchOnly: true,
                toggle: {
                    onActivate: () => this.#setLearning(true),
                    onDeactivate: () => this.#setLearning(false),
                },
            },
            {
                id: 'keyUp',
                key: '',
                label: '\u2191 / W',
                title: 'Arrow Up / W \u2014 Accelerate (drive the car)',
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
}
