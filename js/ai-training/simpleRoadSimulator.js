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
const showVisualizerCheckbox = document.getElementById('showVisualizer');
const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);
const startAngle = angle(new Point(0, -1)) + Math.PI / 2;
// Population variables
let N = parseInt(carCountInput.value) || 100;
let cars = generateCars(N);
let bestCar = cars[0];
let traffic = generateTraffic();
// Initial load
updateCarsWithBrain();
/**
 * Loads the saved brain(s) and applies evolution/mutation based on the threshold.
 * It supports both a single best brain and a pool of top brains for crossover.
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
        // Keep the best performers from the previous save as they are
        cars[i].brain = JSON.parse(JSON.stringify(pool[i]));
      } else {
        // Generate new cars by mutating from the pool (crossover + mutation)
        cars[i].brain = NeuralNetwork.mutateFromPool(pool, threshold);
      }
    }
  }
}

cars.push(
  new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
);
/**
 * Restarts the training with current UI settings.
 * It uses the top performing cars from the current run to seed the next generation.
 */
function restart() {
  N = parseInt(carCountInput.value);
  // Identify top performers from current run to allow immediate evolution
  const sortedCars = cars
    .filter((c) => c.brain && c.type !== 'KEYS')
    .sort((a, b) => a.y - b.y);
  const bestPool = sortedCars.slice(0, 5).map((c) => c.brain);
  cars = generateCars(N);
  bestCar = cars[0];
  traffic = generateTraffic();
  const threshold = parseFloat(thresholdInput.value) || 0.1;
  if (bestPool.length > 0) {
    console.log(`Evolving next generation from ${bestPool.length} top cars.`);
    for (let i = 0; i < cars.length; i++) {
      if (i < bestPool.length) {
        cars[i].brain = JSON.parse(JSON.stringify(bestPool[i]));
      } else {
        cars[i].brain = NeuralNetwork.mutateFromPool(bestPool, threshold);
      }
    }
  } else {
    updateCarsWithBrain();
  }
  cars.push(
    new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
  );
  console.log(`Training restarted with ${N} cars.`);
}

function generateTraffic() {
  // Create dummy traffic cars
  const traffic = [
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
  return traffic;
}

/**
 * Generates an array of AI-controlled Car instances.
 * @param n - The number of cars to generate.
 * @returns An array of Car objects.
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
  const sortedCars = cars
    .filter((c) => c.brain && c.type !== 'KEYS')
    .sort((a, b) => a.y - b.y);
  const bestPool = sortedCars.slice(0, 5).map((c) => c.brain);
  if (bestPool.length > 0) {
    localStorage.setItem('bestBrains', JSON.stringify(bestPool));
    // Also save the single best for backward compatibility
    localStorage.setItem('bestBrain', JSON.stringify(bestPool[0]));
    console.log(`Saved top ${bestPool.length} brains.`);
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

// Start the animation loop
animate();
/**
 * The main animation loop function. Updates and draws the simulation state.
 * @param time - The timestamp provided by requestAnimationFrame (optional).
 */
function animate(time) {
  // Update traffic cars
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders);
  }
  // Update AI cars
  const polygons = [...road.borders, ...traffic.map((c) => c.polygon)];
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(polygons);
  }
  // Find the best car (the one that has traveled furthest up the screen - lowest y value)
  // Using non-null assertion assuming 'cars' array is never empty and 'find' will succeed.
  bestCar = cars.find((c) => c.y === Math.min(...cars.map((c) => c.y)));
  // Adjust canvas heights to fill window (can cause reflow, consider optimizing if needed)
  gameCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;
  // --- Draw Game Canvas ---
  gameCtx.save();
  // Center the view on the best car vertically
  gameCtx.translate(0, -bestCar.y + gameCanvas.height * 0.7);
  // Draw the road
  road.draw(gameCtx);
  // Draw traffic cars
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(gameCtx);
  }
  const drawMasks = N <= 300; // Only draw masks if there are fewer than 300 cars for performance
  // Draw AI cars with transparency
  gameCtx.globalAlpha = 0.2;
  // Draw AI cars with transparency
  gameCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(gameCtx, false, drawMasks);
  }
  // Draw the best car without transparency (and potentially with sensors/details)
  gameCtx.globalAlpha = 1;
  bestCar.draw(gameCtx, true, drawMasks);
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
  // Request the next frame
  requestAnimationFrame(animate);
}
