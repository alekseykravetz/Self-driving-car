'use strict';
const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = 200;
gameCanvas.style.backgroundColor = 'lightgray';
const gameCtx = gameCanvas.getContext('2d');
const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = 300;
const networkCtx = networkCanvas.getContext('2d');
const carCountInput = document.getElementById('carCount');
const thresholdInput = document.getElementById('threshold');
const poolCountInput = document.getElementById('poolCount');
const showVisualizerCheckbox = document.getElementById('showVisualizer');
const pauseBtn = document.getElementById('pauseBtn');
// Stats DOM elements
const statGenEl = document.getElementById('stat-gen');
const statAliveEl = document.getElementById('stat-alive');
const statDeadEl = document.getElementById('stat-dead');
const statFrozenEl = document.getElementById('stat-frozen');
const statDistEl = document.getElementById('stat-dist');
const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);
const startAngle = angle(new Point(0, -1)) + Math.PI / 2;
// Population variables
let N = parseInt(carCountInput.value) || 100;
let poolSize = parseInt(poolCountInput.value) || 5;
let cars = generateCars(N);
let bestCar = cars[0];
let bestPool = [];
let traffic = generateTraffic();
// Tracks the furthest-ahead traffic row that has been generated (most negative y)
let lastGeneratedTrafficY = -700;
// Loop control
let paused = false;
let animationFrameId = -1;
// Generation counter (increments each restart)
let iteration = 0;
// All-time furthest y reached (most negative); persists across restarts
const CAR_START_Y = 100;
let maxDistancePassed = 0;
// Initial load
updateCarsWithBrain();
/**
 * Toggles the animation loop pause state and updates the button label.
 */
function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? '▶️' : '⏸️';
  if (paused) {
    cancelAnimationFrame(animationFrameId);
  } else {
    // Resume: kick off the loop again
    animationFrameId = requestAnimationFrame(animate);
  }
}

/**
 * Loads the saved brain(s) and applies evolution/mutation based on the threshold.
 * Supports both a single best brain and a pool of top brains for crossover.
 */
function updateCarsWithBrain() {
  const storedBrains = localStorage.getItem('bestBrains');
  const storedBrain = localStorage.getItem('bestBrain');
  const threshold = parseFloat(thresholdInput.value) || 0.1;
  let pool = [];
  if (storedBrains) {
    pool = JSON.parse(storedBrains);
  } else if (storedBrain) {
    pool = [JSON.parse(storedBrain)];
  }
  if (pool.length > 0) {
    for (let i = 0; i < cars.length; i++) {
      if (i < pool.length) {
        cars[i].brain = JSON.parse(JSON.stringify(pool[i]));
      } else {
        cars[i].brain = NeuralNetwork.mutateFromPool(pool, threshold);
        // For pure mutation without crossover, use the following line instead:
        // cars[i].brain = NeuralNetwork.mutate(pool[Math.floor(Math.random() * pool.length)], threshold);
      }
    }
  }
}

cars.push(
  new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
);
/**
 * Restarts the training with current UI settings.
 * Increments the generation counter and seeds from top performers.
 */
function restart() {
  iteration++;
  N = parseInt(carCountInput.value);
  poolSize = parseInt(poolCountInput.value) || 5;
  const sortedCars = cars
    .filter((c) => c.brain && c.type !== 'KEYS')
    .sort((a, b) => a.y - b.y);
  const bestBrainPool = sortedCars.slice(0, poolSize).map((c) => c.brain);
  cars = generateCars(N);
  bestCar = cars[0];
  bestPool = [];
  traffic = generateTraffic();
  lastGeneratedTrafficY = -700;
  const threshold = parseFloat(thresholdInput.value) || 0.1;
  if (bestBrainPool.length > 0) {
    console.log(
      `Evolving next generation from ${bestBrainPool.length} top cars.`,
    );
    for (let i = 0; i < cars.length; i++) {
      if (i < bestBrainPool.length) {
        cars[i].brain = JSON.parse(JSON.stringify(bestBrainPool[i]));
      } else {
        cars[i].brain = NeuralNetwork.mutateFromPool(bestBrainPool, threshold);
      }
    }
  } else {
    updateCarsWithBrain();
  }
  cars.push(
    new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
  );
  // If paused, resume so the new generation is visible immediately
  if (paused) togglePause();
  console.log(`Generation ${iteration} started with ${N} cars.`);
}

