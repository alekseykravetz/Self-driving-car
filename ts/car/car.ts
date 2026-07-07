import { Sensor, type SensorTrafficControl } from './sensors/sensor.js';
import { Controls } from './controls/controls.js';
import { PhoneControls } from './controls/phoneControls.js';
import { CameraControls } from './controls/cameraControls.js';
import { CarPhysics } from './physics/carPhysics.js';
import { CarRenderer, type CarDrawOptions } from './rendering/carRenderer.js';
import { CarBrainAdapter, type Brain } from './brain/carBrainAdapter.js';
import { STEERING_SPEED, DEFAULT_CAR_CONFIG } from './config.js';
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
    trafficAwareness?: boolean;
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
    trafficAwareness?: boolean;
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
    this.hiddenLayers = opts.hiddenLayers ?? [6];

    this.useBrain = opts.controlType === 'AI';

    this.#callbacks = opts.callbacks;

    if (opts.controlType !== 'DUMMY') {
      this.sensor = new Sensor(opts.sensor);
      this.brain = CarBrainAdapter.createBrain([
        CarBrainAdapter.inputLayerSize(
          this.sensor.rayCount,
          this.sensor.trafficAwareness,
        ),
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

  static fromInfo(opts: CarOptions, info?: CarInfo | null): Car {
    const car = new Car(opts);
    if (info) {
      car.load(info);
    }
    return car;
  }

  load(info: CarInfo): void {
    if (info.brain) {
      this.brain = CarBrainAdapter.deserialize(info.brain);
    }
    if (info.hiddenLayers) {
      this.hiddenLayers = [...info.hiddenLayers];
    }
    this.maxSpeed = info.maxSpeed;
    this.friction = info.friction;
    this.acceleration = info.acceleration;
    if (info.width) this.width = info.width;
    if (info.height) this.height = info.height;
    if (this.sensor) {
      this.sensor.rayCount = info.sensor.rayCount;
      this.sensor.raySpread = info.sensor.raySpread;
      this.sensor.rayLength = info.sensor.rayLength;
      this.sensor.rayOffset = info.sensor.rayOffset;
      this.sensor.trafficAwareness = info.sensor.trafficAwareness ?? false;
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
        trafficAwareness: this.sensor?.trafficAwareness ?? false,
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
  ): void {
    this.#applySteering();

    const becameDamaged = this.physics.update(
      this,
      this.#computeControlsState(),
      polygons,
    );
    if (becameDamaged) {
      this.#callbacks?.onDamaged?.();
    }

    if (this.sensor && this.brain) {
      this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls);
      if (this.useBrain && this.controls instanceof Controls) {
        const output = CarBrainAdapter.computeControls(
          this.sensor.readings,
          this.speed,
          this.maxSpeed,
          this.brain,
          this.sensor.trafficAwareness
            ? this.sensor.trafficReadings
            : undefined,
        );
        this.controls.forward = output.forward;
        this.controls.left = output.left;
        this.controls.right = output.right;
        this.controls.reverse = output.reverse;
      }
    } else if (this.sensor) {
      this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls);
    }

    this.#syncEngine();
  }

  #syncEngine(): void {
    if (!this.#callbacks?.onEngineUpdate) return;
    this.#callbacks.onEngineUpdate(this.speed, this.maxSpeed);
  }

  draw(ctx: CanvasRenderingContext2D, options: CarDrawOptions = {}): void {
    this.renderer.draw(ctx, options);
  }

  setCallbacks(cb: CarCallbacks): void {
    this.#callbacks = cb;
  }
}
