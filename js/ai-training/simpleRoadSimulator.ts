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

// Generate AI cars
const N: number = 100;
const cars: Car[] = generateCars(N);

// Track the best performing car (initially the first one)
let bestCar: Car = cars[0];

// Load saved brain from localStorage if available
const storedBrain = localStorage.getItem('bestBrain');
if (storedBrain) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(storedBrain);
    if (i !== 0) {
      NeuralNetwork.mutate(cars[i].brain!, 0.1);
    }
  }
}

// Create dummy traffic cars
const traffic: Car[] = [
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

/**
 * Generates an array of AI-controlled Car instances.
 * @param n - The number of cars to generate.
 * @returns An array of Car objects.
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

/**
 * Saves the brain of the best performing car to localStorage.
 */
function save(): void {
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
function discard(): void {
  localStorage.removeItem('bestBrain');
  console.log('Stored brain discarded.');
}

// Start the animation loop
animate();

/**
 * The main animation loop function. Updates and draws the simulation state.
 * @param time - The timestamp provided by requestAnimationFrame (optional).
 */
function animate(time?: number): void {
  // Update traffic cars
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].update(road.borders as Point[][], []);
  }
  // Update AI cars
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders as Point[][], traffic);
  }

  // Find the best car (the one that has traveled furthest up the screen - lowest y value)
  // Using non-null assertion assuming 'cars' array is never empty and 'find' will succeed.
  bestCar = cars.find(
    (c: Car) => c.y === Math.min(...cars.map((c: Car) => c.y)),
  )!;

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

  // Draw AI cars with transparency
  gameCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(gameCtx);
  }
  // Draw the best car without transparency (and potentially with sensors/details)
  gameCtx.globalAlpha = 1;
  bestCar.draw(gameCtx, true);

  gameCtx.restore();

  // --- Draw Network Canvas ---
  // Animate the network visualization's line dashes
  networkCtx.lineDashOffset = -(time || 0) / 50;
  // Draw the neural network of the best car
  if (bestCar && bestCar.brain) {
    Visualizer.drawNetwork(networkCtx, bestCar.brain);
  }

  // Request the next frame
  requestAnimationFrame(animate);
}
