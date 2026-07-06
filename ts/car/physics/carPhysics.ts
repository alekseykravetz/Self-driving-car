import { Car } from '../car.js';
import { Controls } from '../controls/controls.js';
import { CameraControls } from '../controls/cameraControls.js';
import { PhoneControls } from '../controls/phoneControls.js';
import { STEERING_SPEED, REVERSE_SPEED_RATIO } from '../config.js';
import { polysIntersect } from '../../utils.js';
import { Point } from '../../math/primitives/point.js';

export class CarPhysics {
  car: Car;

  constructor(car: Car) {
    this.car = car;
  }

  update(polygons: Point[][] = []): boolean {
    if (this.car.damaged) return false;

    this.move();
    this.car.fitness += this.car.speed;
    this.car.polygon = this.createPolygon();

    const becameDamaged = this.assessDamage(polygons);
    if (becameDamaged) {
      this.car.speed = 0;
      this.car.damaged = true;
    }
    return becameDamaged;
  }

  move(): void {
    if (this.car.controls.forward) {
      this.car.speed += this.car.acceleration;
    }
    if (this.car.controls.reverse) {
      this.car.speed -= this.car.acceleration;
    }

    if (this.car.speed > this.car.maxSpeed) {
      this.car.speed = this.car.maxSpeed;
    }
    if (this.car.speed < -this.car.maxSpeed * REVERSE_SPEED_RATIO) {
      this.car.speed = -this.car.maxSpeed * REVERSE_SPEED_RATIO;
    }

    if (this.car.speed > 0) {
      this.car.speed -= this.car.friction;
    }
    if (this.car.speed < 0) {
      this.car.speed += this.car.friction;
    }
    if (Math.abs(this.car.speed) < this.car.friction) {
      this.car.speed = 0;
    }

    if (this.car.speed !== 0) {
      if (
        (typeof CameraControls !== 'undefined' &&
          this.car.controls instanceof CameraControls) ||
        (typeof PhoneControls !== 'undefined' &&
          this.car.controls instanceof PhoneControls &&
          this.car.controls.tilt !== 0)
      ) {
        this.car.angle -= this.car.controls.tilt * STEERING_SPEED;
      } else {
        const flip = this.car.speed > 0 ? 1 : -1;
        if ((this.car.controls as Controls).left) {
          this.car.angle += STEERING_SPEED * flip;
        }
        if ((this.car.controls as Controls).right) {
          this.car.angle -= STEERING_SPEED * flip;
        }
      }
    }

    this.car.x -= Math.sin(this.car.angle) * this.car.speed;
    this.car.y -= Math.cos(this.car.angle) * this.car.speed;
  }

  createPolygon(): Point[] {
    const points: Point[] = [];
    const rad = Math.hypot(this.car.width, this.car.height) / 2;
    const alpha = Math.atan2(this.car.width, this.car.height);
    points.push({
      x: this.car.x - Math.sin(this.car.angle - alpha) * rad,
      y: this.car.y - Math.cos(this.car.angle - alpha) * rad,
    } as Point);
    points.push({
      x: this.car.x - Math.sin(this.car.angle + alpha) * rad,
      y: this.car.y - Math.cos(this.car.angle + alpha) * rad,
    } as Point);
    points.push({
      x: this.car.x - Math.sin(Math.PI + this.car.angle - alpha) * rad,
      y: this.car.y - Math.cos(Math.PI + this.car.angle - alpha) * rad,
    } as Point);
    points.push({
      x: this.car.x - Math.sin(Math.PI + this.car.angle + alpha) * rad,
      y: this.car.y - Math.cos(Math.PI + this.car.angle + alpha) * rad,
    } as Point);
    return points;
  }

  assessDamage(polygons: Point[][] = []): boolean {
    if (polygons.length === 0) return false;

    let carMinX = this.car.polygon[0].x;
    let carMaxX = this.car.polygon[0].x;
    let carMinY = this.car.polygon[0].y;
    let carMaxY = this.car.polygon[0].y;
    for (let i = 1; i < this.car.polygon.length; i++) {
      const p = this.car.polygon[i];
      if (p.x < carMinX) carMinX = p.x;
      else if (p.x > carMaxX) carMaxX = p.x;
      if (p.y < carMinY) carMinY = p.y;
      else if (p.y > carMaxY) carMaxY = p.y;
    }

    for (let i = 0; i < polygons.length; i++) {
      const poly = polygons[i];
      let oMinX = poly[0].x;
      let oMaxX = poly[0].x;
      let oMinY = poly[0].y;
      let oMaxY = poly[0].y;
      for (let j = 1; j < poly.length; j++) {
        const p = poly[j];
        if (p.x < oMinX) oMinX = p.x;
        else if (p.x > oMaxX) oMaxX = p.x;
        if (p.y < oMinY) oMinY = p.y;
        else if (p.y > oMaxY) oMaxY = p.y;
      }

      if (
        oMinX > carMaxX ||
        oMaxX < carMinX ||
        oMinY > carMaxY ||
        oMaxY < carMinY
      ) {
        continue;
      }

      if (polysIntersect(this.car.polygon, poly)) {
        return true;
      }
    }
    return false;
  }
}
