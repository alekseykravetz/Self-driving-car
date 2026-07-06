'use strict';
/**
 * Pure functions for car creation and pool/brain application during training.
 */
function createCarsForTraining(count, type, config, startInfo) {
  const cars = [];
  const color = type === 'AI' ? 'blue' : 'red';
  for (let i = 1; i <= count; i++) {
    const car = new Car({
      x: startInfo.x,
      y: startInfo.y,
      width: config.width,
      height: config.height,
      controlType: type,
      angle: startInfo.angle,
      maxSpeed: config.maxSpeed,
      acceleration: config.acceleration,
      friction: config.friction,
      color,
      hiddenLayers: config.hiddenLayers,
      sensor: config.sensor,
    });
    car.name = type === 'KEYS' ? 'K' : String(i);
    cars.push(car);
  }
  return cars;
}

/**
 * Returns true when networks `a` and `b` have the same layer count and each
 * layer has matching input/output sizes. Used to guard against silently
 * overwriting a car brain with an incompatible stored brain (e.g. when the
 * user changes the hidden-layers config and stored brains have old topology).
 */
function brainsCompatible(a, b) {
  if (a.levels.length !== b.levels.length) return false;
  for (let i = 0; i < a.levels.length; i++) {
    if (
      a.levels[i].inputs.length !== b.levels[i].inputs.length ||
      a.levels[i].outputs.length !== b.levels[i].outputs.length
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Derive the hidden-layer sizes encoded in a stored brain's topology.
 * A brain built from neuronCounts `[inputs, ...hidden, outputs]` has one level
 * per adjacent pair, so the hidden sizes are every level's output count except
 * the last (the output layer). Returns null when no brain is available.
 * Used to reconstruct config for legacy .car files that omit `hiddenLayers`.
 */
function inferHiddenLayers(brain) {
  if (!brain || brain.levels.length < 2) return null;
  return brain.levels.slice(0, -1).map((l) => l.outputs.length);
}

function applyPoolToCars(cars, pool, mutationRate) {
  if (pool.length === 0) return;
  const brains = pool.filter((c) => c.brain).map((c) => c.brain);
  let aiIndex = 0;
  for (let i = 0; i < cars.length; i++) {
    if (cars[i].type === 'KEYS') continue;
    if (brains.length > 0 && cars[i].brain) {
      if (aiIndex < brains.length) {
        // Only apply stored brain if topology matches the freshly-created car.
        if (brainsCompatible(brains[aiIndex], cars[i].brain)) {
          cars[i].brain = NeuralNetwork.clone(brains[aiIndex]);
        }
      } else {
        const mutated = NeuralNetwork.mutateFromPool(brains, mutationRate);
        if (brainsCompatible(mutated, cars[i].brain)) {
          cars[i].brain = mutated;
        }
      }
    }
    aiIndex++;
  }
}

function getSortedAICars(cars, evaluateFitness) {
  return cars
    .filter((c) => c.brain && c.type !== 'KEYS')
    .sort((a, b) => evaluateFitness(b) - evaluateFitness(a));
}

/**
 * Returns the top `k` AI cars by fitness, highest first, without sorting or
 * allocating a filtered copy of the whole population. This runs every frame
 * for the live pool, where `k` (pool size) is tiny (≤20) compared to the car
 * count (thousands), so a single-pass partial selection is far cheaper than a
 * full O(n log n) sort of every car.
 *
 * Equivalent to `getSortedAICars(cars, evaluateFitness).slice(0, k)`.
 */
function getTopAICars(cars, evaluateFitness, k) {
  if (k <= 0) return [];
  // `top` is kept sorted descending by fitness; `topFit` mirrors the fitness so
  // each car's fitness is evaluated once. Both stay at length ≤ k.
  const top = [];
  const topFit = [];
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (!car.brain || car.type === 'KEYS') continue;
    const fit = evaluateFitness(car);
    // Skip cars that cannot enter a full pool (worse than the current worst).
    if (top.length === k && fit <= topFit[top.length - 1]) continue;
    // Insertion sort into the small top list.
    let pos = top.length < k ? top.length : k - 1;
    while (pos > 0 && topFit[pos - 1] < fit) {
      top[pos] = top[pos - 1];
      topFit[pos] = topFit[pos - 1];
      pos--;
    }
    top[pos] = car;
    topFit[pos] = fit;
  }
  return top;
}

function getTopCarInfoPool(cars, evaluateFitness, poolSize) {
  return getSortedAICars(cars, evaluateFitness)
    .slice(0, poolSize)
    .map((c) => c.toInfo());
}
