import { Sensor } from './sensors/sensor.js';
import { Controls } from './controls/controls.js';
import { PhoneControls } from './controls/phoneControls.js';
import { CameraControls } from './controls/cameraControls.js';
import { CarPhysics } from './physics/carPhysics.js';
import { CarRenderer, } from './rendering/carRenderer.js';
import { CarBrainAdapter } from './brain/carBrainAdapter.js';
import { NeuralNetwork } from '../neural-network/network.js';
import { STEERING_SPEED, DEFAULT_CAR_CONFIG, NN_OUTPUT_COUNT, DEFAULT_HIDDEN_LAYERS, } from './config.js';
export class Car {
    name;
    type;
    color;
    useBrain;
    hiddenLayers;
    x;
    y;
    width;
    height;
    speed;
    acceleration;
    maxSpeed;
    friction;
    angle;
    damaged;
    fitness;
    polygon;
    sensor;
    brain;
    controls;
    //todo: fix this
    finishTime;
    progress;
    physics;
    renderer;
    #callbacks;
    #learningFromHuman = false;
    #autopilot = false;
    #learningRate = 0.1;
    #lastBrainOutput = {
        forward: false,
        left: false,
        right: false,
        reverse: false,
    };
    #brainChangedThisFrame = false;
    #replayBuffer = [];
    #replayBufferMaxSize = 4096;
    #batchSize = 16;
    #prevControlState = null;
    constructor(opts) {
        this.x = opts.x;
        this.y = opts.y;
        this.width = opts.width ?? DEFAULT_CAR_CONFIG.width;
        this.height = opts.height ?? DEFAULT_CAR_CONFIG.height;
        this.color = opts.color ?? 'blue';
        this.type = opts.controlType;
        this.speed = 0;
        this.acceleration = opts.acceleration ?? DEFAULT_CAR_CONFIG.acceleration;
        this.maxSpeed = opts.maxSpeed ?? DEFAULT_CAR_CONFIG.maxSpeed;
        this.friction = opts.friction ?? DEFAULT_CAR_CONFIG.friction;
        this.angle = opts.angle ?? 0;
        this.damaged = false;
        this.fitness = 0;
        this.hiddenLayers = opts.hiddenLayers ?? DEFAULT_HIDDEN_LAYERS;
        this.useBrain = opts.controlType === 'AI';
        this.#callbacks = opts.callbacks;
        if (opts.controlType !== 'DUMMY') {
            this.sensor = new Sensor(opts.sensor);
            this.brain = CarBrainAdapter.createBrain([
                CarBrainAdapter.inputLayerSize(this.sensor.rayCount, this.sensor.stateAware),
                ...this.hiddenLayers,
                NN_OUTPUT_COUNT,
            ]);
        }
        this.controls = new Controls(opts.controlType);
        this.physics = new CarPhysics();
        this.renderer = new CarRenderer();
        this.polygon = this.physics.createPolygon(this);
    }
    static fromInfo(opts, info) {
        const car = new Car(opts);
        if (info) {
            car.load(info);
        }
        return car;
    }
    load(info) {
        if (info.brain) {
            try {
                const deserialized = CarBrainAdapter.deserialize(info.brain);
                if (deserialized) {
                    this.brain = deserialized;
                }
            }
            catch {
                // Fall through — keep existing brain or create fresh below
            }
        }
        if (info.hiddenLayers) {
            this.hiddenLayers = [...info.hiddenLayers];
        }
        const dimsChanged = (info.width && info.width !== this.width) ||
            (info.height && info.height !== this.height);
        this.maxSpeed = info.maxSpeed;
        this.friction = info.friction;
        this.acceleration = info.acceleration;
        if (info.width)
            this.width = info.width;
        if (info.height)
            this.height = info.height;
        if (dimsChanged) {
            this.polygon = this.physics.createPolygon(this);
        }
        if (this.sensor) {
            this.sensor.rayCount = info.sensor.rayCount;
            this.sensor.raySpread = info.sensor.raySpread;
            this.sensor.rayLength = info.sensor.rayLength;
            this.sensor.rayOffset = info.sensor.rayOffset;
            this.sensor.stateAware = info.sensor.stateAware ?? false;
            if (!info.brain && this.useBrain) {
                this.brain = CarBrainAdapter.createBrain([
                    CarBrainAdapter.inputLayerSize(this.sensor.rayCount, this.sensor.stateAware),
                    ...this.hiddenLayers,
                    NN_OUTPUT_COUNT,
                ]);
            }
            if (this.brain &&
                !CarBrainAdapter.brainsCompatible(this.brain, this.sensor.rayCount, this.sensor.stateAware)) {
                this.brain = undefined;
            }
        }
    }
    toInfo() {
        return {
            brain: this.brain ? CarBrainAdapter.serialize(this.brain) : undefined,
            maxSpeed: this.maxSpeed,
            friction: this.friction,
            acceleration: this.acceleration,
            width: this.width,
            height: this.height,
            hiddenLayers: [...this.hiddenLayers],
            sensor: {
                rayCount: this.sensor?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount,
                raySpread: this.sensor?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread,
                rayLength: this.sensor?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength,
                rayOffset: this.sensor?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset,
                stateAware: this.sensor?.stateAware ?? false,
            },
        };
    }
    #applySteering() {
        if (this.speed === 0)
            return;
        if (this.controls instanceof CameraControls ||
            (this.controls instanceof PhoneControls && this.controls.tilt !== 0)) {
            this.angle -= this.controls.tilt * STEERING_SPEED;
        }
        else {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += STEERING_SPEED * flip;
            }
            if (this.controls.right) {
                this.angle -= STEERING_SPEED * flip;
            }
        }
    }
    #computeControlsState() {
        return {
            forward: this.controls.forward,
            reverse: this.controls.reverse,
        };
    }
    update(polygons = [], trafficControls, otherCars) {
        this.#processBrain(polygons, trafficControls, otherCars);
        this.#applySteering();
        const collisionPolygons = otherCars && otherCars.length > 0 ? polygons.concat(otherCars) : polygons;
        const becameDamaged = this.physics.update(this, this.#computeControlsState(), collisionPolygons);
        if (becameDamaged) {
            this.#callbacks?.onDamaged?.();
        }
        this.#syncEngine();
    }
    #processBrain(polygons, trafficControls, otherCars) {
        this.#brainChangedThisFrame = false;
        if (this.sensor && this.brain) {
            this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls, otherCars);
            const output = CarBrainAdapter.computeControls(this.sensor.readings, this.speed, this.maxSpeed, this.brain, this.sensor.sensorReadings, this.sensor.stateAware);
            this.#lastBrainOutput = output;
            if ((this.useBrain || this.#autopilot) &&
                this.controls instanceof Controls) {
                this.controls.forward = output.forward;
                this.controls.left = output.left;
                this.controls.right = output.right;
                this.controls.reverse = output.reverse;
            }
            if (this.#learningFromHuman &&
                !this.#autopilot &&
                !this.damaged &&
                this.controls instanceof Controls &&
                (this.controls.forward ||
                    this.controls.left ||
                    this.controls.right ||
                    this.controls.reverse)) {
                const inputVector = CarBrainAdapter.buildInput(this.sensor.readings, this.speed, this.maxSpeed, this.sensor.sensorReadings, this.sensor.stateAware);
                const targets = [
                    this.controls.forward ? 1 : 0,
                    this.controls.left ? 1 : 0,
                    this.controls.right ? 1 : 0,
                    this.controls.reverse ? 1 : 0,
                ];
                const prev = this.#prevControlState;
                const isDecisionPoint = prev !== null &&
                    (targets[0] !== (prev.forward ? 1 : 0) ||
                        targets[1] !== (prev.left ? 1 : 0) ||
                        targets[2] !== (prev.right ? 1 : 0) ||
                        targets[3] !== (prev.reverse ? 1 : 0));
                this.#prevControlState = {
                    forward: this.controls.forward,
                    left: this.controls.left,
                    right: this.controls.right,
                    reverse: this.controls.reverse,
                };
                const isTurn = targets[1] === 1 || targets[2] === 1;
                this.#replayBuffer.push({ inputs: inputVector, targets, isTurn });
                if (this.#replayBuffer.length > this.#replayBufferMaxSize) {
                    this.#replayBuffer.shift();
                }
                // Per-output learning rates. Turn channels (left/right) are rare
                // relative to forward, so give them a boost even though the replay
                // batch is class-balanced. No division by batch size — each replay
                // sample is a full SGD step.
                const lr = this.#learningRate;
                const perOutputLR = [
                    lr,
                    lr * 1.5,
                    lr * 1.5,
                    lr,
                ];
                this.#brainChangedThisFrame = this.#trainBatch(perOutputLR);
                if (isDecisionPoint) {
                    const brain = this.brain;
                    for (let i = 0; i < 3; i++) {
                        if (NeuralNetwork.trainStep(brain, inputVector, targets, perOutputLR)) {
                            this.#brainChangedThisFrame = true;
                        }
                    }
                }
            }
        }
        else if (this.sensor) {
            this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls, otherCars);
        }
    }
    #trainBatch(lr) {
        const buffer = this.#replayBuffer;
        const brain = this.brain;
        const bufferLen = buffer.length;
        let changed = false;
        if (bufferLen < this.#batchSize) {
            for (let i = 0; i < bufferLen; i++) {
                if (NeuralNetwork.trainStep(brain, buffer[i].inputs, buffer[i].targets, lr)) {
                    changed = true;
                }
            }
            return changed;
        }
        const turnIdx = [];
        const straightIdx = [];
        for (let i = 0; i < bufferLen; i++) {
            if (buffer[i].isTurn)
                turnIdx.push(i);
            else
                straightIdx.push(i);
        }
        const halfBatch = this.#batchSize >> 1;
        const selected = [];
        for (let i = 0; i < halfBatch && turnIdx.length > 0; i++) {
            selected.push(turnIdx.splice(Math.floor(Math.random() * turnIdx.length), 1)[0]);
        }
        for (let i = selected.length; i < this.#batchSize && straightIdx.length > 0; i++) {
            selected.push(straightIdx.splice(Math.floor(Math.random() * straightIdx.length), 1)[0]);
        }
        while (selected.length < this.#batchSize) {
            const idx = Math.floor(Math.random() * bufferLen);
            if (!selected.includes(idx))
                selected.push(idx);
        }
        for (let i = selected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = selected[i];
            selected[i] = selected[j];
            selected[j] = tmp;
        }
        for (const idx of selected) {
            if (NeuralNetwork.trainStep(brain, buffer[idx].inputs, buffer[idx].targets, lr)) {
                changed = true;
            }
        }
        return changed;
    }
    #syncEngine() {
        if (!this.#callbacks?.onEngineUpdate)
            return;
        this.#callbacks.onEngineUpdate(this.speed, this.maxSpeed);
    }
    toDrawData() {
        return {
            polygon: this.polygon,
            damaged: this.damaged,
            color: this.color,
            name: this.name,
            sensor: this.sensor,
            x: this.x,
            y: this.y,
            angle: this.angle,
            width: this.width,
            height: this.height,
        };
    }
    draw(ctx, options = {}) {
        this.renderer.draw(ctx, this.toDrawData(), options);
    }
    setCallbacks(cb) {
        this.#callbacks = cb;
    }
    setLearningFromHuman(enabled) {
        this.#learningFromHuman = enabled;
    }
    get learningFromHuman() {
        return this.#learningFromHuman;
    }
    setAutopilot(enabled) {
        this.#autopilot = enabled;
        if (this.controls instanceof Controls) {
            this.controls.frozen = enabled;
            if (!enabled) {
                this.controls.forward = false;
                this.controls.left = false;
                this.controls.right = false;
                this.controls.reverse = false;
            }
        }
    }
    get autopilot() {
        return this.#autopilot;
    }
    set learningRate(v) {
        this.#learningRate = v;
    }
    get learningRate() {
        return this.#learningRate;
    }
    setLearningRate(v) {
        this.#learningRate = v;
    }
    get lastBrainOutput() {
        return this.#lastBrainOutput;
    }
    get brainChangedThisFrame() {
        return this.#brainChangedThisFrame;
    }
    respawn(startInfo) {
        this.x = startInfo.x;
        this.y = startInfo.y;
        this.angle = startInfo.angle;
        this.speed = 0;
        this.damaged = false;
        this.fitness = 0;
        this.polygon = this.physics.createPolygon(this);
    }
}
