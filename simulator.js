const rightPanelWidth = 300;
const buttonsPanelWidth = 30;

const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = window.innerWidth - rightPanelWidth - buttonsPanelWidth;
gameCanvas.height = window.innerHeight;
const gameCtx = gameCanvas.getContext('2d');

const networkCanvas = document.getElementById('networkCanvas');
networkCanvas.width = rightPanelWidth;
networkCanvas.height = window.innerHeight - rightPanelWidth;
const networkCtx = networkCanvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMapCanvas');
miniMapCanvas.width = rightPanelWidth;
miniMapCanvas.height = window.innerHeight - rightPanelWidth;

const loadWorldInput = document.getElementById('loadWorldInput');
loadWorldInput.addEventListener('change', loadWorldFromFile);

let localWorld;
let viewport;
let miniMap;

const traffic = [];
const N = 1;
let cars;
let bestCar;
let roadBorders = [];

if (typeof world === 'undefined') {
  const worldString = localStorage.getItem('world');
  const worldInfo = worldString ? JSON.parse(worldString) : null;
  initWorld(worldInfo);
} else {
  initWorld(world); // global world info
}

function initWorld(worldInfo) {
  localWorld = worldInfo ? World.load(worldInfo) : new World(new Graph());
  viewport = new Viewport(gameCanvas, localWorld.zoom, localWorld.offset);
  miniMap = new MiniMap(miniMapCanvas, localWorld.graph, rightPanelWidth);

  cars = generateCars(1, 'KEYS').concat(generateCars(N, 'AI'));
  bestCar = cars[0];
  if (localStorage.getItem('bestBrain')) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
      if (i !== 0) {
        NeuralNetwork.mutate(cars[i].brain, 0.1);
      }
    }
  }

  const target = localWorld.markings.find((m) => m instanceof Target);
  if (target) {
    localWorld.generateCorridor(bestCar, target.center);
    roadBorders = localWorld.corridor.borders.map((s) => [s.p1, s.p2]);
  } else {
    roadBorders = [
      // ...localWorld.buildings
      //   .map((b) => b.base.segments)
      //   .flat()
      //   .map((s) => [s.p1, s.p2]),
      ...localWorld.roadBorders.map((s) => [s.p1, s.p2]),
    ];
  }
}

function generateCars(n, type) {
  const startMarkings = localWorld.markings.filter((m) => m instanceof Start);
  const startPoint = startMarkings.length
    ? startMarkings[0].center
    : new Point(100, 100);
  const direction = startMarkings.length
    ? startMarkings[0].directionVector
    : new Point(0, -1);
  const startAngle = -angle(direction) + Math.PI / 2;

  const cars = [];
  for (let i = 1; i <= n; i++) {
    const color = type === 'AI' ? getRandomColor() : 'blue';
    const car = new Car(
      startPoint.x,
      startPoint.y,
      30,
      50,
      type,
      startAngle,
      3,
      color,
    );
    car.name = type === 'AI' ? 'AI ' + i : 'Player ' + i;

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

function loadWorldFromFile(e) {
  const worldFile = e.target.files[0];

  if (!worldFile) {
    alert('No file selected');
    return;
  }

  const reader = new FileReader();
  reader.readAsText(worldFile);
  reader.onload = onLoadWorldFromFileRead;
}
function onLoadWorldFromFileRead(e) {
  const worldFileContent = e.target.result;

  const removeWorldVariableDeclaration = worldFileContent
    ? worldFileContent.substring(
        worldFileContent.indexOf('(') + 1,
        worldFileContent.lastIndexOf(')'),
      )
    : null;

  if (!removeWorldVariableDeclaration) {
    alert('Wrong file content. use .world extension');
    return;
  }

  const worldInfo = JSON.parse(removeWorldVariableDeclaration);

  initWorld(worldInfo);
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
  bestCar = cars.find(
    (c) => c.fitness === Math.max(...cars.map((c) => c.fitness)),
  );

  localWorld.cars = cars;
  localWorld.bestCar = bestCar; // cars[0];

  miniMap.cars = cars;

  viewport.offset.x = -bestCar.x;
  viewport.offset.y = -bestCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  localWorld.draw(gameCtx, viewPoint, false);
  miniMap.update(viewPoint);

  for (let i = 0; i < traffic.length; i++) {
    traffic[i].draw(gameCtx);
  }

  networkCtx.lineDashOffset = -time / 50;
  networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
  Visualizer.drawNetwork(networkCtx, bestCar.brain);

  requestAnimationFrame(animate);
}
