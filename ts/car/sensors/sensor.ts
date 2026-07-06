import { Car } from '../car.js';
import {
  SensorRaycaster,
  IntersectionPoint,
} from '../physics/sensorRaycaster.js';
import { Point } from '../../math/primitives/point.js';

export class Sensor {
  car: Car;
  rayCount: number;
  rayLength: number;
  raySpread: number;
  rayOffset: number;

  rays: Point[][];
  readings: (IntersectionPoint | null)[];

  constructor(
    car: Car,
    config?: {
      rayCount?: number;
      raySpread?: number;
      rayLength?: number;
      rayOffset?: number;
    },
  ) {
    this.car = car;
    this.rayCount = config?.rayCount ?? 5;
    this.rayLength = config?.rayLength ?? 150;
    this.raySpread = config?.raySpread ?? Math.PI / 2;
    this.rayOffset = config?.rayOffset ?? 0;

    this.rays = [];
    this.readings = [];
  }

  update(polygons: Point[][] = []): void {
    this.rays = SensorRaycaster.castRays(
      this.car.x,
      this.car.y,
      this.car.angle,
      this.rayCount,
      this.rayLength,
      this.raySpread,
      this.rayOffset,
    );
    this.readings = SensorRaycaster.getReadings(this.rays, polygons);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.rays.length; i++) {
      const reading = this.readings[i];

      if (!reading) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
        ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'yellow';
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
      ctx.lineTo(reading.x, reading.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = 'yellow';
      ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
