const rightPanelWidth = 300;

const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');

const cameraCanvas = document.getElementById('cameraCanvas');
const cameraCtx = cameraCanvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMapCanvas');

const N = 1;
let cars;
let myCar;
let roadBorders = [];

let localWorld;
let viewport;
let camera;
let miniMap;

const loadWorldInput = document.getElementById('loadWorldInput');
if (loadWorldInput) {
  loadWorldInput.addEventListener('change', loadWorldFromFile);
}

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

  cars = generateCars(1, 'KEYS').concat(generateCars(N, 'AI'));
  myCar = cars[0];
  if (localStorage.getItem('bestBrain')) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
      if (i > 1) {
        NeuralNetwork.mutate(cars[i].brain, 0.1);
      }
    }
  }

  camera = new Camera(myCar);

  const target = localWorld.markings.find((m) => m instanceof Target);
  if (target) {
    localWorld.generateCorridor(myCar, target.center, true);
    roadBorders = localWorld.corridor.borders.map((s) => [s.p1, s.p2]);
  } else {
    roadBorders = [...localWorld.roadBorders.map((s) => [s.p1, s.p2])];
  }

  if (localWorld.corridor) {
    // mini map without details, only
    const miniMapGraph = new Graph([], localWorld.corridor.skeleton);

    miniMap = new MiniMap(
      miniMapCanvas,
      miniMapGraph,
      rightPanelWidth,
      cars,
      0.1,
    );
  } else {
    miniMap = new MiniMap(
      miniMapCanvas,
      localWorld.graph,
      rightPanelWidth,
      cars,
    );
  }

  for (let i = 0; i < cars.length; i++) {
    const div = document.createElement('div');
    div.id = 'stat_' + i;
    div.innerText = i;
    div.style.color = cars[i].color;
    div.classList.add('stat');
    statistics.appendChild(div);
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

let frameCount = 0;
let started = false;

function updateCarProgress(car) {
  if (!localWorld.corridor) return;

  if (!car.finishTime) {
    car.progress = 0;
    const carSegment = getNearestSegment(car, localWorld.corridor.skeleton);
    for (let i = 0; i < localWorld.corridor.skeleton.length; i++) {
      const segment = localWorld.corridor.skeleton[i];
      if (segment.equals(carSegment)) {
        const projection = segment.projectPoint(car);
        const firstPartOfSegment = new Segment(segment.p1, projection.point);
        car.progress += firstPartOfSegment.length();
        break;
      } else {
        car.progress += segment.length();
      }
    }
    const totalDistance = localWorld.corridor.skeleton.reduce(
      (acc, segment) => acc + segment.length(),
      0,
    );
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

function handleCollisionWithRoadBorders(car) {
  const segment = getNearestSegment(
    car,
    localWorld.corridor ? localWorld.corridor.skeleton : localWorld.roadBorders,
  );
  const correctors = car.polygon.map((p) => {
    const proj = segment.projectPoint(p);
    const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
    return subtract(projPoint, p);
  });

  const maxMagnitude = Math.max(...correctors.map((p) => magnitude(p)));
  const corrector = correctors.find((p) => magnitude(p) === maxMagnitude);
  const normalizedCorrector = normalize(corrector);

  if (corrector === correctors[0] || corrector === correctors[2]) {
    car.angle += 0.1;
  } else {
    car.angle -= 0.1;
  }

  car.x += normalizedCorrector.x;
  car.y += normalizedCorrector.y;
  car.damaged = false;
}

function animate() {
  if (started) {
    for (let i = 0; i < cars.length; i++) {
      cars[i].update(roadBorders, []);
    }
  }

  for (const car of cars) {
    if (car.damaged) {
      handleCollisionWithRoadBorders(car);
    }
  }

  localWorld.cars = cars;
  localWorld.bestCar = myCar;

  viewport.offset.x = -myCar.x;
  viewport.offset.y = -myCar.y;

  viewport.reset();
  const viewPoint = scale(viewport.getOffset(), -1);
  localWorld.draw(gameCtx, viewPoint, false);
  miniMap.update(viewPoint);
  miniMapCanvas.style.transform = `rotate(${myCar.angle}rad)`;

  for (let i = 0; i < cars.length; i++) {
    updateCarProgress(cars[i]);
  }
  cars.sort((a, b) => b.progress - a.progress);

  for (let i = 0; i < cars.length; i++) {
    const stat = document.getElementById('stat_' + i);
    stat.style.color = cars[i].type === 'AI' ? 'white' : cars[i].color;
    // stat.innerText = `${i + 1}: ${(cars[i].progress * 100).toFixed(1)}%`;
    stat.innerText = `${i + 1}: ${cars[i].name} ${cars[i].damaged ? '💀' : ''}`;
    stat.style.backgroundColor = cars[i].type === 'AI' ? 'black' : 'white';
    if (cars[i].finishTime) {
      stat.innerHTML +=
        '<span style="float: right;">' +
        (cars[i].finishTime / 60).toFixed(1) +
        's </span>';
    }
  }

  camera.move(myCar);
  camera.draw(gameCtx);
  camera.render(cameraCtx, localWorld);

  frameCount++;
  requestAnimationFrame(animate);
}
