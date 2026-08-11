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
import { CarLearningManager } from './brain/carLearningManager.js';
import {
  STEERING_SPEED,
  DEFAULT_CAR_CONFIG,
  NN_OUTPUT_COUNT,
  DEFAULT_HIDDEN_LAYERS,
  REALISTIC_STEER_RATE,
  type PhysicsModel,
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
  physicsModel?: PhysicsModel;
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
  physicsModel?: PhysicsModel;
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
  physicsModel: PhysicsModel;

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

  // Race-only fields, absent for training/traffic cars.
  finishTime?: number;
  progress?: number;

  physics: CarPhysics;
  renderer: CarRenderer;

  #callbacks?: CarCallbacks;

  #learningFromHuman: boolean = false;
  #autopilot: boolean = false;
  #learning: CarLearningManager = new CarLearningManager();

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
    this.physicsModel = opts.physicsModel ?? 'arcade';

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
    if (info.physicsModel) {
      this.physicsModel = info.physicsModel;
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
      physicsModel: this.physicsModel,
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

    const turnRate =
      this.physicsModel === 'realistic'
        ? REALISTIC_STEER_RATE * Math.abs(this.speed)
        : STEERING_SPEED;

    if (
      this.controls instanceof CameraControls ||
      (this.controls instanceof PhoneControls && this.controls.tilt !== 0)
    ) {
      this.angle -= this.controls.tilt * turnRate;
    } else {
      const flip = this.speed > 0 ? 1 : -1;
      if ((this.controls as Controls).left) {
        this.angle += turnRate * flip;
      }
      if ((this.controls as Controls).right) {
        this.angle -= turnRate * flip;
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
    this.#learning.resetFrame();
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
      this.#learning.setLastBrainOutput(output);
      if (this.controls instanceof Controls) {
        // Decide who drives the effective controls this frame.
        if (this.#autopilot) {
          // Autopilot: the brain drives, but a live human keypress is treated as
          // a DAgger correction — it overrides the brain (and, below, becomes a
          // training label) so the brain learns to recover from the states its
          // own driving produces (fixes behavioral-cloning covariate shift).
          const human = this.controls.humanControls;
          const correcting =
            human.forward || human.left || human.right || human.reverse;
          const source = correcting ? human : output;
          this.controls.forward = source.forward;
          this.controls.left = source.left;
          this.controls.right = source.right;
          this.controls.reverse = source.reverse;
        } else if (this.useBrain) {
          this.controls.forward = output.forward;
          this.controls.left = output.left;
          this.controls.right = output.right;
          this.controls.reverse = output.reverse;
        }

        // Imitation learning: mimic the human. In manual mode the effective
        // controls already hold the human's keys; in autopilot we learn only
        // while the human is actively correcting (never from the brain's own
        // autopilot output).
        if (this.#learningFromHuman && !this.damaged) {
          const label = this.#autopilot
            ? this.controls.humanControls
            : {
                forward: this.controls.forward,
                left: this.controls.left,
                right: this.controls.right,
                reverse: this.controls.reverse,
              };
          if (label.forward || label.left || label.right || label.reverse) {
            this.#learning.learn({
              brain: this.brain,
              inputs: this.#buildBrainInput(),
              controls: label,
            });
          }
        }
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

  #buildBrainInput(): number[] {
    return CarBrainAdapter.buildInput(
      this.sensor!.readings,
      this.speed,
      this.maxSpeed,
      this.sensor!.sensorReadings,
      this.sensor!.stateAware,
    );
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

  get autopilot(): boolean {
    return this.#autopilot;
  }

  set learningRate(v: number) {
    this.#learning.learningRate = v;
  }

  get learningRate(): number {
    return this.#learning.learningRate;
  }

  setLearningRate(v: number): void {
    this.#learning.setLearningRate(v);
  }

  get lastBrainOutput(): {
    forward: boolean;
    left: boolean;
    right: boolean;
    reverse: boolean;
  } {
    return this.#learning.lastBrainOutput;
  }

  get brainChangedThisFrame(): boolean {
    return this.#learning.brainChangedThisFrame;
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
