import {
  SensorRaycaster,
  type IntersectionPoint,
} from '../physics/sensorRaycaster.js';
import type { Point } from '../../math/primitives/point.js';
import { DEFAULT_CAR_CONFIG } from '../config.js';
import type { TrafficControlState } from '../../math/trafficControlGrid.js';
import { getIntersectionOffset, lerp } from '../../math/utils.js';

/**
 * A traffic control polygon paired with its current state, passed to the
 * sensor each frame so rays can detect lights ahead of the car.
 */
export interface SensorTrafficControl {
  polygon: Point[];
  state: TrafficControlState;
}

/**
 * Per-ray traffic-light detection result — the state plus the exact
 * intersection point on the light polygon. Used for both neural-network
 * inputs and sensor-ray rendering.
 */
export interface TrafficReading {
  state: TrafficControlState;
  offset: number;
  x: number;
  y: number;
}

/**
 * Encodes a traffic light state into the numeric input the neural network
 * consumes: `1` for green (go), `0.5` for yellow (caution), `0` for red/off
 * or "no light seen along this ray".
 */
export function encodeTrafficState(state: TrafficControlState | null): number {
  switch (state) {
    case 'green':
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
  trafficAwareness: boolean;

  rays: Point[][];
  readings: (IntersectionPoint | null)[];
  /**
   * Per-ray traffic-light detection result. `null` means no traffic control
   * was seen along that ray (or the sensor is not traffic-aware). Populated
   * only when `trafficAwareness` is true and traffic controls were supplied
   * to {@link update}.
   */
  trafficReadings: (TrafficReading | null)[];

  constructor(config?: {
    rayCount?: number;
    raySpread?: number;
    rayLength?: number;
    rayOffset?: number;
    trafficAwareness?: boolean;
  }) {
    this.rayCount = config?.rayCount ?? DEFAULT_CAR_CONFIG.sensor.rayCount;
    this.rayLength = config?.rayLength ?? DEFAULT_CAR_CONFIG.sensor.rayLength;
    this.raySpread = config?.raySpread ?? DEFAULT_CAR_CONFIG.sensor.raySpread;
    this.rayOffset = config?.rayOffset ?? DEFAULT_CAR_CONFIG.sensor.rayOffset;
    this.trafficAwareness = config?.trafficAwareness ?? false;

    this.rays = [];
    this.readings = [];
    this.trafficReadings = [];
  }

  update(
    x: number,
    y: number,
    angle: number,
    polygons: Point[][] = [],
    trafficControls?: SensorTrafficControl[],
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
    this.readings = SensorRaycaster.getReadings(this.rays, polygons);

    if (this.trafficAwareness && trafficControls && trafficControls.length) {
      this.trafficReadings = this.#getTrafficReadings(
        this.rays,
        this.readings,
        trafficControls,
      );
    } else {
      this.trafficReadings = new Array(this.rays.length).fill(null);
    }
  }

  /**
   * Per-ray traffic-state detection. For each ray we find the closest traffic
   * control polygon it intersects; if that hit is closer than the road-border
   * hit (i.e. the light is in front of the wall, not behind it) the car "sees"
   * that light's state. Otherwise the ray sees no light.
   */
  #getTrafficReadings(
    rays: Point[][],
    borderReadings: (IntersectionPoint | null)[],
    trafficControls: SensorTrafficControl[],
  ): (TrafficReading | null)[] {
    const result: (TrafficReading | null)[] = new Array(rays.length).fill(null);
    if (trafficControls.length === 0) return result;

    for (let i = 0; i < rays.length; i++) {
      const ray = rays[i];
      const borderOffset = borderReadings[i]?.offset ?? Infinity;
      let minOffset = Infinity;
      let minState: TrafficControlState | null = null;

      for (let c = 0; c < trafficControls.length; c++) {
        const poly = trafficControls[c].polygon;
        if (poly.length < 2) continue;

        const edgeCount = poly.length === 2 ? 1 : poly.length;
        for (let j = 0; j < edgeCount; j++) {
          const offset = getIntersectionOffset(
            ray[0],
            ray[1],
            poly[j],
            poly[(j + 1) % poly.length],
          );
          if (offset >= 0 && offset < minOffset && offset < borderOffset) {
            minOffset = offset;
            minState = trafficControls[c].state;
          }
        }
      }

      if (minState !== null) {
        result[i] = {
          state: minState,
          offset: minOffset,
          x: lerp(ray[0].x, ray[1].x, minOffset),
          y: lerp(ray[0].y, ray[1].y, minOffset),
        };
      }
    }
    return result;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.rays.length; i++) {
      const reading = this.readings[i];
      const traffic = this.trafficReadings[i];

      if (traffic) {
        const color =
          traffic.state === 'green'
            ? '#0F0'
            : traffic.state === 'yellow'
              ? '#FF0'
              : '#F00';

        // Colored ray from car to traffic light
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
        ctx.lineTo(traffic.x, traffic.y);
        ctx.stroke();

        // Continue ray from light to wall (yellow) if wall exists
        if (reading) {
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'yellow';
          ctx.moveTo(traffic.x, traffic.y);
          ctx.lineTo(reading.x, reading.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = 'yellow';
          ctx.arc(reading.x, reading.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Traffic dot with white border at the light intersection point
        ctx.beginPath();
        ctx.arc(traffic.x, traffic.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (reading) {
        // Standard wall-only ray (no traffic)
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
      } else {
        // Nothing hit — faint full-length ray
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
}
