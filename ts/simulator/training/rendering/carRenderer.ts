import type { Car } from '../../../car/car.js';

/**
 * Draws the simulator cars (regular AI cars, pool cars, prev pool cars, and KEYS car) on the game canvas.
 *
 * @param ctx - The canvas rendering context.
 * @param cars - The complete array of cars in the simulation.
 * @param bestPool - The pool of top-performing cars (current generation).
 * @param viewportTop - The top y-boundary of the visible viewport.
 * @param viewportBottom - The bottom y-boundary of the visible viewport.
 * @param drawMasks - Whether to draw the car masks.
 * @param poolColor - The color to highlight the current pool cars (default: 'gold').
 * @param prevPoolCars - Cars inherited from the previous generation's pool.
 * @param prevPoolColor - The color to highlight prev pool cars (default: 'deepskyblue').
 * @param viewportLeft - The left x-boundary of the visible viewport (default: no cull).
 * @param viewportRight - The right x-boundary of the visible viewport (default: no cull).
 */
export function drawSimulatorCars(
  ctx: CanvasRenderingContext2D,
  cars: Car[],
  bestPool: Car[],
  viewportTop: number,
  viewportBottom: number,
  drawMasks: boolean,
  poolColor: string = 'gold',
  prevPoolCars: Car[] = [],
  prevPoolColor: string = 'deepskyblue',
  viewportLeft: number = -Infinity,
  viewportRight: number = Infinity,
  keysShowSensor: boolean = false,
): void {
  const poolSet = new Set<Car>(bestPool);
  const prevPoolSet = new Set<Car>(prevPoolCars);
  const highlightedSet = new Set<Car>([...poolSet, ...prevPoolSet]);

  // 1. Regular AI cars — semi-transparent; skip highlighted and KEYS car.
  // Set the shared alpha once for the whole batch instead of paying for a
  // per-car save/restore pair (the regular cars are the bulk of the population).
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (highlightedSet.has(car) || car.type === 'KEYS') continue;
    if (
      car.y > viewportTop &&
      car.y < viewportBottom &&
      car.x > viewportLeft &&
      car.x < viewportRight
    ) {
      car.draw(ctx, { showMask: drawMasks });
    }
  }
  ctx.globalAlpha = 1;

  // 2. Prev pool cars — full opacity, mask + name, no sensors (draw low-rank first)
  for (let i = prevPoolCars.length - 1; i >= 0; i--) {
    const car = prevPoolCars[i];
    if (poolSet.has(car)) continue; // skip if also in current pool (drawn later)
    if (car.y > viewportTop && car.y < viewportBottom) {
      car.draw(ctx, {
        showMask: true,
        showName: true,
        colorOverride: prevPoolColor,
      });
    }
  }

  // 3. Current pool cars — full opacity, mask + name, rays only for #1 best car
  for (let i = bestPool.length - 1; i >= 0; i--) {
    const car = bestPool[i];
    if (car.y > viewportTop && car.y < viewportBottom) {
      const isBest = i === 0;
      car.draw(ctx, {
        showSensor: isBest,
        showMask: true,
        showName: true,
        colorOverride: poolColor,
      });
    }
  }

  // 4. KEYS (user-controlled) car — full opacity; sensor rays shown when the
  // user is tracking it (so they can debug driving with the sensor visible).
  const keysCar = cars.find((c) => c.type === 'KEYS');
  if (keysCar && keysCar.y > viewportTop && keysCar.y < viewportBottom) {
    keysCar.draw(ctx, {
      showMask: drawMasks,
      showSensor: keysShowSensor,
    });
  }
}
