class Race {
  gameCanvas: HTMLCanvasElement;
  gameCtx: CanvasRenderingContext2D;
  cameraCanvas: HTMLCanvasElement;
  cameraCtx: CanvasRenderingContext2D;
  miniMapCanvas: HTMLCanvasElement;
  controls: Controls | null;

  world!: World;
  camera: Camera | null = null;
  viewport: Viewport | null = null;
  miniMap: MiniMap | null = null;

  N: number = 10;
  cars: Car[] | null = null;
  myCar: Car | null = null;
  roadBorders: [Point, Point][] | null = null;

  frameCount: number = 0;
  started: boolean = false;

  loadWorldInput: HTMLInputElement | null = null;
  statistics!: HTMLElement;
  counter!: HTMLElement;

  constructor(
    gameCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    controls: Controls | null = null,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d')!;

    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d')!;

    this.miniMapCanvas = miniMapCanvas;
    this.controls = controls;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo: World | null = worldString
        ? JSON.parse(worldString)
        : null;
      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // todo: fix global world
    }

    if (this.controls && this.myCar) {
      this.myCar.controls = this.controls;
    }
  }

  generateCars(n: number, type: 'AI' | 'KEYS'): Car[] {
    const startMarkings = this.world.markings.filter(
      (m): m is Start => m instanceof Start,
    );
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);
    const startAngle = -angle(direction) + Math.PI / 2;

    const cars: Car[] = [];
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

      if (typeof carInfo !== 'undefined') {
        car.load(carInfo);
      }
      cars.push(car);
    }
    return cars;
  }

  #addEventListeners(): void {
    this.loadWorldInput = document.getElementById(
      'loadWorldInput',
    ) as HTMLInputElement | null;
    // not all race games have Load World Input
    if (this.loadWorldInput) {
      this.loadWorldInput.addEventListener(
        'change',
        this.loadWorldFromFile.bind(this),
      );
    }
    this.statistics = document.getElementById('statistics')!;
    this.counter = document.getElementById('counter')!;
  }

  #initializeRace(worldInfo: World | null): void {
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

    const bestBrainString = localStorage.getItem('bestBrain');
    if (bestBrainString) {
      const bestBrain = JSON.parse(bestBrainString);
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].brain = bestBrain;
        if (i > 1) {
          // Mutate only AI cars (assuming first car is player and second the best ai)
          NeuralNetwork.mutate(this.cars[i].brain!, 0.1);
        }
      }
    }

    if (!this.myCar) throw new Error('Player car not created');
    this.camera = new Camera(this.myCar);

    const target = this.world.markings.find(
      (m): m is Target => m instanceof Target,
    );
    if (target) {
      this.world.generateCorridor(
        new Point(this.myCar.x, this.myCar.y),
        target.center,
        true,
      );
      if (!this.world.corridor) throw new Error('Corridor generation failed');
      this.roadBorders = this.world.corridor.borders.map(
        (s: Segment): [Point, Point] => [s.p1, s.p2],
      );
    } else {
      this.roadBorders = this.world.roadBorders.map(
        (s: Segment): [Point, Point] => [s.p1, s.p2],
      );
    }

    if (this.world.corridor) {
      const miniMapGraph = new Graph([], this.world.corridor.skeleton);
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        miniMapGraph,
        this.miniMapCanvas.width,
        0.1,
      );
    } else {
      this.miniMap = new MiniMap(
        this.miniMapCanvas,
        this.world.graph,
        this.miniMapCanvas.width,
      );
    }
    this.miniMap.cars = this.cars;

    this.statistics.innerHTML = ''; // Clear previous stats
    for (let i = 0; i < this.cars.length; i++) {
      const div = document.createElement('div');
      div.id = 'stat_' + i;
      div.innerText = String(i);
      div.style.color = this.cars[i].color;
      div.classList.add('stat');
      this.statistics.appendChild(div);
    }

    this.animate();
    this.startCounter();
  }

  loadWorldFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const worldFile = input.files?.[0];

    if (!worldFile) {
      alert('No file selected');
      return;
    }

    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = (event) => this.#onLoadWorldFromFileRead(event);
  }

  #onLoadWorldFromFileRead(e: ProgressEvent<FileReader>): void {
    if (!e.target?.result) {
      alert('Could not read file content');
      return;
    }
    const worldFileContent = e.target.result as string;

    let worldJsonString: string | null = null;
    try {
      // Attempt to extract JSON assuming format `variableName = ({...});` or just `({...})`
      const startIndex = worldFileContent.indexOf('(');
      const endIndex = worldFileContent.lastIndexOf(')');
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        worldJsonString = worldFileContent.substring(startIndex + 1, endIndex);
      } else if (
        worldFileContent.trim().startsWith('{') &&
        worldFileContent.trim().endsWith('}')
      ) {
        // Handle case where it's just the JSON object
        worldJsonString = worldFileContent.trim();
      }
    } catch (error) {
      console.error('Error processing world file content:', error);
      alert('Error processing world file content. Check console for details.');
      return;
    }

    if (!worldJsonString) {
      alert(
        'Could not extract world data from the file. Ensure it contains a valid JSON object within parentheses or as the main content.',
      );
      return;
    }

    try {
      const worldInfo = JSON.parse(worldJsonString);
      this.#initializeRace(worldInfo);
    } catch (error) {
      console.error('Error parsing world JSON:', error);
      alert('Failed to parse world data. Ensure the file contains valid JSON.');
      return;
    }
  }

  updateCarProgress(car: Car): void {
    if (!this.world.corridor) return;

    const carPoint = new Point(car.x, car.y);

    if (!car.finishTime) {
      car.progress = 0;
      const carSegment = getNearestSegment(
        carPoint,
        this.world.corridor.skeleton,
      );
      if (!carSegment) return; // Could not find nearest segment

      for (let i = 0; i < this.world.corridor.skeleton.length; i++) {
        const segment = this.world.corridor.skeleton[i];
        if (segment.equals(carSegment)) {
          const projection = segment.projectPoint(carPoint);
          const firstPartOfSegment = new Segment(segment.p1, projection.point);
          car.progress += firstPartOfSegment.length();
          break;
        } else {
          car.progress += segment.length();
        }
      }
      const totalDistance = this.world.corridor.skeleton.reduce(
        (acc: number, segment: Segment) => acc + segment.length(),
        0,
      );

      if (totalDistance === 0) return; // Avoid division by zero

      car.progress /= totalDistance;
      if (car.progress >= 1) {
        car.progress = 1;
        car.finishTime = this.frameCount;
        if (car === this.myCar) {
          taDaa();
        }
      }
    }
  }

  startCounter(): void {
    if (!this.counter) return;

    this.counter.innerText = '3';
    beep(400);
    setTimeout(() => {
      if (!this.counter) return;
      this.counter.innerText = '2';
      beep(400);
      setTimeout(() => {
        if (!this.counter) return;
        this.counter.innerText = '1';
        beep(400);
        setTimeout(() => {
          if (!this.counter) return;
          this.counter.innerText = 'GO!';
          beep(700);
          setTimeout(() => {
            if (!this.counter) return;
            this.counter.innerText = '';
            this.started = true;
            this.frameCount = 0;
            if (this.myCar) {
              this.myCar.engine = new Engine();
            }
            // Special code part for video camera controls
            if (
              this.controls &&
              typeof CameraControls !== 'undefined' && // Keep runtime check if CameraControls might not exist
              this.controls instanceof CameraControls
            ) {
              this.controls.saveExpectedSize();
            }
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }

  handleCollisionWithRoadBorders(car: Car): void {
    const bordersToCheck: Segment[] = this.world.corridor
      ? this.world.corridor.skeleton
      : this.world.roadBorders;

    if (bordersToCheck.length === 0) return;

    const segment = getNearestSegment(new Point(car.x, car.y), bordersToCheck);
    if (!segment) return;

    const correctors = car.polygon.map((p: Point) => {
      const proj = segment.projectPoint(p);
      // Use p2 if projection offset is beyond segment end (approx > 1)
      const projPoint = proj.offset > 1 ? segment.p2 : proj.point;
      return subtract(projPoint, p);
    });

    if (correctors.length === 0) return;

    const magnitudes = correctors.map((p: Point) => magnitude(p));
    const maxMagnitude = Math.max(...magnitudes);

    // Find the first corrector with the max magnitude
    const correctorIndex = magnitudes.findIndex((mag) => mag === maxMagnitude);
    if (correctorIndex === -1) return; // Should not happen if correctors is not empty

    const corrector = correctors[correctorIndex];
    const normalizedCorrector = normalize(corrector);

    // Assuming polygon points are [front-right, front-left, back-left, back-right]
    // Indices 0 and 3 (right side) vs 1 and 2 (left side) might be more robust
    // This logic seems specific to the car's polygon structure.
    if (correctorIndex === 0 || correctorIndex === 3) {
      // Assuming these are right-side points
      car.angle += 0.1;
    } else {
      // Assuming these are left-side points (1 and 2)
      car.angle -= 0.1;
    }

    car.x += normalizedCorrector.x;
    car.y += normalizedCorrector.y;
    car.damaged = false; // Reset damage after correction? Seems intended.
  }

  draw(): void {
    if (
      !this.cars ||
      !this.viewport ||
      !this.myCar ||
      !this.camera ||
      !this.miniMap
    )
      return;

    if (this.started) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].update(this.roadBorders ?? [], []);
      }
    }

    for (const car of this.cars) {
      if (car.damaged) {
        this.handleCollisionWithRoadBorders(car);
      }
    }

    this.world.cars = this.cars;
    this.world.bestCar = this.myCar;

    this.viewport.offset.x = -this.myCar.x;
    this.viewport.offset.y = -this.myCar.y;

    this.viewport.reset();
    // Use scale function if Point has scale method or it's a global function
    const viewPoint = scale(this.viewport.getOffset(), -1); // Or scale(this.viewport.getOffset(), -1)
    this.world.draw(this.gameCtx, viewPoint, false);
    this.miniMap.update(viewPoint);
    this.miniMapCanvas.style.transform = `rotate(${this.myCar.angle}rad)`;

    for (let i = 0; i < this.cars.length; i++) {
      this.updateCarProgress(this.cars[i]);
    }
    // Sort cars based on progress (descending)
    this.cars.sort((a, b) => b.progress! - a.progress!);

    // Update statistics display
    for (let i = 0; i < this.cars.length; i++) {
      const stat = document.getElementById('stat_' + i) as HTMLElement;
      stat.style.color =
        this.cars[i].type === 'AI' ? 'white' : this.cars[i].color;
      stat.innerText = `${i + 1}: ${this.cars[i].name} ${this.cars[i].damaged ? '💀' : ''}`;
      // stat.innerText = `${i + 1}: ${(this.cars[i].progress * 100).toFixed(1)}%`;
      stat.style.backgroundColor =
        this.cars[i].type === 'AI' ? 'black' : 'white';
      if (this.cars[i].finishTime) {
        stat.innerHTML +=
          '<span style="float: right;">' +
          (this.cars[i].finishTime! / 60).toFixed(1) + // Assuming 60 FPS
          's </span>';
      }
    }

    this.camera.move(this.myCar);
    // this.camera.draw(this.gameCtx); // Optional drawing of camera bounds
    this.camera.render(this.cameraCtx, this.world);

    if (this.started) {
      this.frameCount++;
    }
  }

  animate(): void {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
