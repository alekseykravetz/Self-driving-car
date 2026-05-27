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
  sensor;
  brain;
  controls;
  image;
  mask;
  polygon;
  engine;
  //todo: fix this
  finishTime;
  progress;
  constructor(
    x,
    y,
    width,
    height,
    controlType,
    angle = 0,
    maxSpeed = 3,
    color = 'blue',
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.type = controlType;
    this.speed = 0;
    this.acceleration = 0.2;
    this.maxSpeed = maxSpeed;
    this.friction = 0.05;
    this.angle = angle;
    this.damaged = false;
    this.fitness = 0;
    this.useBrain = controlType === 'AI';
    if (controlType !== 'DUMMY') {
      this.sensor = new Sensor(this);
      this.brain = new NeuralNetwork([this.sensor.rayCount + 1, 6, 4]);
    }
    this.controls = new Controls(controlType);
    this.image = new Image();
    this.image.src = '/assets/car.png';
    this.mask = document.createElement('canvas');
    this.mask.width = width;
    this.mask.height = height;
    const maskCtx = this.mask.getContext('2d');
    this.image.onload = () => {
      maskCtx.fillStyle = this.color;
      maskCtx.rect(0, 0, this.width, this.height);
      maskCtx.fill();
      maskCtx.globalCompositeOperation = 'destination-atop';
      maskCtx.drawImage(this.image, 0, 0, this.width, this.height);
    };
    this.polygon = this.#createPolygon();
    this.update();
  }

  load(info) {
    if (info.brain) {
      this.brain = info.brain;
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
      brain: this.brain ? JSON.parse(JSON.stringify(this.brain)) : undefined,
      maxSpeed: this.maxSpeed,
      friction: this.friction,
      acceleration: this.acceleration,
      width: this.width,
      height: this.height,
      sensor: {
        rayCount: this.sensor?.rayCount ?? 5,
        raySpread: this.sensor?.raySpread ?? Math.PI / 2,
        rayLength: this.sensor?.rayLength ?? 150,
        rayOffset: this.sensor?.rayOffset ?? 0,
      },
    };
  }

  update(polygons = []) {
    if (!this.damaged) {
      this.#move();
      this.fitness += this.speed;
      this.polygon = this.#createPolygon();
      this.damaged = this.#assessDamage(polygons);
      if (this.damaged) {
        this.speed = 0;
        if (this.type === 'KEYS') {
          explode();
        }
      }
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
    }
    if (this.engine) {
      const percent = Math.abs(this.speed / this.maxSpeed);
      this.engine.setVolume(percent);
      this.engine.setPitch(percent);
    }
  }

  #assessDamage(polygons) {
    for (let i = 0; i < polygons.length; i++) {
      if (polysIntersect(this.polygon, polygons[i])) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });
    return points;
  }

  #move() {
    if (this.controls.forward) {
      this.speed += this.acceleration;
    }
    if (this.controls.reverse) {
      this.speed -= this.acceleration;
    }
    if (this.speed > this.maxSpeed) {
      this.speed = this.maxSpeed;
    }
    // Ensure maxSpeed/2 comparison is intended
    if (this.speed < -this.maxSpeed / 2) {
      this.speed = -this.maxSpeed / 2;
    }
    if (this.speed > 0) {
      this.speed -= this.friction;
    }
    if (this.speed < 0) {
      this.speed += this.friction;
    }
    if (Math.abs(this.speed) < this.friction) {
      this.speed = 0;
    }
    if (this.speed !== 0) {
      // Check for tilt control specifically if it exists
      if (
        (typeof CameraControls !== 'undefined' &&
          this.controls instanceof CameraControls) ||
        (typeof PhoneControls !== 'undefined' &&
          this.controls instanceof PhoneControls &&
          this.controls.tilt !== 0)
      ) {
        this.angle -= this.controls.tilt * 0.03;
      } else {
        const flip = this.speed > 0 ? 1 : -1;
        if (this.controls.left) {
          this.angle += 0.03 * flip;
        }
        if (this.controls.right) {
          this.angle -= 0.03 * flip;
        }
      }
    }
    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx, drawSensor = false, drawMask = true) {
    if (this.sensor && drawSensor) {
      this.sensor.draw(ctx);
    }
    if (drawMask) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(-this.angle);
      if (!this.damaged) {
        ctx.drawImage(
          this.mask,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height,
        );
        ctx.globalCompositeOperation = 'multiply';
      }
      ctx.drawImage(
        this.image,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height,
      );
      ctx.restore(); // Restores composite operation and transform
    } else {
      if (this.damaged) {
        ctx.fillStyle = 'gray';
      } else {
        ctx.fillStyle = this.color;
      }
      ctx.beginPath();
      ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
      for (let i = 1; i < this.polygon.length; i++) {
        ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
      }
      ctx.fill();
    }
  }
}
