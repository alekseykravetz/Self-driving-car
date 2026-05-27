class CameraViewSimulator {
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private cameraCanvas: HTMLCanvasElement;
  private cameraCtx: CanvasRenderingContext2D;
  private miniMapCanvas: HTMLCanvasElement;

  private world: World | null = null;
  private camera: Camera | null = null;
  private viewport: Viewport | null = null;
  private miniMap: MiniMap | null = null;

  private N: number = 0; // Default AI cars for this mode
  private cars: Car[] | null = null;
  private myCar: Car | null = null; // The player's car

  private loadWorldInput?: HTMLInputElement;

  constructor(
    gameCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d')!; // Assert non-null
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d')!; // Assert non-null
    this.miniMapCanvas = miniMapCanvas;

    this.#addEventListeners();

    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;

      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // note: global world
    }

    // Start animation loop
    this.animate();
  }

  // This method seems identical to the one in Simulator
  private generateCars(n: number, type: string): Car[] {
    if (!this.world) {
      console.error('World not initialized in generateCars');
      return [];
    }
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
      car.name = type === 'AI' ? `AI ${i}` : `Player ${i}`;

      // Load car config from localStorage or legacy global
      const storedCarInfo = localStorage.getItem('bestCarInfo');
      if (storedCarInfo) {
        car.load(JSON.parse(storedCarInfo));
      } else if (typeof carInfo !== 'undefined') {
        car.load(carInfo);
      }
      cars.push(car);
    }
    return cars;
  }

  #addEventListeners(): void {
    this.loadWorldInput = document.getElementById(
      'loadWorldInput',
    ) as HTMLInputElement;
    if (this.loadWorldInput) {
      this.loadWorldInput.addEventListener(
        'change',
        this.loadWorldFromFile.bind(this),
      );
    }
  }

  #initializeRace(worldInfo: World | null): void {
    console.log('Initializing race with world info:', worldInfo);
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.viewport = new Viewport(
      this.gameCanvas,
      this.world.zoom,
      this.world.offset,
    );

    // Generate cars (1 player, N AI - N is 0 by default here)
    this.cars = [
      ...this.generateCars(1, 'KEYS'),
      ...this.generateCars(this.N, 'AI'),
    ];

    if (this.cars.length === 0) {
      console.error('Failed to generate any cars during initialization.');
      // Handle this error state appropriately - maybe create a default car?
      return;
    }

    this.myCar = this.cars[0]; // Assign the first car as the player's car

    const bestBrainString = localStorage.getItem('bestBrain');
    if (bestBrainString) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].brain = JSON.parse(bestBrainString);
        if (i > 1) {
          NeuralNetwork.mutate(this.cars[i].brain!, 0.1);
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

  private loadWorldFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const worldFile = input.files?.[0];

    if (!worldFile) {
      alert('No file selected');
      input.value = ''; // Clear input
      return;
    }

    const reader = new FileReader();
    reader.onload = this.#onLoadWorldFromFileRead.bind(this);
    reader.onerror = () => {
      alert(`Error reading file: ${reader.error}`);
      input.value = ''; // Clear input on error
    };
    reader.readAsText(worldFile);
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

  private draw(): void {
    // Check for initialization before drawing
    if (
      !this.cars ||
      !this.world ||
      !this.viewport ||
      !this.miniMap ||
      !this.myCar ||
      !this.camera
    ) {
      // console.warn("Simulator draw called before full initialization.");
      return;
    }

    // Update all cars
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].update();
    }

    // Update world state for drawing purposes
    this.world.cars = this.cars;
    this.world.bestCar = this.myCar; // In this view, "bestCar" is always the player's car

    // Update viewport to follow player's car
    this.viewport.offset.x = -this.myCar.x;
    this.viewport.offset.y = -this.myCar.y;

    // --- Drawing ---

    // Reset main canvas viewport (applies zoom/offset)
    this.viewport.reset();

    // Calculate viewPoint for world drawing
    const viewPoint = scale(this.viewport.getOffset(), -1);

    // Draw world elements on game canvas
    this.world.draw(this.gameCtx, viewPoint, false);

    // Draw the minimap
    this.miniMap.draw(viewPoint);
    // Rotate the minimap canvas itself to match car orientation
    this.miniMapCanvas.style.transform = `rotate(${this.myCar.angle}rad)`;

    // Update and draw camera perspective
    this.camera.move(this.myCar); // Update camera position based on car
    this.camera.draw(this.gameCtx); // Draw camera view boundaries/info on game canvas (optional)
    // this.camera.drawFrustum(this.gameCtx); // Draw camera view boundaries/info on game canvas (optional)
    // Render the camera's perspective onto the camera canvas
    this.camera.render(this.cameraCtx, this.world, this.gameCtx);
  }

  // Animation loop
  private animate(): void {
    this.draw();
    // Ensure 'this' context is correct for the next frame
    requestAnimationFrame(this.animate.bind(this));
  }
}
