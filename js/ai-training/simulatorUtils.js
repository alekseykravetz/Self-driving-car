'use strict';
/**
 * Draws the car's pool rank label (#1, #2 …) at the car's world-space centre.
 * Assumes the canvas context already has the camera translate applied.
 */
function drawCarName(ctx, car) {
  if (!car.name) return;
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = 'white';
  ctx.fillText(`#${car.name}`, car.x, car.y);
  ctx.restore();
}

/**
 * Draws the simulator cars (regular AI cars, pool cars, and KEYS car) on the game canvas.
 *
 * @param ctx - The canvas rendering context.
 * @param cars - The complete array of cars in the simulation.
 * @param bestPool - The pool of top-performing cars.
 * @param viewportTop - The top y-boundary of the visible viewport.
 * @param viewportBottom - The bottom y-boundary of the visible viewport.
 * @param drawMasks - Whether to draw the car sensors/masks.
 * @param poolColor - The color to highlight the pool cars (default: 'gold').
 */
function drawSimulatorCars(
  ctx,
  cars,
  bestPool,
  viewportTop,
  viewportBottom,
  drawMasks,
  poolColor = 'gold',
) {
  const poolSet = new Set(bestPool);
  // 1. Regular AI cars — semi-transparent; skip pool members and KEYS car
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (poolSet.has(car) || car.type === 'KEYS') continue;
    if (car.y > viewportTop && car.y < viewportBottom) {
      car.draw(ctx, false, drawMasks);
    }
  }
  ctx.restore();
  // 2. Pool cars — full opacity, custom highlight color, sensors, rank labels (draw low-rank first)
  ctx.save();
  ctx.globalAlpha = 1;
  for (let i = bestPool.length - 1; i >= 0; i--) {
    const car = bestPool[i];
    if (car.y > viewportTop && car.y < viewportBottom) {
      const originalColor = car.color;
      car.color = poolColor;
      car.draw(ctx, true, true);
      car.color = originalColor;
      drawCarName(ctx, car);
    }
  }
  ctx.restore();
  // 3. KEYS (user-controlled) car — full opacity
  const keysCar = cars.find((c) => c.type === 'KEYS');
  if (keysCar && keysCar.y > viewportTop && keysCar.y < viewportBottom) {
    keysCar.draw(ctx, false, drawMasks);
  }
}
