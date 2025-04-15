'use strict';
class CameraViewSimulator {
  gameCanvas;
  gameCtx;
  cameraCanvas;
  cameraCtx;
  miniMapCanvas;
  world = null;
  camera = null;
  viewport = null;
  miniMap = null;
  N = 0; // Default AI cars for this mode
  cars = null;
  myCar = null; // The player's car
  loadWorldInput;
  constructor(gameCanvas, cameraCanvas, miniMapCanvas) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d'); // Assert non-null
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d'); // Assert non-null
    this.miniMapCanvas = miniMapCanvas;
    this.#addEventListeners();
    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;
      this.#initializeRace(worldInfo);
    } else {
      this.#initializeRace(world); // todo: fix global world info
    }
    // Start animation loop
    this.animate();
  }

  // This method seems identical to the one in Simulator
  generateCars(n, type) {
    if (!this.world) {
      console.error('World not initialized in generateCars');
      return [];
    }
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
      car.name = type === 'AI' ? `AI ${i}` : `Player ${i}`;
      if (typeof carInfo !== 'undefined') {
        car.load(carInfo);
      }
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
    const input = e.target;
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
      this.#initializeRace(worldInfo);
    } catch (error) {
      console.error('Error parsing world JSON:', error);
      alert('Failed to parse world data. Ensure the file contains valid JSON.');
      return;
    }
  }

  draw() {
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
    // Update all cars (passing empty borders/traffic as per original code)
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i].update([], []);
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
    // Update and potentially draw minimap
    this.miniMap.update(viewPoint);
    // Rotate the minimap canvas itself to match car orientation
    this.miniMapCanvas.style.transform = `rotate(${this.myCar.angle}rad)`;
    // Update and draw camera perspective
    this.camera.move(this.myCar); // Update camera position based on car
    this.camera.draw(this.gameCtx); // Draw camera view boundaries/info on game canvas (optional)
    // Render the camera's perspective onto the camera canvas
    this.camera.render(this.cameraCtx, this.world, this.gameCtx);
  }

  // Animation loop
  animate() {
    this.draw();
    // Ensure 'this' context is correct for the next frame
    requestAnimationFrame(this.animate.bind(this));
  }
}
