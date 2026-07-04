'use strict';
class Car {
  name;
  x;
  y;
  width;
  height;
  color;
  type; // controlType
  speed;
  acceleration;
  maxSpeed;
  friction;
  angle;
  damaged;
  fitness;
  useBrain;
  hiddenLayers;
  sensor;
  brain;
  controls;
  polygon;
  physics;
  renderer;
  engine;
  //todo: fix this
  finishTime;
  progress;
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
  static fromInfo(opts, info) {
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
  load(info) {
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

  toInfo() {
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

  update(polygons = []) {
    const becameDamaged = this.physics.update(polygons);
    if (becameDamaged && this.type === 'KEYS') {
      explode();
    }
    if (this.sensor && this.brain) {
      this.sensor.update(polygons);
      const offsets = this.sensor.readings
        .map((s) => (s === null ? 0 : 1 - s.offset))
        .concat([this.speed / this.maxSpeed]);
      const outputs = NeuralNetwork.feedForward(offsets, this.brain);
      if (this.useBrain && this.controls instanceof Controls) {
        this.controls.forward = !!outputs[0];
        this.controls.left = !!outputs[1];
        this.controls.right = !!outputs[2];
        this.controls.reverse = !!outputs[3];
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

  draw(ctx, options = {}) {
    this.renderer.draw(ctx, options);
  }
}
