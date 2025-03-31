class Race {
  constructor(gameCanvas, cameraCanvas, miniMapCanvas, controls = null) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    this.controls = controls;

    this.localWorld = null;
    this.camera = null;
    this.viewport = null;
    this.miniMap = null;

    this.N = 10;
    this.cars = null;
    this.myCar = null;
    this.roadBorders = null;

    this.frameCount = 0;
    this.started = false;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;

      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // global world info
    }

    if (this.controls) {
      this.myCar.controls = this.controls;
    }
  }

  generateCars(n, type) {
    const startMarkings = this.localWorld.markings.filter(
      (m) => m instanceof Start,
    );
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

  #addEventListeners() {
    this.loadWorldInput = document.getElementById('loadWorldInput');
    if (this.loadWorldInput) {
      this.loadWorldInput.addEventListener(
        'change',
        this.loadWorldFromFile.bind(this),
      );
    }
    this.statistics = document.getElementById('statistics');
    this.counter = document.getElementById('counter');
  }

  #initializeRace(worldInfo) {
    this.localWorld = worldInfo
      ? World.load(worldInfo)
      : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.localWorld.zoom,
      this.localWorld.offset,
    );

    this.cars = this.generateCars(1, 'KEYS').concat(
      this.generateCars(this.N, 'AI'),
    );
    this.myCar = this.cars[0];
    if (localStorage.getItem('bestBrain')) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
        if (i > 1) {
          NeuralNetwork.mutate(this.cars[i].brain, 0.1);
        }
      }
    }

    this.camera = new Camera(this.myCar);

    const target = this.localWorld.markings.find((m) => m instanceof Target);
    if (target) {
      this.localWorld.generateCorridor(this.myCar, target.center, true);
      this.roadBorders = this.localWorld.corridor.borders.map((s) => [
        s.p1,
        s.p2,
      ]);
    } else {
      this.roadBorders = [
        ...this.localWorld.roadBorders.map((s) => [s.p1, s.p2]),
      ];
    }

    if (this.localWorld.corridor) {
      // mini map without details, only
      const miniMapGraph = new Graph([], this.localWorld.corridor.skeleton);

      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        miniMapGraph,
        this.miniMapCanvas.width,
        this.cars,
        0.1,
      );
    } else {
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        this.localWorld.graph,
        this.miniMapCanvas.width,
        this.cars,
      );
    }

    for (let i = 0; i < this.cars.length; i++) {
      const div = document.createElement('div');
      div.id = 'stat_' + i;
      div.innerText = i;
      div.style.color = this.cars[i].color;
      div.classList.add('stat');
      this.statistics.appendChild(div);
    }
  }

  loadWorldFromFile(e) {
    const worldFile = e.target.files[0];

    if (!worldFile) {
      alert('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = this.#onLoadWorldFromFileRead.bind(this);
  }

  #onLoadWorldFromFileRead(e) {
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

    this.#initializeRace(worldInfo);
  }

  updateCarProgress(car) {
    if (!this.localWorld.corridor) return;

    if (!car.finishTime) {
      car.progress = 0;
      const carSegment = getNearestSegment(
        car,
        this.localWorld.corridor.skeleton,
      );
      for (let i = 0; i < this.localWorld.corridor.skeleton.length; i++) {
        const segment = this.localWorld.corridor.skeleton[i];
        if (segment.equals(carSegment)) {
          const projection = segment.projectPoint(car);
          const firstPartOfSegment = new Segment(segment.p1, projection.point);
          car.progress += firstPartOfSegment.length();
          break;
        } else {
          car.progress += segment.length();
        }
      }
      const totalDistance = this.localWorld.corridor.skeleton.reduce(
        (acc, segment) => acc + segment.length(),
        0,
      );
      car.progress /= totalDistance;
      if (car.progress >= 1) {
        car.progress = 1;
        car.finishTime = this.frameCount;
        if (car == this.myCar) {
          taDaa();
        }
      }
    }
  }

  startCounter() {
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
            this.counter.innerText = '';
            this.started = true;
            this.frameCount = 0;
            this.myCar.engine = new Engine();
            // Special code part for video camera controls
            if (
              this.controls &&
              typeof CameraControls !== 'undefined' &&
              this.controls instanceof CameraControls
            ) {
              this.controls.saveExpectedSize();
            }
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  handleCollisionWithRoadBorders(car) {
    const segment = getNearestSegment(
      car,
      this.localWorld.corridor
        ? this.localWorld.corridor.skeleton
        : this.localWorld.roadBorders,
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

  draw() {
    if (this.started) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].update(this.roadBorders, []);
      }
    }

    for (const car of this.cars) {
      if (car.damaged) {
        this.handleCollisionWithRoadBorders(car);
      }
    }

    this.localWorld.cars = this.cars;
    this.localWorld.bestCar = this.myCar;

    this.viewport.offset.x = -this.myCar.x;
    this.viewport.offset.y = -this.myCar.y;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.localWorld.draw(this.gameCtx, viewPoint, false);
    this.miniMap.update(viewPoint);
    this.miniMapCanvas.style.transform = `rotate(${this.myCar.angle}rad)`;

    for (let i = 0; i < this.cars.length; i++) {
      this.updateCarProgress(this.cars[i]);
    }
    this.cars.sort((a, b) => b.progress - a.progress);

    for (let i = 0; i < this.cars.length; i++) {
      const stat = document.getElementById('stat_' + i);
      stat.style.color =
        this.cars[i].type === 'AI' ? 'white' : this.cars[i].color;
      // stat.innerText = `${i + 1}: ${(this.cars[i].progress * 100).toFixed(1)}%`;
      stat.innerText = `${i + 1}: ${this.cars[i].name} ${this.cars[i].damaged ? '💀' : ''}`;
      stat.style.backgroundColor =
        this.cars[i].type === 'AI' ? 'black' : 'white';
      if (this.cars[i].finishTime) {
        stat.innerHTML +=
          '<span style="float: right;">' +
          (this.cars[i].finishTime / 60).toFixed(1) +
          's </span>';
      }
    }

    this.camera.move(this.myCar);
    this.camera.draw(this.gameCtx);
    this.camera.render(this.cameraCtx, this.localWorld);

    this.frameCount++;
  }

  animate() {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