/**
 * Returns the hardcoded initial traffic cars.
 * Each row has at least one empty lane.
 */
function generateTraffic() {
  return [
    // Row y=-100: lane 1 only
    new Car(
      road.getLaneCenter(1),
      -100,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    // Row y=-300: lanes 0 and 2
    new Car(
      road.getLaneCenter(0),
      -300,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    new Car(
      road.getLaneCenter(2),
      -300,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    // Row y=-500: lanes 0 and 1
    new Car(
      road.getLaneCenter(0),
      -500,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    new Car(
      road.getLaneCenter(1),
      -500,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    // Row y=-700: lanes 1 and 2
    new Car(
      road.getLaneCenter(1),
      -700,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
    new Car(
      road.getLaneCenter(2),
      -700,
      30,
      50,
      'DUMMY',
      startAngle,
      2,
      getRandomColor(),
    ),
  ];
}

/**
 * Generates a single dynamic traffic row at the given y coordinate.
 * Randomly fills 1 or 2 of the 3 lanes, always leaving at least one empty.
 */
function generateTrafficRow(y) {
  const laneCount = 3;
  const filledCount = Math.floor(Math.random() * (laneCount - 1)) + 1; // 1 or 2
  const shuffledLanes = [0, 1, 2].sort(() => Math.random() - 0.5);
  const activeLanes = shuffledLanes.slice(0, filledCount);
  return activeLanes.map(
    (lane) =>
      new Car(
        road.getLaneCenter(lane),
        y,
        30,
        50,
        'DUMMY',
        startAngle,
        2,
        getRandomColor(),
      ),
  );
}

/**
 * Generates an array of AI-controlled Car instances.
 */
function generateCars(n) {
  const generatedCars = [];
  for (let i = 1; i <= n; i++) {
    generatedCars.push(
      new Car(road.getLaneCenter(1), 100, 30, 50, 'AI', startAngle, 3, 'blue'),
    );
  }
  return generatedCars;
}

/**
 * Saves the brains of the top performing cars to localStorage.
 */
function save() {
  const currentPoolSize = parseInt(poolCountInput.value) || poolSize;
  const sortedCars = cars
    .filter((c) => c.brain && c.type !== 'KEYS')
    .sort((a, b) => a.y - b.y);
  const bestBrainPool = sortedCars
    .slice(0, currentPoolSize)
    .map((c) => c.brain);
  if (bestBrainPool.length > 0) {
    localStorage.setItem('bestBrains', JSON.stringify(bestBrainPool));
    localStorage.setItem('bestBrain', JSON.stringify(bestBrainPool[0]));
    console.log(`Saved top ${bestBrainPool.length} brains.`);
  } else {
    console.warn('Could not save brains: no cars with brains found.');
  }
}

/**
 * Removes the saved brains from localStorage.
 */
function discard() {
  localStorage.removeItem('bestBrain');
  localStorage.removeItem('bestBrains');
  console.log('Stored brains discarded.');
}

/** Gold highlight color used for all cars in the best pool. */
const POOL_COLOR = 'gold';
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
 * Writes live simulation stats into the stats panel DOM elements.
 */
function updateStatsDisplay(alive, dead, frozen, maxDist) {
  statGenEl.textContent = String(iteration);
  statAliveEl.textContent = String(alive);
  statDeadEl.textContent = String(dead);
  statFrozenEl.textContent = String(frozen);
  statDistEl.textContent = String(maxDist);
}

// Start the animation loop
animationFrameId = requestAnimationFrame(animate);
/**
 * The main animation loop. Updates and draws the simulation state each frame.
 */
function animate(time) {
  gameCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;
  const viewportTop = bestCar.y - gameCanvas.height * 0.7;
  const viewportBottom = bestCar.y + gameCanvas.height * 0.3;
  // --- Dynamic traffic: generate rows infinitely ahead of the best car ---
  const TRAFFIC_LOOKAHEAD = 1500;
  const TRAFFIC_ROW_GAP = 200;
  const TRAFFIC_SPEED = 2; // must match the speed passed to DUMMY Car constructors
  // Keep lastGeneratedTrafficY in sync with how far traffic has moved this frame
  lastGeneratedTrafficY -= TRAFFIC_SPEED;
  while (lastGeneratedTrafficY > bestCar.y - TRAFFIC_LOOKAHEAD) {
    lastGeneratedTrafficY -= TRAFFIC_ROW_GAP;
    traffic.push(...generateTrafficRow(lastGeneratedTrafficY));
  }
  // Cull traffic cars that have fallen far behind the best car
  traffic = traffic.filter((c) => c.y < bestCar.y + 600);
  // Update traffic cars
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders);
  }
  const polygons = [...road.borders, ...traffic.map((c) => c.polygon)];
  // --- Update AI cars; tally live stats in the same pass ---
  let aliveCount = 0;
  let deadCount = 0;
  let frozenCount = 0; // alive (not damaged) but outside the update range
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const inRange = car.y > viewportTop - 1000 && car.y < viewportBottom + 1000;
    if (car.damaged) {
      deadCount++;
    } else if (inRange) {
      // Undamaged and in range — actively driving, counts as alive
      car.update(polygons);
      aliveCount++;
    } else {
      // Undamaged but outside the update window — frozen/idle, not counted as alive
      frozenCount++;
    }
  }
  // Track all-time max distance (cars start at y=100; more negative = further ahead)
  const currentDist = Math.round(CAR_START_Y - bestCar.y);
  if (currentDist > maxDistancePassed) {
    maxDistancePassed = currentDist;
  }
  // Update stats display every frame
  updateStatsDisplay(aliveCount, deadCount, frozenCount, maxDistancePassed);
  // --- Identify best pool from AI brain cars ---
  const currentPoolSize = parseInt(poolCountInput.value) || poolSize;
  const aiBrainCars = cars.filter((c) => c.brain && c.type !== 'KEYS');
  aiBrainCars.sort((a, b) => a.y - b.y);
  bestPool = aiBrainCars.slice(0, currentPoolSize);
  // Assign / clear pool rank names
  for (const car of aiBrainCars) {
    car.name = undefined;
  }
  for (let i = 0; i < bestPool.length; i++) {
    bestPool[i].name = String(i + 1);
  }
  if (bestPool.length > 0) {
    bestCar = bestPool[0];
  }
  const poolSet = new Set(bestPool);
  const drawMasks = N <= 300;
  // --- Draw Game Canvas ---
  gameCtx.save();
  gameCtx.translate(0, -bestCar.y + gameCanvas.height * 0.7);
  road.draw(gameCtx);
  // Traffic
  for (let i = 0; i < traffic.length; i++) {
    if (
      traffic[i].y > viewportTop - 100 &&
      traffic[i].y < viewportBottom + 100
    ) {
      traffic[i].draw(gameCtx);
    }
  }
  // Regular AI cars — semi-transparent; skip pool members and KEYS car
  gameCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    if (poolSet.has(car) || car.type === 'KEYS') continue;
    if (car.y > viewportTop - 100 && car.y < viewportBottom + 100) {
      car.draw(gameCtx, false, drawMasks);
    }
  }
  // Pool cars — full opacity, gold, sensors, rank labels (draw low-rank first so #1 is on top)
  gameCtx.globalAlpha = 1;
  for (let i = bestPool.length - 1; i >= 0; i--) {
    const car = bestPool[i];
    if (car.y > viewportTop - 100 && car.y < viewportBottom + 100) {
      const originalColor = car.color;
      car.color = POOL_COLOR;
      car.draw(gameCtx, true, true);
      car.color = originalColor;
      drawCarName(gameCtx, car);
    }
  }
  // KEYS (user-controlled) car — full opacity, original red
  gameCtx.globalAlpha = 1;
  const keysCar = cars.find((c) => c.type === 'KEYS');
  if (
    keysCar &&
    keysCar.y > viewportTop - 100 &&
    keysCar.y < viewportBottom + 100
  ) {
    keysCar.draw(gameCtx, false, drawMasks);
  }
  gameCtx.restore();
  // --- Draw Network Canvas ---
  if (showVisualizerCheckbox.checked) {
    networkCanvas.style.display = 'block';
    // Animate the network visualization's line dashes
    networkCtx.lineDashOffset = -(time || 0) / 50;
    // Draw the neural network of the best car
    if (bestCar && bestCar.brain) {
      Visualizer.drawNetwork(networkCtx, bestCar.brain);
    }
  } else {
    networkCanvas.style.display = 'none';
  }
  // Schedule next frame only when not paused
  if (!paused) {
    animationFrameId = requestAnimationFrame(animate);
  }
}
