const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = constants.gameCanvasWidth;
gameCanvas.height = window.innerHeight;
const gameCtx = gameCanvas.getContext('2d');

const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = constants.networkCanvasWidth;
networkCanvas.height = window.innerHeight - 300;
const networkCtx = networkCanvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMapCanvas');
miniMapCanvas.width = constants.miniMapCanvasWidth;
miniMapCanvas.height = window.innerHeight - 300;

//World loaded as regular js file attached to index.html
// const worldString = localStorage.getItem('world');
// const worldInfo = worldString ? JSON.parse(worldString) : null;
// const world = worldInfo ? World.load(worldInfo) : new World(new Graph());

const viewport = new Viewport(gameCanvas, world.zoom, world.offset);
const miniMap = new MiniMap(miniMapCanvas, world.graph, constants.miniMapCanvasWidth);

// const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);

// const trafficDirections = new Point(0, -1);
// const trafficStartAngle = -angle(trafficDirections) + Math.PI / 2;
const traffic = [
  // new Car(road.getLaneCenter(1), -100, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(0), -300, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(2), -300, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(0), -500, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(1), -500, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(1), -700, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
  // new Car(road.getLaneCenter(2), -700, 30, 50, 'DUMMY', trafficStartAngle, 2, getRandomColor()),
];

const N = 100;
const cars = generateCars(N);
let bestCar = cars[0];
if (localStorage.getItem('bestBrain')) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
    if (i !== 0) {
      NeuralNetwork.mutate(cars[i].brain, constants.networkMutateAmount);
    }
  }
}

let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
  world.generateCorridor(bestCar, target.center);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
} else {
  roadBorders = [
    // ...world.buildings
    //   .map((b) => b.base.segments)
    //   .flat()
    //   .map((s) => [s.p1, s.p2]),
    ...world.roadBorders.map((s) => [s.p1, s.p2]),
  ];
}

function generateCars(n) {
  const startMarkings = world.markings.filter((m) => m instanceof Start);
  const startPoint = startMarkings.length ? startMarkings[0].center : new Point(100, 100);
  const direction = startMarkings.length ? startMarkings[0].directionVector : new Point(0, -1);
  const startAngle = -angle(direction) + Math.PI / 2;

  const cars = [];
  for (let i = 1; i <= n; i++) {
    // cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, 'KEYS', 3, 'blue'));
    const car = new Car(startPoint.x, startPoint.y, 30, 50, 'AI', startAngle, 3, 'blue');
    car.load(carInfo);
    cars.push(car);
  }
  return cars;
}

function save() {
  localStorage.setItem('bestBrain', JSON.stringify(bestCar.brain));
}
function discard() {
  localStorage.removeItem('bestBrain');
}

animate();

function animate(time) {
  // update traffic cars and play cars data
  for (let i = 0; i < traffic.length; i++) {
    // traffic[i].update(road.borders, []);
    traffic[i].update(roadBorders, []);
  }
  for (let i = 0; i < cars.length; i++) {
    // cars[i].update(road.borders, traffic);
    cars[i].update(roadBorders, traffic);
  }

  // Fitness function
  // bestCar = cars.find((c) => c.y === Math.min(...cars.map((c) => c.y))); // the hightest car on game canvas
  bestCar = cars.find((c) => c.fitness === Math.max(...cars.map((c) => c.fitness))); // the hightest car on game canvas

  world.cars = cars;
  world.bestCar = bestCar;

  miniMap.cars = cars;

  viewport.offset.x = -bestCar.x;
  viewport.offset.y = -bestCar.y;

  // draw Game canvas
  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  world.draw(gameCtx, viewPoint, false);
  miniMap.update(viewPoint);

  // gameCtx.save();
  // gameCtx.translate(0, -bestCar.y + gameCanvas.height * 0.7);

  // road.draw(gameCtx);
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(gameCtx);
  }

  // gameCtx.globalAlpha = 0.2;
  // for (let i = 0; i < cars.length; i++) {
  //   cars[i].draw(gameCtx);
  // }
  // gameCtx.globalAlpha = 1;
  // bestCar.draw(gameCtx, true);

  // gameCtx.restore();

  // draw Network canvas
  networkCtx.lineDashOffset = -time / 50;
  networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
  Visualizer.drawNetwork(networkCtx, bestCar.brain);

  requestAnimationFrame(animate);
}
