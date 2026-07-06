import type { Point } from '../math/primitives/point.js';

export interface ControlsState {
  forward: boolean;
  reverse: boolean;
}

export interface CarState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  acceleration: number;
  maxSpeed: number;
  friction: number;
  width: number;
  height: number;
  damaged: boolean;
  fitness: number;
  polygon: Point[];
}
