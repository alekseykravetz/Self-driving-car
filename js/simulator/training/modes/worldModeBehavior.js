'use strict';
/**
 * World-mode update logic for the simulator.
 * Updates AI cars against the world's road borders, handling collision
 * correction and spatial filtering of nearby border segments.
 *
 * Border lookup uses a {@link SpatialHashGrid} so each car only tests the
 * segments within its sensor range. The query radius is derived from the car's
 * own sensor ray length so cars with long rays still see every relevant border
 * (the previous fixed proximity threshold missed borders when rayLength was
 * larger than the threshold).
 *
 * Cars farther than `idleRange` from the best car are frozen (skipped) when
 * idle is enabled, keeping the simulation fast with very large populations.
 */
function updateWorldCars(
  cars,
  borderGrid,
  borderMode,
  collisionBorders,
  bestCar,
  idleEnabled,
  idleRange,
) {
  let aliveCount = 0;
  let deadCount = 0;
  let frozenCount = 0;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (car.damaged && borderMode !== 'collision') {
      deadCount++;
      continue;
    }
    // Freeze cars that are far from the best car (idle out-of-range).
    if (
      idleEnabled &&
      car !== bestCar &&
      bestCar.fitness - car.fitness > idleRange &&
      !(car.damaged && borderMode === 'collision')
    ) {
      frozenCount++;
      continue;
    }
    if (car.damaged && borderMode === 'collision') {
      handleCollisionWithRoadBorders(car, collisionBorders);
    }
    // Query only the border segments within the car's sensor/collision range.
    let bordersForUpdate = [];
    if (borderMode !== 'none') {
      bordersForUpdate = queryBordersNearCar(borderGrid, car);
    }
    car.update(bordersForUpdate);
    aliveCount++;
  }
  return { aliveCount, deadCount, frozenCount };
}
