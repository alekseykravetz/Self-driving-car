class CameraViewSimulator {
  constructor(gameCanvas, cameraCanvas, miniMapCanvas) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;

    this.world = null;
    this.camera = null;
    this.viewport = null;
    this.miniMap = null;

    this.N = 0;
    this.cars = null;
    this.myCar = null;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;

      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // global world info
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
    this.loadWorldInput = document.getElementById('loadWorldInput');
    if (this.loadWorldInput) {
      this.loadWorldInput.addEventListener(
        'change',
        this.loadWorldFromFile.bind(this),
      );
    }
  }

  #initializeRace(worldInfo) {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
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

    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width,
    );
    this.miniMap.cars = this.cars;
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

  draw() {
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].update([], []);
    }

    this.world.cars = this.cars;
    this.world.bestCar = this.myCar;

    this.viewport.offset.x = -this.myCar.x;
    this.viewport.offset.y = -this.myCar.y;

    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);
    this.world.draw(this.gameCtx, viewPoint, false);
    this.miniMap.update(viewPoint);
    this.miniMapCanvas.style.transform = `rotate(${this.myCar.angle}rad)`;

    this.camera.move(this.myCar);
    this.camera.draw(this.gameCtx);
    this.camera.render(this.cameraCtx, this.world, this.gameCtx);
  }

  animate() {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
