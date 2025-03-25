const rightPanelWidth = 300;

document.body.style.flexDirection = 'column';

const gameCanvas = document.getElementById('gameCanvas');
gameCanvas.width = window.innerWidth;
gameCanvas.height = window.innerHeight / 2; // 0;
const gameCtx = gameCanvas.getContext('2d');

const cameraCanvas = document.getElementById('cameraCanvas');
cameraCanvas.width = window.innerWidth;
cameraCanvas.height = window.innerHeight / 2; // window.innerHeight;
const cameraCtx = cameraCanvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMapCanvas');
miniMapCanvas.width = rightPanelWidth;
miniMapCanvas.height = rightPanelWidth;

statistics.style.width = `${rightPanelWidth}px`;
statistics.style.height = `${window.innerHeight - 60 - rightPanelWidth}px`;

const viewport = new Viewport(gameCanvas, world.zoom, world.offset);
const miniMap = new MiniMap(miniMapCanvas, world.graph, rightPanelWidth);

const N = 100;
const cars = generateCars(1, 'KEYS').concat(generateCars(N, 'AI'));
const myCar = cars[0];
const camera = new Camera(myCar);

if (localStorage.getItem('bestBrain')) {
  for (let i = 0; i < cars.length; i++) {
    cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
    if (i > 1) {
      NeuralNetwork.mutate(cars[i].brain, 0.1);
    }
  }
}

for (let i = 0; i < cars.length; i++) {
  const div = document.createElement('div');
  div.id = 'stat_' + i;
  div.innerText = i;
  div.style.color = cars[i].color;
  div.classList.add('stat');
  statistics.appendChild(div);
}

let roadBorders = [];
const target = world.markings.find((m) => m instanceof Target);
if (target) {
  world.generateCorridor(myCar, target.center, true);
  roadBorders = world.corridor.borders.map((s) => [s.p1, s.p2]);
} else {
  roadBorders = [...world.roadBorders.map((s) => [s.p1, s.p2])];
}

function generateCars(n, type) {
  const startMarkings = world.markings.filter((m) => m instanceof Start);
  const startPoint = startMarkings.length ? startMarkings[0].center : new Point(100, 100);
  const direction = startMarkings.length ? startMarkings[0].directionVector : new Point(0, -1);
  const startAngle = -angle(direction) + Math.PI / 2;

  const cars = [];
  for (let i = 1; i <= n; i++) {
    const color = type === 'AI' ? getRandomColor() : 'blue';
    const car = new Car(startPoint.x, startPoint.y, 30, 50, type, startAngle, 3, color);
    car.name = type === 'AI' ? 'AI ' + i : 'Player ' + i;

    car.load(carInfo);
    cars.push(car);
  }
  return cars;
}

let frameCount = 0;
let started = false;

function updateCarProgress(car) {
  if (!car.finishTime) {
    car.progress = 0;
    const carSegment = getNearestSegment(car, world.corridor.skeleton);
    for (let i = 0; i < world.corridor.skeleton.length; i++) {
      const segment = world.corridor.skeleton[i];
      if (segment.equals(carSegment)) {
        const projection = segment.projectPoint(car);
        const firstPartOfSegment = new Segment(segment.p1, projection.point);
        car.progress += firstPartOfSegment.length();
        break;
      } else {
        car.progress += segment.length();
      }
    }
    const totalDistance = world.corridor.skeleton.reduce((acc, segment) => acc + segment.length(), 0);
    car.progress /= totalDistance;
    if (car.progress >= 1) {
      car.progress = 1;
      car.finishTime = frameCount;
      if (car == myCar) {
        taDaa();
      }
    }
  }
}

function startCounter() {
  counter.innerText = '3';
  beep(400);
  setTimeout(() => {
    counter.innerText = '2';
    beep(400);
    setTimeout(() => {
      counter.innerText = '1';
      beep(400);
      setTimeout(() => {
        counter.innerText = 'GO!';
        beep(700);
        setTimeout(() => {
          counter.innerText = '';
          started = true;
          frameCount = 0;
          myCar.engine = new Engine();
        }, 1000);
      }, 1000);
    }, 1000);
  }, 1000);
}

startCounter();

animate();

function animate() {
  if (started) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].update(roadBorders, []);
    }
  }
  world.cars = cars;
  world.bestCar = myCar;

  miniMap.cars = cars;

  viewport.offset.x = -myCar.x;
  viewport.offset.y = -myCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  world.draw(gameCtx, viewPoint, false);
  miniMap.update(viewPoint);

  for (let i = 0; i < cars.length; i++) {
    updateCarProgress(cars[i]);
  }
  cars.sort((a, b) => b.progress - a.progress);

  for (let i = 0; i < cars.length; i++) {
    const stat = document.getElementById('stat_' + i);
    stat.style.color = cars[i].color;
    // stat.innerText = `${i + 1}: ${(cars[i].progress * 100).toFixed(1)}%`;
    stat.innerText = `${i + 1}: ${cars[i].name} ${cars[i].damaged ? '💀' : ''}`;
    stat.style.backgroundColor = cars[i].type === 'AI' ? 'black' : 'white';
    if (cars[i].finishTime) {
      stat.innerHTML += '<span style="float: right;">' + (cars[i].finishTime / 60).toFixed(1) + 's </span>';
    }
  }

  camera.move(myCar);
  camera.draw(gameCtx);
  camera.render(cameraCtx, world);

  frameCount++;
  requestAnimationFrame(animate);
}
