'use strict';
const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = 200;
gameCanvas.style.backgroundColor = 'lightgray';
const gameCtx = gameCanvas.getContext('2d');
const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = 300;
const networkCtx = networkCanvas.getContext('2d');
const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);
const startAngle = angle(new Point(0, -1)) + Math.PI / 2;
const CAR_START_Y = 100;
// Population variables
let cars = [];
let bestCar;
let bestPool = [];
let traffic = [];
// Tracks the furthest-ahead traffic row that has been generated (most negative y)
let lastGeneratedTrafficY = -700;
// Loop control
let animationFrameId = -1;
const trainingManager = new TrainingManager({
  getCars: () => cars,
  evaluateFitness: (car) => CAR_START_Y - car.y,
  onRestart: (bestBrainPool) => {
    const settings = trainingManager.getSettings();
    const carConfig = trainingManager.getCarSettings();
    cars = generateCars(settings.carCount, carConfig);
    bestCar = cars[0];
    bestPool = [];
    traffic = generateTraffic();
    lastGeneratedTrafficY = -700;
    trainingManager.applyCarSettingsToCars(cars);
    trainingManager.applyBrainPool(cars, bestBrainPool);
    const keysCar = new Car(
      road.getLaneCenter(1),
      100,
      carConfig.width,
      carConfig.height,
      'KEYS',
      startAngle,
      carConfig.maxSpeed,
      'red',
    );
    keysCar.acceleration = carConfig.acceleration;
    keysCar.friction = carConfig.friction;
    cars.push(keysCar);
    console.log(
      `Generation ${trainingManager.iteration} started with ${settings.carCount} cars.`,
    );
  },
  onPauseToggle: (isPaused) => {
    if (isPaused) {
      cancelAnimationFrame(animationFrameId);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }
  },
});
// Initial population setup
const initialSettings = trainingManager.getSettings();
const initialCarConfig = trainingManager.getCarSettings();
cars = generateCars(initialSettings.carCount, initialCarConfig);
bestCar = cars[0];
trainingManager.applyCarSettingsToCars(cars);
trainingManager.updateCarsWithBrain(cars);
const initialKeysCar = new Car(
  road.getLaneCenter(1),
  100,
  initialCarConfig.width,
  initialCarConfig.height,
  'KEYS',
  startAngle,
  initialCarConfig.maxSpeed,
  'red',
);
initialKeysCar.acceleration = initialCarConfig.acceleration;
initialKeysCar.friction = initialCarConfig.friction;
cars.push(initialKeysCar);
traffic = generateTraffic();
// Start the animation loop
animationFrameId = requestAnimationFrame(animate);
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
function generateCars(n, config) {
  const generatedCars = [];
  for (let i = 1; i <= n; i++) {
    generatedCars.push(
      new Car(
        road.getLaneCenter(1),
        100,
        config.width,
        config.height,
        'AI',
        startAngle,
        config.maxSpeed,
        'blue',
      ),
    );
  }
  return generatedCars;
}

/** Gold highlight color used for all cars in the best pool. */
const POOL_COLOR = 'gold';
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
  // Sort traffic by y for efficient binary-search spatial lookups
  traffic.sort((a, b) => a.y - b.y);
  // Proximity threshold: sensor ray length (150) + car height (50) + buffer
  const PROXIMITY_THRESHOLD = 250;
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
      // Build per-car polygons with only nearby traffic (binary search on sorted array)
      const nearbyPolygons = [...road.borders];
      const minY = car.y - PROXIMITY_THRESHOLD;
      const maxY = car.y + PROXIMITY_THRESHOLD;
      // Binary search for first traffic car with y >= minY
      let lo = 0;
      let hi = traffic.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (traffic[mid].y < minY) lo = mid + 1;
        else hi = mid;
      }
      // Scan forward from lo while within range
      for (let j = lo; j < traffic.length && traffic[j].y <= maxY; j++) {
        nearbyPolygons.push(traffic[j].polygon);
      }
      car.update(nearbyPolygons);
      aliveCount++;
    } else {
      // Undamaged but outside the update window — frozen/idle, not counted as alive
      frozenCount++;
    }
  }
  // Track all-time max distance (cars start at y=100; more negative = further ahead)
  const currentDist = Math.round(CAR_START_Y - bestCar.y);
  trainingManager.updateDistance(currentDist);
  // Update stats display every frame
  trainingManager.updateStatsDisplay(
    aliveCount,
    deadCount,
    frozenCount,
    trainingManager.maxDistancePassed,
  );
  // --- Identify best pool from AI brain cars ---
  const res = trainingManager.updateBestCarAndPool(cars);
  if (res.bestCar) {
    bestCar = res.bestCar;
  }
  bestPool = res.bestPool;
  const settings = trainingManager.getSettings();
  const drawMasks = settings.carCount <= 300;
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
  drawSimulatorCars(
    gameCtx,
    cars,
    bestPool,
    viewportTop - 100,
    viewportBottom + 100,
    drawMasks,
    POOL_COLOR,
  );
  gameCtx.restore();
  // --- Draw Network Canvas ---
  if (trainingManager.showVisualizer) {
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
  if (!trainingManager.paused) {
    animationFrameId = requestAnimationFrame(animate);
  }
}
