const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = 200;
gameCanvas.style.backgroundColor = 'lightgray';
const gameCtx = gameCanvas.getContext('2d');

const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = 300;
const networkCtx = networkCanvas.getContext('2d');

const road = new Road(gameCanvas.width / 2, gameCanvas.width * 0.9);

const startAngle = angle(new Point(0, -1)) + Math.PI / 2;

const N = 100;
const cars = generateCars(N);

let bestCar = cars[0];

if (localStorage.getItem('bestBrain')) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
    if (i !== 0) {
      NeuralNetwork.mutate(cars[i].brain, 0.1);
    }
  }
}

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

function generateCars(n) {
  const cars = [];
  for (let i = 1; i <= n; i++) {
    cars.push(
      new Car(road.getLaneCenter(1), 100, 30, 50, 'AI', startAngle, 3, 'blue'),
    );
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
    traffic[i].update(road.borders, []);
  }
  for (let i = 0; i < cars.length; i++) {
    cars[i].update(road.borders, traffic);
  }

  // Fitness function
  bestCar = cars.find((c) => c.y === Math.min(...cars.map((c) => c.y))); // the hightest car on game canvas

  // draw Game canvas
  gameCanvas.height = window.innerHeight;
  networkCanvas.height = window.innerHeight;

  gameCtx.save();
  gameCtx.translate(0, -bestCar.y + gameCanvas.height * 0.7);

  road.draw(gameCtx);
  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(gameCtx);
  }

  gameCtx.globalAlpha = 0.2;
  for (let i = 0; i < cars.length; i++) {
    cars[i].draw(gameCtx);
  }
  gameCtx.globalAlpha = 1;
  bestCar.draw(gameCtx, true);

  gameCtx.restore();

  // draw Network canvas
  networkCtx.lineDashOffset = -time / 50;
  Visualizer.drawNetwork(networkCtx, bestCar.brain);

  requestAnimationFrame(animate);
}
