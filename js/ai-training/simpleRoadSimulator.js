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
 * Loads the saved brain and applies mutations based on the threshold.
 */
function updateCarsWithBrain() {
  const storedBrain = localStorage.getItem('bestBrain');
  const threshold = parseFloat(thresholdInput.value) || 0.1;
  if (storedBrain) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].brain = JSON.parse(storedBrain);
      if (i !== 0) {
        NeuralNetwork.mutate(cars[i].brain, threshold);
      }
    }
  }
}

cars.push(
  new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', startAngle, 3, 'red'),
);
/**
 * Restarts the training with current UI settings.
 */
function restart() {
  N = parseInt(carCountInput.value);
  cars = generateCars(N);
  bestCar = cars[0];
  updateCarsWithBrain();
  traffic = generateTraffic();
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
 * Saves the brain of the best performing car to localStorage.
 */
function save() {
  if (bestCar && bestCar.brain) {
    localStorage.setItem('bestBrain', JSON.stringify(bestCar.brain));
    console.log('Best brain saved.');
  } else {
    console.warn('Could not save brain: bestCar or bestCar.brain is missing.');
  }
}

/**
 * Removes the saved brain from localStorage.
 */
function discard() {
  localStorage.removeItem('bestBrain');
  console.log('Stored brain discarded.');
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
