import { Sensor, type SensorTrafficControl } from './sensors/sensor.js';
import { Controls } from './controls/controls.js';
import { PhoneControls } from './controls/phoneControls.js';
import { CameraControls } from './controls/cameraControls.js';
import { CarPhysics } from './physics/carPhysics.js';
import {
  CarRenderer,
  type CarDrawOptions,
  type CarDrawData,
} from './rendering/carRenderer.js';
import { CarBrainAdapter, type Brain } from './brain/carBrainAdapter.js';
import { NeuralNetwork } from '../neural-network/network.js';
import {
  STEERING_SPEED,
  DEFAULT_CAR_CONFIG,
  NN_OUTPUT_COUNT,
  DEFAULT_HIDDEN_LAYERS,
} from './config.js';
import type { Point } from '../math/primitives/point.js';
import type { ControlsState } from './carState.js';

export type CarControls = Controls | PhoneControls | CameraControls;

export interface CarInfo {
  brain?: unknown;
  maxSpeed: number;
  friction: number;
  acceleration: number;
  width: number;
  height: number;
  hiddenLayers?: number[];
  sensor: {
    rayCount: number;
    raySpread: number;
    rayLength: number;
    rayOffset: number;
    stateAware?: boolean;
  };
}

export interface CarOptions {
  x: number;
  y: number;
  controlType: string;
  width?: number;
  height?: number;
  angle?: number;
  maxSpeed?: number;
  acceleration?: number;
  friction?: number;
  color?: string;
  hiddenLayers?: number[];
  sensor?: {
    rayCount?: number;
    raySpread?: number;
    rayLength?: number;
    rayOffset?: number;
    stateAware?: boolean;
  };
  callbacks?: CarCallbacks;
}

export interface CarCallbacks {
  onDamaged?: () => void;
  onEngineUpdate?: (speed: number, maxSpeed: number) => void;
}

export class Car {
  name?: string;
  type: string;
  color: string;
  useBrain: boolean;
  hiddenLayers: number[];

  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  acceleration: number;
  maxSpeed: number;
  friction: number;
  angle: number;
  damaged: boolean;
  fitness: number;
  polygon: Point[];

  sensor?: Sensor;
  brain?: Brain;
  controls: CarControls;

  //todo: fix this
  finishTime?: number;
  progress?: number;

  physics: CarPhysics;
  renderer: CarRenderer;

  #callbacks?: CarCallbacks;

