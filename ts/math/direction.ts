import { Point } from './primitives/point.js';
import { angle } from './utils.js';

/**
 * Canonical convention: `directionVector` (lane guides, markings, OSM) always
 * stores the real travel/facing direction. Use these helpers to convert that
 * direction into a car heading or a canvas rotation — never invert `dir`.
 */

/** Car heading (0 = up, per carPhysics) so the car FACES ALONG `dir`. */
export function carAngleFromDirection(dir: Point): number {
  return -angle(dir) - Math.PI / 2;
}

/** Canvas rotation so an up-facing sprite/text FACES ALONG `dir`. */
export function drawRotationFromDirection(dir: Point): number {
  return angle(dir) + Math.PI / 2;
}
