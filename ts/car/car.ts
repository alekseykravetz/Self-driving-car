import { NeuralNetwork } from '../neural-network/network.js';
import { Sensor } from './sensors/sensor.js';
import { Controls } from './controls/controls.js';
import { PhoneControls } from './controls/phoneControls.js';
import { CameraControls } from './controls/cameraControls.js';
import { CarPhysics } from './physics/carPhysics.js';
import { CarRenderer, CarDrawOptions } from './rendering/carRenderer.js';
import { CarBrainAdapter } from './brain/carBrainAdapter.js';
import { SoundEngine, explode } from '../audio/sound.js';
import { DEFAULT_CAR_CONFIG } from './config.js';
import { Point } from '../math/primitives/point.js';

export type CarControls = Controls | PhoneControls | CameraControls;

export interface CarInfo {
  brain?: NeuralNetwork;
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
  };
}

export class Car {
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  type: string; // controlType
  speed: number;
  acceleration: number;
  maxSpeed: number;
  friction: number;
  angle: number;
  damaged: boolean;
  fitness: number;
  useBrain: boolean;
  hiddenLayers: number[];
  sensor?: Sensor;
  brain?: NeuralNetwork;
  controls: CarControls;
  polygon: Point[];
  physics: CarPhysics;
  renderer: CarRenderer;
  engine?: SoundEngine;

  //todo: fix this
  finishTime?: number;
  progress?: number;

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

    if (opts.controlType !== 'DUMMY') {
      this.sensor = new Sensor(this, opts.sensor);
      this.brain = new NeuralNetwork([
        this.sensor.rayCount + 1,
        ...this.hiddenLayers,
        4,
      ]);
    }
    this.controls = new Controls(opts.controlType);

    this.physics = new CarPhysics(this);
    this.renderer = new CarRenderer(this);

    this.polygon = this.physics.createPolygon();
    this.update();
  }

  /**
   * Factory method to create a Car instance from initial options and persisted info.
   * Provides an explicit, deterministic way to rehydrate a car from saved state
   * without mutation. Prefer this over creating a car and then calling load().
   *
   * @param opts Initial car creation options (position, control type, etc.)
   * @param info Optional persisted car info to apply (brain, config, etc.)
   * @returns A new Car instance with persisted state applied
   */
  static fromInfo(opts: CarOptions, info?: CarInfo | null): Car {
    const car = new Car(opts);
    if (info) {
      car.load(info);
    }
    return car;
  }

  /**
   * Apply persisted car info to this instance (mutation-based).
   * For new code, prefer Car.fromInfo() which creates and loads in one step.
   * This method is kept for backward compatibility.
   */
  load(info: CarInfo): void {
    if (info.brain) {
      this.brain = NeuralNetwork.deserialize(info.brain);
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
    }
  }

  toInfo(): CarInfo {
    return {
      brain: this.brain ? NeuralNetwork.clone(this.brain) : undefined,
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
      },
    };
  }

  update(polygons: Point[][] = []): void {
    const becameDamaged = this.physics.update(polygons);
    if (becameDamaged && this.type === 'KEYS') {
      explode();
    }

    if (this.sensor && this.brain) {
      this.sensor.update(polygons);
      if (this.useBrain && this.controls instanceof Controls) {
        const output = CarBrainAdapter.computeControls(
          this.sensor.readings,
          this.speed,
          this.maxSpeed,
          this.brain,
        );
        this.controls.forward = output.forward;
        this.controls.left = output.left;
        this.controls.right = output.right;
        this.controls.reverse = output.reverse;
      }
    } else if (this.sensor) {
      // Keep the rays following the car (and reacting to borders) even when
      // there is no brain — e.g. the player's manually-driven car.
      this.sensor.update(polygons);
    }
    if (this.engine) {
      const percent = Math.abs(this.speed / this.maxSpeed);
      this.engine.setVolume(percent);
      this.engine.setPitch(percent);
    }
  }

  draw(ctx: CanvasRenderingContext2D, options: CarDrawOptions = {}): void {
    this.renderer.draw(ctx, options);
  }
}
