'use strict';
class Simulator {
  gameCanvas;
  gameCtx;
  networkCanvas;
  networkCtx;
  miniMapCanvas; // Assuming it has a context too if drawn on
  world = null;
  viewport = null;
  miniMap = null;
  N = 100;
  cars = null;
  bestCar = null;
  roadBorders = null;
  // DOM Elements - asserting non-null assuming they exist in the HTML
  saveBtn;
  discardBtn;
  loadWorldInput;
  constructor(gameCanvas, networkCanvas, miniMapCanvas) {
    this.gameCanvas = gameCanvas;
    // Use non-null assertion assuming getContext('2d') won't return null
    this.gameCtx = gameCanvas.getContext('2d');
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    // Get DOM elements and add listeners
    this.#addEventListeners();
    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;
      this.#initializeSimulator(worldInfo);
    } else {
      this.#initializeSimulator(world); // note: global world
    }
    // Start animation loop
    this.animate(0); // Start animation loop immediately
  }

  generateCars(n, type) {
    if (!this.world) {
      console.error('World not initialized in generateCars');
      return [];
    }
    // Use type guard for filtering and ensure 'm' is treated as 'Start'
    const startMarkings = this.world.markings.filter((m) => m instanceof Start);
    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100); // Default start point
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1); // Default direction (up)
    const startAngle = -angle(direction) + Math.PI / 2;
    const cars = [];
    for (let i = 1; i <= n; i++) {
      const color = type === 'AI' ? getRandomColor() : 'blue';
      const car = new Car(
        startPoint.x,
        startPoint.y,
        30, // width
        50, // height
        type,
        startAngle,
        3, // maxSpeed
        color,
      );
      car.name = type === 'AI' ? `AI ${i}` : `Player ${i}`;
      if (typeof carInfo !== 'undefined') {
        car.load(carInfo);
      } else {
        console.warn('carInfo not found for car.load()');
      }
      cars.push(car);
    }
    return cars;
  }

  #addEventListeners() {
    this.saveBtn = document.getElementById('saveBtn');
    this.discardBtn = document.getElementById('discardBtn');
    this.loadWorldInput = document.getElementById('loadWorldInput');
    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.discardBtn.addEventListener('click', this.discard.bind(this));
    this.loadWorldInput.addEventListener(
      'change',
      this.#loadWorldFromFile.bind(this),
    );
  }

  #initializeSimulator(worldInfo) {
    console.log('Initializing simulator with world info:', worldInfo);
    // Create world (either loaded or new)
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    // Initialize Viewport and MiniMap
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
    // Generate cars
    this.cars = [
      ...this.generateCars(1, 'KEYS'), // One player-controlled car
      ...this.generateCars(this.N, 'AI'), // N AI cars
    ];
    this.bestCar = this.cars[0];
    // Load brain from localStorage if available
    const bestBrainString = localStorage.getItem('bestBrain');
    if (bestBrainString) {
      for (let i = 0; i < this.cars.length; i++) {
        this.cars[i].brain = JSON.parse(bestBrainString);
        if (i > 1) {
          NeuralNetwork.mutate(this.cars[i].brain, 0.1);
        }
      }
    }
    // Determine road borders for collision detection
    const target = this.world.markings.find((m) => m instanceof Target);
    if (target && this.bestCar) {
      this.world.generateCorridor(
        new Point(this.bestCar.x, this.bestCar.y),
        target.center,
      );
      this.roadBorders = this.world.corridor
        ? this.world.corridor.borders.map((s) => [s.p1, s.p2])
        : null;
    } else {
      // Fallback to using road borders if no target or corridor generation fails
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
    if (this.bestCar && this.bestCar.brain) {
      localStorage.setItem('bestBrain', JSON.stringify(this.bestCar.brain));
      console.log('Best brain saved to localStorage.');
    } else {
      console.warn('Cannot save: No best car or best car has no brain.');
    }
  }

  discard() {
    localStorage.removeItem('bestBrain');
    console.log('Best brain removed from localStorage.');
  }

  #loadWorldFromFile(e) {
    const input = e.target;
    const worldFile = input.files?.[0];
    if (!worldFile) {
      alert('No file selected');
      // Clear the input value so the same file can be selected again if needed
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = (event) => this.#onLoadWorldFromFileRead(event);
  }

  #onLoadWorldFromFileRead(e) {
    if (!e.target?.result) {
      alert('Could not read file content');
      return;
    }
    const worldFileContent = e.target.result;
    let worldJsonString = null;
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
      this.#initializeSimulator(worldInfo);
    } catch (error) {
      console.error('Error parsing world JSON:', error);
      alert('Failed to parse world data. Ensure the file contains valid JSON.');
      return;
    }
  }

  draw(time) {
    if (
      !this.cars ||
      !this.world ||
      !this.viewport ||
      !this.miniMap ||
      !this.roadBorders ||
      !this.bestCar
    ) {
      // console.warn("Simulator draw called before full initialization.");
      return; // Don't draw if essential components aren't ready
    }
    // Update cars
    for (let i = 0; i < this.cars.length; i++) {
      // Pass road borders and empty traffic array
      this.cars[i].update(this.roadBorders);
    }
    // Fitness function
    // this.bestCar = this.cars.find(
    //   (c) => c.fitness === Math.max(...this.cars.map((c) => c.fitness)),
    // );
    // Find the car with the highest fitness
    this.bestCar = this.cars.reduce(
      (best, current) => (current.fitness > best.fitness ? current : best),
      this.cars[0] || null,
    );
    if (!this.bestCar) return; // Exit if no best car found (e.g., cars array empty)
    // Update world and minimap references
    this.world.cars = this.cars;
    this.world.bestCar = this.bestCar;
    this.miniMap.cars = this.cars; // Update minimap with current cars
    // Center viewport on the best car
    this.viewport.offset.x = -this.bestCar.x;
    this.viewport.offset.y = -this.bestCar.y;
    // --- Drawing ---
    // Reset main canvas viewport
    this.viewport.reset(); // Applies zoom and offset transformations
    // Calculate the view point for drawing (center of the viewport in world coordinates)
    const viewPoint = scale(this.viewport.getOffset(), -1); // Assuming scale inverts the offset
    // Draw the world onto the game canvas
    this.world.draw(this.gameCtx, viewPoint, false); // Draw world elements
    // Draw the minimap
    this.miniMap.draw(viewPoint);
    // Clear and draw the neural network visualization
    this.networkCtx.lineDashOffset = -time / 50;
    this.networkCtx.clearRect(
      0,
      0,
      this.networkCanvas.width,
      this.networkCanvas.height,
    );
    if (this.bestCar.brain) {
      Visualizer.drawNetwork(this.networkCtx, this.bestCar.brain);
    }
  }

  // Animation loop
  animate(time) {
    this.draw(time);
    // Bind 'this' to ensure the correct context in the next animation frame
    requestAnimationFrame(this.animate.bind(this));
  }
}