  #learningFromHuman: boolean = false;
  #autopilot: boolean = false;
  #learningRate: number = 0.1;
  #lastBrainOutput: {
    forward: boolean;
    left: boolean;
    right: boolean;
    reverse: boolean;
  } = {
    forward: false,
    left: false,
    right: false,
    reverse: false,
  };

  constructor(opts: CarOptions) {
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
        CarBrainAdapter.inputLayerSize(
          this.sensor.rayCount,
          this.sensor.stateAware,
        ),
        ...this.hiddenLayers,
        NN_OUTPUT_COUNT,
      ]);
    }
    this.controls = new Controls(opts.controlType);

    this.physics = new CarPhysics();
    this.renderer = new CarRenderer();

    this.polygon = this.physics.createPolygon(this);
  }

  static fromInfo(opts: CarOptions, info?: CarInfo | null): Car {
    const car = new Car(opts);
    if (info) {
      car.load(info);
    }
    return car;
  }

  load(info: CarInfo): void {
    if (info.brain) {
      try {
        const deserialized = CarBrainAdapter.deserialize(info.brain);
        if (deserialized) {
          this.brain = deserialized;
        }
      } catch {
        // Fall through — keep existing brain or create fresh below
      }
    }
    if (info.hiddenLayers) {
      this.hiddenLayers = [...info.hiddenLayers];
    }
    const dimsChanged =
      (info.width && info.width !== this.width) ||
      (info.height && info.height !== this.height);
    this.maxSpeed = info.maxSpeed;
    this.friction = info.friction;
    this.acceleration = info.acceleration;
    if (info.width) this.width = info.width;
    if (info.height) this.height = info.height;
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
          CarBrainAdapter.inputLayerSize(
            this.sensor.rayCount,
            this.sensor.stateAware,
          ),
          ...this.hiddenLayers,
          NN_OUTPUT_COUNT,
        ]);
      }
      if (
        this.brain &&
        !CarBrainAdapter.brainsCompatible(
          this.brain,
          this.sensor.rayCount,
          this.sensor.stateAware,
        )
      ) {
        this.brain = undefined;
      }
    }
  }

  toInfo(): CarInfo {
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
        raySpread:
          this.sensor?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread,
        rayLength:
          this.sensor?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength,
        rayOffset:
          this.sensor?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset,
        stateAware: this.sensor?.stateAware ?? false,
      },
    };
  }

  #applySteering(): void {
    if (this.speed === 0) return;

    if (
      this.controls instanceof CameraControls ||
      (this.controls instanceof PhoneControls && this.controls.tilt !== 0)
    ) {
      this.angle -= this.controls.tilt * STEERING_SPEED;
    } else {
      const flip = this.speed > 0 ? 1 : -1;
      if ((this.controls as Controls).left) {
        this.angle += STEERING_SPEED * flip;
      }
      if ((this.controls as Controls).right) {
        this.angle -= STEERING_SPEED * flip;
      }
    }
  }

  #computeControlsState(): ControlsState {
    return {
      forward: this.controls.forward,
      reverse: this.controls.reverse,
    };
  }

  update(
    polygons: Point[][] = [],
    trafficControls?: SensorTrafficControl[],
    otherCars?: Point[][],
  ): void {
    this.#processBrain(polygons, trafficControls, otherCars);
    this.#applySteering();

    const collisionPolygons =
      otherCars && otherCars.length > 0 ? polygons.concat(otherCars) : polygons;
    const becameDamaged = this.physics.update(
      this,
      this.#computeControlsState(),
      collisionPolygons,
    );
    if (becameDamaged) {
      this.#callbacks?.onDamaged?.();
    }

    this.#syncEngine();
  }

  #processBrain(
    polygons: Point[][],
    trafficControls?: SensorTrafficControl[],
    otherCars?: Point[][],
  ): void {
    if (this.sensor && this.brain) {
      this.sensor.update(
        this.x,
        this.y,
        this.angle,
        polygons,
        trafficControls,
        otherCars,
      );
      const output = CarBrainAdapter.computeControls(
        this.sensor.readings,
        this.speed,
        this.maxSpeed,
        this.brain,
        this.sensor.sensorReadings,
        this.sensor.stateAware,
      );
      this.#lastBrainOutput = output;
      if (
        (this.useBrain || this.#autopilot) &&
        this.controls instanceof Controls
      ) {
        this.controls.forward = output.forward;
        this.controls.left = output.left;
        this.controls.right = output.right;
        this.controls.reverse = output.reverse;
      }
      if (
        this.#learningFromHuman &&
        !this.#autopilot &&
        !this.damaged &&
        this.controls instanceof Controls &&
        (this.controls.forward ||
          this.controls.left ||
          this.controls.right ||
          this.controls.reverse)
      ) {
        NeuralNetwork.trainStep(
          this.brain as NeuralNetwork,
          [
            this.controls.forward ? 1 : 0,
            this.controls.left ? 1 : 0,
            this.controls.right ? 1 : 0,
            this.controls.reverse ? 1 : 0,
          ],
          this.#learningRate,
        );
      }
    } else if (this.sensor) {
      this.sensor.update(
        this.x,
        this.y,
        this.angle,
        polygons,
        trafficControls,
        otherCars,
      );
    }
  }

  #syncEngine(): void {
    if (!this.#callbacks?.onEngineUpdate) return;
    this.#callbacks.onEngineUpdate(this.speed, this.maxSpeed);
  }

  toDrawData(): CarDrawData {
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

  draw(ctx: CanvasRenderingContext2D, options: CarDrawOptions = {}): void {
    this.renderer.draw(ctx, this.toDrawData(), options);
  }

  setCallbacks(cb: CarCallbacks): void {
    this.#callbacks = cb;
  }

  setLearningFromHuman(enabled: boolean): void {
    this.#learningFromHuman = enabled;
  }

  get learningFromHuman(): boolean {
    return this.#learningFromHuman;
  }

  setAutopilot(enabled: boolean): void {
    this.#autopilot = enabled;
  }

  get autopilot(): boolean {
    return this.#autopilot;
  }

  set learningRate(v: number) {
    this.#learningRate = v;
  }

  get learningRate(): number {
    return this.#learningRate;
  }

  setLearningRate(v: number): void {
    this.#learningRate = v;
  }

  get lastBrainOutput(): {
    forward: boolean;
    left: boolean;
    right: boolean;
    reverse: boolean;
  } {
    return this.#lastBrainOutput;
  }

  respawn(startInfo: { x: number; y: number; angle: number }): void {
    this.x = startInfo.x;
    this.y = startInfo.y;
    this.angle = startInfo.angle;
    this.speed = 0;
    this.damaged = false;
    this.fitness = 0;
    this.polygon = this.physics.createPolygon(this);
  }
}
