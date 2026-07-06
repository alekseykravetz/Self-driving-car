import {
  SensorRaycaster,
  type IntersectionPoint,
} from '../physics/sensorRaycaster.js';
import type { Point } from '../../math/primitives/point.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';

export class Sensor {
  rayCount: number;
  rayLength: number;
  raySpread: number;
  rayOffset: number;

  rays: Point[][];
  readings: (IntersectionPoint | null)[];

  constructor(config?: {
    rayCount?: number;
    raySpread?: number;
    rayLength?: number;
    rayOffset?: number;
  }) {
    this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
    this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
    this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
    this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;

    this.rays = [];
    this.readings = [];
  }

  update(x: number, y: number, angle: number, polygons: Point[][] = []): void {
    this.rays = SensorRaycaster.castRays(
      x,
      y,
      angle,
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
