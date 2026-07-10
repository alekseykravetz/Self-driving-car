import { Point } from '../../math/primitives/point.js';
import { lerp, getIntersectionOffset } from '../../math/utils.js';
import type { TrafficControlState } from '../../math/trafficControlGrid.js';

export interface IntersectionPoint extends Point {
  offset: number;
}

export interface TaggedHit {
  offset: number;
  x: number;
  y: number;
  type: 'border' | 'car' | 'trafficControl';
  controlState?: TrafficControlState;
}

export class SensorRaycaster {
  static castRays(
    carX: number,
    carY: number,
    carAngle: number,
    rayCount: number,
    rayLength: number,
    raySpread: number,
    rayOffset: number,
  ): Point[][] {
    const rays: Point[][] = [];
    for (let i = 0; i < rayCount; i++) {
      const rayAngle =
        lerp(
          raySpread / 2,
          -raySpread / 2,
          rayCount === 1 ? 0.5 : i / (rayCount - 1),
        ) +
        carAngle +
        rayOffset;

      const start: Point = { x: carX, y: carY } as Point;
      const end: Point = {
        x: carX - Math.sin(rayAngle) * rayLength,
        y: carY - Math.cos(rayAngle) * rayLength,
      } as Point;

      rays.push([start, end]);
    }
    return rays;
  }

  static getReadings(
    rays: Point[][],
    polygons: Point[][],
  ): (IntersectionPoint | null)[] {
    const readings: (IntersectionPoint | null)[] = [];
    for (let i = 0; i < rays.length; i++) {
      readings.push(this.getReading(rays[i], polygons));
    }
    return readings;
  }

  static getReading(
    ray: Point[],
    polygons: Point[][],
  ): IntersectionPoint | null {
    let minOffset = Infinity;
    for (let i = 0; i < polygons.length; i++) {
      const offset = this.#nearestEdgeOffset(ray, polygons[i]);
      if (offset !== null && offset < minOffset) {
        minOffset = offset;
      }
    }
    if (minOffset === Infinity) return null;
    return {
      x: lerp(ray[0].x, ray[1].x, minOffset),
      y: lerp(ray[0].y, ray[1].y, minOffset),
      offset: minOffset,
    } as IntersectionPoint;
  }

  static getTaggedReadings(
    rays: Point[][],
    borders: Point[][],
    carPolys: Point[][],
    controls: { polygon: Point[]; state: TrafficControlState }[],
  ): (TaggedHit | null)[] {
    return rays.map((ray) => {
      let minOffset = Infinity;
      let minHit: TaggedHit | null = null;

      for (let i = 0; i < borders.length; i++) {
        const offset = this.#nearestEdgeOffset(ray, borders[i]);
        if (offset !== null && offset < minOffset) {
          minOffset = offset;
          minHit = {
            offset,
            x: lerp(ray[0].x, ray[1].x, offset),
            y: lerp(ray[0].y, ray[1].y, offset),
            type: 'border',
          };
        }
      }

      for (let i = 0; i < carPolys.length; i++) {
        const offset = this.#nearestEdgeOffset(ray, carPolys[i]);
        if (offset !== null && offset < minOffset) {
          minOffset = offset;
          minHit = {
            offset,
            x: lerp(ray[0].x, ray[1].x, offset),
            y: lerp(ray[0].y, ray[1].y, offset),
            type: 'car',
          };
        }
      }

      for (let i = 0; i < controls.length; i++) {
        const offset = this.#nearestEdgeOffset(ray, controls[i].polygon);
        if (offset !== null && offset < minOffset) {
          minOffset = offset;
          minHit = {
            offset,
            x: lerp(ray[0].x, ray[1].x, offset),
            y: lerp(ray[0].y, ray[1].y, offset),
            type: 'trafficControl',
            controlState: controls[i].state,
          };
        }
      }

      return minHit;
    });
  }

  static #nearestEdgeOffset(ray: Point[], poly: Point[]): number | null {
    if (poly.length < 2) return null;

    let minOffset = Infinity;
    const edgeCount = poly.length === 2 ? 1 : poly.length;
    for (let j = 0; j < edgeCount; j++) {
      const offset = getIntersectionOffset(
        ray[0],
        ray[1],
        poly[j],
        poly[(j + 1) % poly.length],
      );
      if (offset >= 0 && offset < minOffset) {
        minOffset = offset;
      }
    }

    return minOffset === Infinity ? null : minOffset;
  }
}
