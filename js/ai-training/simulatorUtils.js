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
 * @param prevPoolColor - The color to highlight prev pool cars (default: 'lime').
 */
function drawSimulatorCars(
  ctx,
  cars,
  bestPool,
  viewportTop,
  viewportBottom,
  drawMasks,
  poolColor = 'gold',
  prevPoolCars = [],
  prevPoolColor = 'lime',
) {
  const poolSet = new Set(bestPool);
  const prevPoolSet = new Set(prevPoolCars);
  const highlightedSet = new Set([...poolSet, ...prevPoolSet]);
  // 1. Regular AI cars — semi-transparent; skip highlighted and KEYS car
  ctx.save();
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (highlightedSet.has(car) || car.type === 'KEYS') continue;
    if (car.y > viewportTop && car.y < viewportBottom) {
      car.draw(ctx, false, drawMasks);
    }
  }
  ctx.restore();
  // 2. Prev pool cars — full opacity, mask + name, no sensors (draw low-rank first)
  ctx.save();
  ctx.globalAlpha = 1;
  for (let i = prevPoolCars.length - 1; i >= 0; i--) {
    const car = prevPoolCars[i];
    if (poolSet.has(car)) continue; // skip if also in current pool (drawn later)
    if (car.y > viewportTop && car.y < viewportBottom) {
      const originalColor = car.color;
      car.color = prevPoolColor;
      car.draw(ctx, false, true);
      car.color = originalColor;
      drawCarName(ctx, car);
    }
  }
  ctx.restore();
  // 3. Current pool cars — full opacity, mask + name, rays only for #1 best car
  ctx.save();
  ctx.globalAlpha = 1;
  for (let i = bestPool.length - 1; i >= 0; i--) {
    const car = bestPool[i];
    if (car.y > viewportTop && car.y < viewportBottom) {
      const isBest = i === 0;
      const originalColor = car.color;
      car.color = poolColor;
      car.draw(ctx, isBest, true);
      car.color = originalColor;
      drawCarName(ctx, car);
    }
  }
  ctx.restore();
  // 4. KEYS (user-controlled) car — full opacity
  const keysCar = cars.find((c) => c.type === 'KEYS');
  if (keysCar && keysCar.y > viewportTop && keysCar.y < viewportBottom) {
    keysCar.draw(ctx, false, drawMasks);
  }
}

/**
 * Handles collision with road borders by pushing the car back onto the road.
 * Finds the nearest skeleton/border segment and corrects the car's position and angle.
 */
function handleCollisionWithRoadBorders(car, bordersToCheck) {
  if (bordersToCheck.length === 0) return;
  const segment = getNearestSegment(new Point(car.x, car.y), bordersToCheck);
  if (!segment) return;
  const correctors = car.polygon.map((p) => {
    const proj = segment.projectPoint(p);
    const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
    return subtract(projPoint, p);
  });
  if (correctors.length === 0) return;
  const magnitudes = correctors.map((p) => magnitude(p));
  const maxMagnitude = Math.max(...magnitudes);
  const correctorIndex = magnitudes.findIndex((mag) => mag === maxMagnitude);
  if (correctorIndex === -1) return;
  const corrector = correctors[correctorIndex];
  const normalizedCorrector = normalize(corrector);
  if (correctorIndex === 0 || correctorIndex === 3) {
    car.angle += 0.1;
  } else {
    car.angle -= 0.1;
  }
  car.x += normalizedCorrector.x;
  car.y += normalizedCorrector.y;
  car.damaged = false;
}
