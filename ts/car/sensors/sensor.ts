import {
  SensorRaycaster,
  type IntersectionPoint,
} from '../physics/sensorRaycaster.js';
import type { Point } from '../../math/primitives/point.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';
import type { TrafficControlState } from '../../math/trafficControlGrid.js';
import { lerp } from '../../math/utils.js';
import { nearestEdgeOffset } from '../../math/collision.js';
import type { SensorReading } from './sensorReading.js';

export type { SensorReading } from './sensorReading.js';

export interface SensorTrafficControl {
  polygon: Point[];
  state: TrafficControlState;
}

const TRAFFIC_STATE_RED_THRESHOLD = 0.9;
const TRAFFIC_STATE_YELLOW_THRESHOLD = 0.4;
const BASIC_RAY_DOT_RADIUS = 3;
const TRAFFIC_RAY_DOT_RADIUS = 4;

export function encodeTrafficState(state: TrafficControlState | null): number {
  switch (state) {
    case 'red':
      return 1;
    case 'yellow':
      return 0.5;
    default:
      return 0;
  }
}

export class Sensor {
  rayCount: number;
  rayLength: number;
  raySpread: number;
  rayOffset: number;
  stateAware: boolean;

  rays: Point[][];
  readings: (IntersectionPoint | null)[];
  sensorReadings: (SensorReading | null)[];

  constructor(config?: {
    rayCount?: number;
    raySpread?: number;
    rayLength?: number;
    rayOffset?: number;
    stateAware?: boolean;
  }) {
    this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
    this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
    this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
    this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;
    this.stateAware = config?.stateAware ?? false;

    this.rays = [];
    this.readings = [];
    this.sensorReadings = [];
  }

  update(
    x: number,
    y: number,
    angle: number,
    borders: Point[][] = [],
    trafficControls?: SensorTrafficControl[],
    otherCars?: Point[][],
  ): void {
    this.rays = SensorRaycaster.castRays(
      x,
      y,
      angle,
      this.rayCount,
      this.rayLength,
      this.raySpread,
      this.rayOffset,
    );

    this.readings = SensorRaycaster.getReadings(this.rays, borders);

    if (this.stateAware) {
      this.sensorReadings = this.#getStateAwareReadings(
        this.rays,
        this.readings,
        trafficControls ?? [],
        otherCars ?? [],
      );
    } else {
      this.sensorReadings = new Array(this.rays.length).fill(null);
    }
  }

  #getStateAwareReadings(
    rays: Point[][],
    borderReadings: (IntersectionPoint | null)[],
    trafficControls: SensorTrafficControl[],
    otherCars: Point[][],
  ): (SensorReading | null)[] {
    return rays.map((ray, i) => {
      const borderHit = borderReadings[i];
      let minOffset = borderHit?.offset ?? Infinity;
      let state = 0;
      let type: SensorReading['type'] = 'border';
      let hitX = borderHit?.x ?? ray[1].x;
      let hitY = borderHit?.y ?? ray[1].y;

      for (let c = 0; c < otherCars.length; c++) {
        const offset = nearestEdgeOffset(ray, otherCars[c]);
        if (offset !== null && offset < minOffset) {
          minOffset = offset;
          state = 1;
          type = 'car';
          hitX = lerp(ray[0].x, ray[1].x, offset);
          hitY = lerp(ray[0].y, ray[1].y, offset);
        }
      }

      for (let c = 0; c < trafficControls.length; c++) {
        const tc = trafficControls[c];
        const offset = nearestEdgeOffset(ray, tc.polygon);
        if (offset !== null && offset < minOffset) {
          minOffset = offset;
          state = encodeTrafficState(tc.state);
          type = 'trafficControl';
          hitX = lerp(ray[0].x, ray[1].x, offset);
          hitY = lerp(ray[0].y, ray[1].y, offset);
        }
      }

      if (minOffset === Infinity) {
        return {
          distance: 1,
          state: 0,
          type: 'none',
          x: ray[1].x,
          y: ray[1].y,
        };
      }

      if (type === 'border') {
        state = 1;
      }

      return {
        distance: minOffset,
        state,
        type,
        x: hitX,
        y: hitY,
      };
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.stateAware) {
      this.#drawStateAware(ctx);
    } else {
      this.#drawBasic(ctx);
    }
  }

  #drawBasic(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.rays.length; i++) {
      const reading = this.readings[i];

      if (reading) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
        ctx.lineTo(reading.x, reading.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.arc(reading.x, reading.y, BASIC_RAY_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
        ctx.lineTo(this.rays[i][1].x, this.rays[i][1].y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  #drawStateAware(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.rays.length; i++) {
      const sr = this.sensorReadings[i];

      if (!sr || sr.type === 'none') {
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

      let rayColor: string;
      let dotRadius: number;

      switch (sr.type) {
        case 'border':
          rayColor = 'yellow';
          dotRadius = BASIC_RAY_DOT_RADIUS;
          break;
        case 'car':
          rayColor = '#F00';
          dotRadius = BASIC_RAY_DOT_RADIUS;
          break;
        case 'trafficControl':
          rayColor =
            sr.state >= TRAFFIC_STATE_RED_THRESHOLD
              ? '#F00'
              : sr.state >= TRAFFIC_STATE_YELLOW_THRESHOLD
                ? '#FF0'
                : '#0F0';
          dotRadius = TRAFFIC_RAY_DOT_RADIUS;
          break;
        default:
          rayColor = 'yellow';
          dotRadius = BASIC_RAY_DOT_RADIUS;
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rayColor;
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
      ctx.lineTo(sr.x, sr.y);
      ctx.stroke();

      if (sr.type === 'trafficControl') {
        ctx.beginPath();
        ctx.arc(sr.x, sr.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = rayColor;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.fillStyle = rayColor;
        ctx.arc(sr.x, sr.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // No continuation ray — the brain only sees the nearest obstacle.
    }
  }
}
