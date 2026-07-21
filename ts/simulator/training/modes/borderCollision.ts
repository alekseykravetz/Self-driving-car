import type { Car } from '../../../car/car.js';
import type { Segment } from '../../../math/primitives/segment.js';
import { COLLISION_ANGLE_CORRECTION } from '../../../car/config.js';

/**
 * Handles collision with road borders by bumping the car back the way it came
 * (opposite to the actual movement direction) and setting speed to 0.
 * This lets the car continue driving after a collision instead of getting stuck.
 *
 * The bump direction flips depending on whether the car was reversing:
 * - Forward movement: push back  (direction = +sin, +cos relative to facing angle)
 * - Reverse movement: push forward (direction = -sin, -cos relative to facing angle)
 */
export function handleCollisionWithRoadBorders(
  car: Car,
  _bordersToCheck: Segment[],
): void {
  const pushDistance = Math.hypot(car.width, car.height) / 2;

  // Determine the actual movement direction from the car's controls.
  // The physics engine moves the car by:
  //   x -= sin(angle)*speed, y -= cos(angle)*speed  (forward)
  // The opposite of forward movement is (sin, cos).
  // When reversing, the speed is negative so the actual movement flips,
  // and the bump-back direction flips accordingly.
  const reversing = car.controls.reverse;
  if (reversing) {
    // Car was moving in reverse (rear hit the wall) — bump forward.
    car.x -= Math.sin(car.angle) * pushDistance;
    car.y -= Math.cos(car.angle) * pushDistance;
  } else {
    // Car was moving forward (front hit the wall) — bump backward.
    car.x += Math.sin(car.angle) * pushDistance;
    car.y += Math.cos(car.angle) * pushDistance;
  }

  // Stop the car so it doesn't immediately re-collide.
  car.speed = 0;

  // Angle correction prevents the car from re-entering the wall immediately.
  car.angle += COLLISION_ANGLE_CORRECTION;

  // Clear damaged flag so the car can keep driving.
  car.damaged = false;
}
