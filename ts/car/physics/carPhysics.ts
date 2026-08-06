import {
  REVERSE_SPEED_RATIO,
  REALISTIC_BRAKE_FORCE_RATIO,
  REALISTIC_ENGINE_TAPER_EXPONENT,
} from '../config.js';
import { polysIntersect } from '../../math/collision.js';
import type { Point } from '../../math/primitives/point.js';
import type { CarState, ControlsState } from '../carState.js';

export class CarPhysics {
  update(
    state: CarState,
    controls: ControlsState,
    polygons: Point[][] = [],
  ): boolean {
    if (state.damaged) return false;

    if (state.physicsModel === 'realistic') {
      this.#moveRealistic(state, controls);
    } else {
      this.#move(state, controls);
    }
    state.fitness += state.speed;
    state.polygon = this.createPolygon(state);

    const becameDamaged = this.assessDamage(state.polygon, polygons);
    if (becameDamaged) {
      state.speed = 0;
      state.damaged = true;
    }
    return becameDamaged;
  }

  #move(state: CarState, controls: ControlsState): void {
    if (controls.forward) {
      state.speed += state.acceleration;
    }
    if (controls.reverse) {
      state.speed -= state.acceleration;
    }

    if (state.speed > state.maxSpeed) {
      state.speed = state.maxSpeed;
    }
    if (state.speed < -state.maxSpeed * REVERSE_SPEED_RATIO) {
      state.speed = -state.maxSpeed * REVERSE_SPEED_RATIO;
    }

    if (state.speed > 0) {
      state.speed -= state.friction;
    }
    if (state.speed < 0) {
      state.speed += state.friction;
    }
    if (Math.abs(state.speed) < state.friction) {
      state.speed = 0;
    }

    state.x -= Math.sin(state.angle) * state.speed;
    state.y -= Math.cos(state.angle) * state.speed;
  }

  /**
   * Braking (moving against current motion) is stronger than the engine, and
   * engine acceleration tapers off as speed nears its cap (real engines lose
   * power near top speed). Drag is speed-dependent: a constant rolling-
   * resistance term plus an aerodynamic term that grows with speed², scaled
   * so it roughly matches rolling resistance at maxSpeed.
   */
  #moveRealistic(state: CarState, controls: ControlsState): void {
    const reverseMax = state.maxSpeed * REVERSE_SPEED_RATIO;

    if (controls.forward) {
      if (state.speed < 0) {
        state.speed += state.acceleration * REALISTIC_BRAKE_FORCE_RATIO;
      } else {
        const taper = Math.max(
          0,
          1 - (state.speed / state.maxSpeed) ** REALISTIC_ENGINE_TAPER_EXPONENT,
        );
        state.speed += state.acceleration * taper;
      }
    }
    if (controls.reverse) {
      if (state.speed > 0) {
        state.speed -= state.acceleration * REALISTIC_BRAKE_FORCE_RATIO;
      } else {
        const taper = Math.max(
          0,
          1 - (-state.speed / reverseMax) ** REALISTIC_ENGINE_TAPER_EXPONENT,
        );
        state.speed -= state.acceleration * taper;
      }
    }

    if (state.speed > state.maxSpeed) {
      state.speed = state.maxSpeed;
    }
    if (state.speed < -reverseMax) {
      state.speed = -reverseMax;
    }

    const aeroCoeff = state.friction / (state.maxSpeed * state.maxSpeed);
    const drag = state.friction + aeroCoeff * state.speed * state.speed;
    if (state.speed > 0) {
      state.speed = Math.max(0, state.speed - drag);
    } else if (state.speed < 0) {
      state.speed = Math.min(0, state.speed + drag);
    }

    state.x -= Math.sin(state.angle) * state.speed;
    state.y -= Math.cos(state.angle) * state.speed;
  }

  createPolygon(state: CarState): Point[] {
    const points: Point[] = [];
    const rad = Math.hypot(state.width, state.height) / 2;
    const alpha = Math.atan2(state.width, state.height);
    points.push({
      x: state.x - Math.sin(state.angle - alpha) * rad,
      y: state.y - Math.cos(state.angle - alpha) * rad,
    } as Point);
    points.push({
      x: state.x - Math.sin(state.angle + alpha) * rad,
      y: state.y - Math.cos(state.angle + alpha) * rad,
    } as Point);
    points.push({
      x: state.x - Math.sin(Math.PI + state.angle - alpha) * rad,
      y: state.y - Math.cos(Math.PI + state.angle - alpha) * rad,
    } as Point);
    points.push({
      x: state.x - Math.sin(Math.PI + state.angle + alpha) * rad,
      y: state.y - Math.cos(Math.PI + state.angle + alpha) * rad,
    } as Point);
    return points;
  }

  assessDamage(polygon: Point[], polygons: Point[][] = []): boolean {
    if (polygons.length === 0) return false;

    let carMinX = polygon[0].x;
    let carMaxX = polygon[0].x;
    let carMinY = polygon[0].y;
    let carMaxY = polygon[0].y;
    for (let i = 1; i < polygon.length; i++) {
      const p = polygon[i];
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

      if (polysIntersect(polygon, poly)) {
        return true;
      }
    }
    return false;
  }
}
