const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
gameCanvas.width = 200;
gameCanvas.style.backgroundColor = 'lightgray';
const gameCtx = gameCanvas.getContext('2d')!;

const networkCanvas = document.getElementById(
  'networkCanvas',
) as HTMLCanvasElement;
networkCanvas.width = 300;
const networkCtx = networkCanvas.getContext('2d')!;

const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);
const startAngle: number = angle(new Point(0, -1)) + Math.PI / 2;

const CAR_START_Y = 100;

// Population variables
let cars: Car[] = [];
let bestCar: Car;
let bestPool: Car[] = [];
let traffic: Car[] = [];

// Tracks the furthest-ahead traffic row that has been generated (most negative y)
let lastGeneratedTrafficY: number = -700;

// Loop control
let animationFrameId: number = -1;

const trainingManager = new TrainingManager({
  getCars: () => cars,
  evaluateFitness: (car: Car) => CAR_START_Y - car.y,
  onRestart: (bestBrainPool: NeuralNetwork[]) => {
    const settings = trainingManager.getSettings();
    cars = generateCars(settings.carCount);
    bestCar = cars[0];
    bestPool = [];
    traffic = generateTraffic();
    lastGeneratedTrafficY = -700;

    trainingManager.applyBrainPool(cars, bestBrainPool);

    cars.push(
      new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
    );

    console.log(
      `Generation ${trainingManager.iteration} started with ${settings.carCount} cars.`,
    );
  },
  onPauseToggle: (isPaused: boolean) => {
    if (isPaused) {
      cancelAnimationFrame(animationFrameId);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }
  },
});

// Initial population setup
const initialSettings = trainingManager.getSettings();
cars = generateCars(initialSettings.carCount);
bestCar = cars[0];
trainingManager.updateCarsWithBrain(cars);
cars.push(
  new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
);

traffic = generateTraffic();

// Start the animation loop
animationFrameId = requestAnimationFrame(animate);

/**
 * Returns the hardcoded initial traffic cars.
 * Each row has at least one empty lane.
 */
function generateTraffic(): Car[] {
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
function generateTrafficRow(y: number): Car[] {
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
function generateCars(n: number): Car[] {
  const generatedCars: Car[] = [];
  for (let i = 1; i <= n; i++) {
    generatedCars.push(
      new Car(road.getLaneCenter(1), 100, 30, 50, 'AI', startAngle, 3, 'blue'),
    );
  }
  return generatedCars;
}

/** Gold highlight color used for all cars in the best pool. */
const POOL_COLOR = 'gold';

/**
 * Draws the car's pool rank label (#1, #2 …) at the car's world-space centre.
 * Assumes the canvas context already has the camera translate applied.
 */
function drawCarName(ctx: CanvasRenderingContext2D, car: Car): void {
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
 * The main animation loop. Updates and draws the simulation state each frame.
 */
function animate(time?: number): void {
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

  const polygons: Point[][] = [
    ...road.borders,
    ...traffic.map((c: Car) => c.polygon),
  ];

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

  const poolSet = new Set<Car>(bestPool);
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
