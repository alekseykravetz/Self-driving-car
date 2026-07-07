import { Sensor } from './sensors/sensor.js';
import { Controls } from './controls/controls.js';
import { PhoneControls } from './controls/phoneControls.js';
import { CameraControls } from './controls/cameraControls.js';
import { CarPhysics } from './physics/carPhysics.js';
import { CarRenderer } from './rendering/carRenderer.js';
import { CarBrainAdapter } from './brain/carBrainAdapter.js';
import { NeuralNetwork } from '../neural-network/network.js';
import { STEERING_SPEED, DEFAULT_CAR_CONFIG } from './config.js';
// Online imitation-learning rate for the KEYS car (human-in-the-loop training).
// Per-frame perceptron-style update via the straight-through estimator; see
// NeuralNetwork.trainStep. Tuned for a typical generation length — raise to
// converge faster (risk of oscillation), lower for smoother learning.
const KEYS_LEARNING_RATE = 0.1;
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
    // When true (KEYS car only), the brain is trained online each frame to
    // imitate the human's keypresses via NeuralNetwork.trainStep. The forward
    // pass already runs in the KEYS branch to drive the network visualizer, so
    // training piggybacks on the freshly-populated level state at no extra cost.
    #learningFromHuman = false;
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
        this.hiddenLayers = opts.hiddenLayers ?? [6];
        this.useBrain = opts.controlType === 'AI';
        this.#callbacks = opts.callbacks;
        if (opts.controlType !== 'DUMMY') {
            this.sensor = new Sensor(opts.sensor);
            this.brain = CarBrainAdapter.createBrain([
                CarBrainAdapter.inputLayerSize(this.sensor.rayCount, this.sensor.trafficAwareness),
                ...this.hiddenLayers,
                4,
            ]);
        }
        this.controls = new Controls(opts.controlType);
        this.physics = new CarPhysics();
        this.renderer = new CarRenderer(this);
        this.polygon = this.physics.createPolygon(this);
        this.update();
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
            this.brain = CarBrainAdapter.deserialize(info.brain);
        }
        if (info.hiddenLayers) {
            this.hiddenLayers = [...info.hiddenLayers];
        }
        this.maxSpeed = info.maxSpeed;
        this.friction = info.friction;
        this.acceleration = info.acceleration;
        if (info.width)
            this.width = info.width;
        if (info.height)
            this.height = info.height;
        if (this.sensor) {
            this.sensor.rayCount = info.sensor.rayCount;
            this.sensor.raySpread = info.sensor.raySpread;
            this.sensor.rayLength = info.sensor.rayLength;
            this.sensor.rayOffset = info.sensor.rayOffset;
            this.sensor.trafficAwareness = info.sensor.trafficAwareness ?? false;
            // If no brain was supplied but the sensor topology changed (e.g. a
            // .car file with trafficAwareness:true and no brain), rebuild the
            // brain so its input layer matches the sensor.
            if (!info.brain && this.useBrain) {
                this.brain = CarBrainAdapter.createBrain([
                    CarBrainAdapter.inputLayerSize(this.sensor.rayCount, this.sensor.trafficAwareness),
                    ...this.hiddenLayers,
                    4,
                ]);
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
                trafficAwareness: this.sensor?.trafficAwareness ?? false,
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
    update(polygons = [], trafficControls) {
        this.#applySteering();
        const becameDamaged = this.physics.update(this, this.#computeControlsState(), polygons);
        if (becameDamaged) {
            this.#callbacks?.onDamaged?.();
        }
        if (this.sensor && this.brain) {
            this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls);
            if (this.useBrain && this.controls instanceof Controls) {
                const output = CarBrainAdapter.computeControls(this.sensor.readings, this.speed, this.maxSpeed, this.brain, this.sensor.trafficAwareness
                    ? this.sensor.trafficReadings
                    : undefined);
                this.controls.forward = output.forward;
                this.controls.left = output.left;
                this.controls.right = output.right;
                this.controls.reverse = output.reverse;
            }
            else {
                // Not brain-driven (e.g. the KEYS car), but a brain exists for the
                // visualizer. Feed it with the live sensor readings so the network
                // panel shows real activations instead of stale/undefined values.
                CarBrainAdapter.computeControls(this.sensor.readings, this.speed, this.maxSpeed, this.brain, this.sensor.trafficAwareness
                    ? this.sensor.trafficReadings
                    : undefined);
                // Online imitation learning: nudge the KEYS brain toward the human's
                // actual keypresses so its weights encode demonstrated driving. The
                // forward pass above already populated each level's inputs/outputs,
                // so trainStep can read them directly. Skip when damaged (don't learn
                // crashes) or when no keys are pressed (no lesson to teach — and
                // critically, this prevents the "release keys to click Next Gen"
                // frames from overwriting everything you taught via recency bias).
                if (this.#learningFromHuman &&
                    !this.damaged &&
                    this.controls instanceof Controls &&
                    (this.controls.forward ||
                        this.controls.left ||
                        this.controls.right ||
                        this.controls.reverse)) {
                    NeuralNetwork.trainStep(this.brain, [
                        this.controls.forward ? 1 : 0,
                        this.controls.left ? 1 : 0,
                        this.controls.right ? 1 : 0,
                        this.controls.reverse ? 1 : 0,
                    ], KEYS_LEARNING_RATE);
                }
            }
        }
        else if (this.sensor) {
            this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls);
        }
        this.#syncEngine();
    }
    #syncEngine() {
        if (!this.#callbacks?.onEngineUpdate)
            return;
        this.#callbacks.onEngineUpdate(this.speed, this.maxSpeed);
    }
    draw(ctx, options = {}) {
        this.renderer.draw(ctx, options);
    }
    setCallbacks(cb) {
        this.#callbacks = cb;
    }
    /** Enable/disable online imitation learning (KEYS car only). */
    setLearningFromHuman(enabled) {
        this.#learningFromHuman = enabled;
    }
    get learningFromHuman() {
        return this.#learningFromHuman;
    }
}
