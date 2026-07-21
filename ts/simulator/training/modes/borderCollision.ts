import type { Car } from '../../../car/car.js';
import type { Segment } from '../../../math/primitives/segment.js';
import { COLLISION_ANGLE_CORRECTION } from '../../../car/config.js';

/**
 * Handles collision with road borders by bumping the car back along its
 * angle of travel (opposite to movement direction) and setting speed to 0.
 * This lets the car continue driving after a collision instead of getting stuck.
 */
export function handleCollisionWithRoadBorders(
  car: Car,
  _bordersToCheck: Segment[],
): void {
  // Push the car back along its angle (opposite to movement direction).
  // The movement direction is: x -= sin(angle)*speed, y -= cos(angle)*speed.
  // Bumping back reverses that: x += sin(angle)*push, y += cos(angle)*push.
  const pushDistance = Math.hypot(car.width, car.height) / 2;
  car.x += Math.sin(car.angle) * pushDistance;
  car.y += Math.cos(car.angle) * pushDistance;

  // Stop the car so it doesn't immediately re-collide.
  car.speed = 0;

  // Angle correction prevents the car from re-entering the wall immediately.
  car.angle += COLLISION_ANGLE_CORRECTION;

  // Clear damaged flag so the car can keep driving.
  car.damaged = false;
}
