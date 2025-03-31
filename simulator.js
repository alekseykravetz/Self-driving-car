class Simulator {
  constructor(gameCanvas, networkCanvas, miniMapCanvas) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;

    this.world = null;
    this.viewport = null;
    this.miniMap = null;

    this.N = 10;
    this.cars = null;
    this.bestCar = null;
    this.roadBorders = null;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;

      this.#initializeSimulator(worldInfo);
    } else {
      this.#initializeSimulator(world); // global world info
    }
  }

  generateCars(n, type) {
    const startMarkings = this.world.markings.filter((m) => m instanceof Start);
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
    this.saveBtn = document.getElementById('saveBtn');
    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.discardBtn = document.getElementById('discardBtn');
    this.discardBtn.addEventListener('click', this.discard.bind(this));
    this.loadWorldInput = document.getElementById('loadWorldInput');
    this.loadWorldInput.addEventListener(
      'change',
      this.loadWorldFromFile.bind(this),
    );
  }

  #initializeSimulator(worldInfo) {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width,
    );

    this.cars = this.generateCars(1, 'KEYS').concat(
      this.generateCars(this.N, 'AI'),
    );
    this.bestCar = this.cars[0];
    if (localStorage.getItem('bestBrain')) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].brain = JSON.parse(localStorage.getItem('bestBrain'));
        if (i > 1) {
          NeuralNetwork.mutate(this.cars[i].brain, 0.1);
        }
      }
    }

    const target = this.world.markings.find((m) => m instanceof Target);
    if (target) {
      this.world.generateCorridor(this.bestCar, target.center);
      this.roadBorders = this.world.corridor.borders.map((s) => [s.p1, s.p2]);
    } else {
      this.roadBorders = [
        // ...this.localWorld.buildings
        //   .map((b) => b.base.segments)
        //   .flat()
        //   .map((s) => [s.p1, s.p2]),
        ...this.world.roadBorders.map((s) => [s.p1, s.p2]),
      ];
    }
  }

  save() {
    localStorage.setItem('bestBrain', JSON.stringify(this.bestCar.brain));
  }
  discard() {
    localStorage.removeItem('bestBrain');
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

    this.#initializeSimulator(worldInfo);
  }

  draw(time) {
    for (let i = 0; i < this.cars.length; i++) {
      // this.cars[i].update(road.borders, traffic);
      this.cars[i].update(this.roadBorders, []);
    }

    // Fitness function
    this.bestCar = this.cars.find(
      (c) => c.fitness === Math.max(...this.cars.map((c) => c.fitness)),
    );

    this.world.cars = this.cars;
    this.world.bestCar = this.bestCar; // cars[0];

    this.miniMap.cars = this.cars;

    this.viewport.offset.x = -this.bestCar.x;
    this.viewport.offset.y = -this.bestCar.y;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.world.draw(this.gameCtx, viewPoint, false);
    this.miniMap.update(viewPoint);

    this.networkCtx.lineDashOffset = -time / 50;
    this.networkCtx.clearRect(
      0,
      0,
      this.networkCanvas.width,
      this.networkCanvas.height,
    );
    Visualizer.drawNetwork(this.networkCtx, this.bestCar.brain);
  }

  animate(time) {
    this.draw(time);
    requestAnimationFrame(this.animate.bind(this));
  }
}
