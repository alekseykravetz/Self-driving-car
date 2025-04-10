'use strict';
class WorldEditor {
  canvas;
  ctx;
  miniMapCanvas;
  world = null;
  viewport = null;
  miniMap = null;
  miniMapViewport = null;
  tools = null;
  oldGraphHash = null;
  generateWorld = true;
  // DOM Element References, Use definite assignment assertion
  worldGenerationInput;
  saveBtn;
  disposeBtn;
  loadWorldInput;
  openOsmPanelBtn;
  osmPanel;
  closeOsmPanelBtn;
  parseOsmDataBtn;
  osmDataContainer;
  graphBtn;
  markingBtn;
  startBtn;
  targetBtn;
  stopBtn;
  crossingBtn;
  yieldBtn;
  parkingBtn;
  lightBtn;
  constructor(canvas, miniMapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    this.#assignElementReferences(); // Assign DOM elements
    this.#addEventListeners(); // Add listeners after elements are assigned
    // Attempt to load world from localStorage or initialize a new one
    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;
      this.#initializeWorldEditor(worldInfo);
    } else {
      this.#initializeWorldEditor(world); // todo: fix - global world info
    }
  }

  /** Assigns DOM elements to class properties. */
  #assignElementReferences() {
    // Helper function to get elements and type cast
    const getElement = (id) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Element with ID "${id}" not found.`);
      return el; // Use type assertion
    };
    this.worldGenerationInput = getElement('worldGenerationInput');
    this.saveBtn = getElement('saveBtn');
    this.disposeBtn = getElement('disposeBtn');
    this.loadWorldInput = getElement('loadWorldInput');
    this.openOsmPanelBtn = getElement('openOsmPanelBtn');
    this.osmPanel = getElement('osmPanel');
    this.closeOsmPanelBtn = getElement('closeOsmPanelBtn');
    this.parseOsmDataBtn = getElement('parseOsmDataBtn');
    this.osmDataContainer = getElement('osmDataContainer');
    this.graphBtn = getElement('graphBtn');
    this.markingBtn = getElement('markingBtn');
    this.startBtn = getElement('startBtn');
    this.targetBtn = getElement('targetBtn');
    this.stopBtn = getElement('stopBtn');
    this.crossingBtn = getElement('crossingBtn');
    this.yieldBtn = getElement('yieldBtn');
    this.parkingBtn = getElement('parkingBtn');
    this.lightBtn = getElement('lightBtn');
  }

  /** Adds event listeners to DOM elements. */
  #addEventListeners() {
    this.worldGenerationInput.addEventListener(
      'change',
      this.toggleWorldGeneration.bind(this),
    );
    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.disposeBtn.addEventListener('click', this.dispose.bind(this));
    this.loadWorldInput.addEventListener(
      'change',
      this.loadWorldFromFile.bind(this),
    );
    this.openOsmPanelBtn.addEventListener(
      'click',
      this.openOsmPanel.bind(this),
    );
    this.closeOsmPanelBtn.addEventListener(
      'click',
      this.closeOsmPanel.bind(this),
    );
    this.parseOsmDataBtn.addEventListener(
      'click',
      this.parseOsmData.bind(this),
    );
    // Mode setting buttons
    this.graphBtn.addEventListener('click', () => this.setMode('graph'));
    this.markingBtn.addEventListener('click', () => this.setMode('marking'));
    this.startBtn.addEventListener('click', () => this.setMode('start'));
    this.targetBtn.addEventListener('click', () => this.setMode('target'));
    this.stopBtn.addEventListener('click', () => this.setMode('stop'));
    this.crossingBtn.addEventListener('click', () => this.setMode('crossing'));
    this.yieldBtn.addEventListener('click', () => this.setMode('yield'));
    this.parkingBtn.addEventListener('click', () => this.setMode('parking'));
    this.lightBtn.addEventListener('click', () => this.setMode('light'));
  }

  /** Initializes or re-initializes the world, viewport, minimap, and tools. */
  #initializeWorldEditor(worldInfo) {
    if (worldInfo instanceof World) {
      this.world = worldInfo;
    } else {
      this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    }
    // Initialize Viewport after World is loaded (uses world zoom/offset)
    this.viewport = new Viewport(
      this.canvas,
      this.world.zoom,
      this.world.offset,
    );
    // Initialize Editors after World and Viewport
    this.tools = this.initializeEditors(this.viewport, this.world);
    // Store initial graph hash
    this.oldGraphHash = this.world.graph.hash();
    // Set initial mode
    this.setMode('graph');
    // Initialize MiniMap after World graph is ready
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width, // Use canvas width for size
      0.03,
    );
    // Optional: Viewport for MiniMap if it has separate controls
    this.miniMapViewport = new Viewport(this.miniMapCanvas);
    // Set initial state for world generation checkbox
    this.worldGenerationInput.checked = this.generateWorld;
  }

  /** Creates instances of all editor tools. */
  initializeEditors(viewport, world) {
    // Type assertion needed as object is built incrementally
    const tools = {
      graph: {
        button: this.graphBtn,
        editor: new GraphEditor(viewport, world.graph),
      },
      marking: {
        button: this.markingBtn,
        editor: new MarkingEditor(viewport, world),
      },
      stop: { button: this.stopBtn, editor: new StopEditor(viewport, world) },
      crossing: {
        button: this.crossingBtn,
        editor: new CrossingEditor(viewport, world),
      },
      start: {
        button: this.startBtn,
        editor: new StartEditor(viewport, world),
      },
      parking: {
        button: this.parkingBtn,
        editor: new ParkingEditor(viewport, world),
      },
      light: {
        button: this.lightBtn,
        editor: new LightEditor(viewport, world),
      },
      target: {
        button: this.targetBtn,
        editor: new TargetEditor(viewport, world),
      },
      yield: {
        button: this.yieldBtn,
        editor: new YieldEditor(viewport, world),
      },
    }; // Assert final type
    return tools;
  }

  /** Sets the active editor mode. */
  setMode(mode) {
    if (!this.tools) return; // Guard against tools not being initialized
    this.disableEditors(); // Disable all editors first
    this.tools[mode].button.style.backgroundColor = 'white';
    this.tools[mode].button.style.filter = '';
    this.tools[mode].editor.enable(); // Enable the selected editor
  }

  /** Disables all editor tools and resets button styles. */
  disableEditors() {
    if (!this.tools) return;
    for (const tool of Object.values(this.tools)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  /** Saves the current world state to localStorage and triggers a file download. */
  save() {
    if (!this.world || !this.viewport) return;
    // Update world state with current viewport settings
    this.world.zoom = this.viewport.zoom;
    this.world.offset = this.viewport.offset;
    const worldString = JSON.stringify(this.world);
    // Save to localStorage (with error handling for size limits)
    try {
      localStorage.setItem('world', worldString);
    } catch (error) {
      console.error(
        'Could not save world to local storage (likely too large).',
        error,
      );
      alert(
        'Warning: World could not be saved to local storage (too large). Saving to file only.',
      );
    }
    // Trigger file download
    const element = document.createElement('a');
    // Wrap JSON in the loading function call expected by the file format
    const fileContent = `const world = World.load(${worldString});`;
    element.setAttribute(
      'href',
      `data:application/json;charset=utf-8,${encodeURIComponent(fileContent)}`,
    );
    // Suggest a filename
    const fileName = `world_${new Date().toISOString().slice(0, 10)}.world`;
    element.setAttribute('download', fileName);
    // Simulate click to download
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element); // Clean up
  }

  /** Disposes the graph editor and clears world markings. */
  dispose() {
    this.tools?.graph.editor.dispose?.(); // Optional chaining for dispose
    if (this.world) {
      this.world.markings.length = 0; // Clear markings array
    }
    console.log('Graph disposed and markings cleared.');
  }

  /** Handles the file input change event for loading a world. */
  loadWorldFromFile(e) {
    const input = e.target;
    if (!input.files || input.files.length === 0) {
      alert('No file selected.');
      return;
    }
    const worldFile = input.files[0];
    const reader = new FileReader();
    reader.readAsText(worldFile);
    // Assign onload handler with correct 'this' context
    reader.onload = (event) => this.#onLoadWorldFromFileRead(event);
    reader.onerror = () => {
      alert(`Error reading file: ${reader.error}`);
    };
  }

  /** Processes the content read from the loaded world file. */
  #onLoadWorldFromFileRead(e) {
    if (!e.target?.result || typeof e.target.result !== 'string') {
      alert('Failed to read file content.');
      return;
    }
    const worldFileContent = e.target.result;
    // Extract the JSON part from the "const world = World.load(...);" structure
    const startIndex = worldFileContent.indexOf('(');
    const endIndex = worldFileContent.lastIndexOf(')');
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      alert('Invalid file format. Expected "const world = World.load({...});"');
      return;
    }
    const worldJsonString = worldFileContent.substring(
      startIndex + 1,
      endIndex,
    );
    try {
      const worldInfo = JSON.parse(worldJsonString);
      // Re-initialize the editor with the loaded world data
      this.#initializeWorldEditor(worldInfo);
      console.log('World loaded successfully from file.');
    } catch (error) {
      alert(`Failed to parse world data from file: ${error}`);
      console.error('Error parsing world JSON:', error);
    }
  }

  /** Displays the OSM data input panel. */
  openOsmPanel() {
    this.osmPanel.style.display = 'block';
  }

  /** Hides the OSM data input panel. */
  closeOsmPanel() {
    this.osmPanel.style.display = 'none';
  }

  /** Parses OSM data from the text area and updates the world graph. */
  parseOsmData() {
    const osmData = this.osmDataContainer.value;
    if (!osmData) {
      alert('Paste OSM data (JSON format) into the text area first.');
      return;
    }
    let osmDataJson;
    try {
      osmDataJson = JSON.parse(osmData);
    } catch (error) {
      alert(`Invalid JSON data in OSM input: ${error}`);
      console.error('Error parsing OSM JSON:', error);
      return;
    }
    try {
      // Use the Osm utility to parse roads
      const result = Osm.parseRoads(osmDataJson);
      if (!this.world) return; // Should not happen if initialized
      // Update the world's graph
      this.world.graph.points = result.points;
      this.world.graph.segments = result.segments;
      this.oldGraphHash = null; // Force regeneration on next draw
      console.log('OSM data parsed and graph updated.');
      this.closeOsmPanel(); // Close panel on success
    } catch (error) {
      alert(`Error processing OSM data: ${error}`);
      console.error('Error processing OSM data:', error);
    }
  }

  /** Toggles the flag for generating world geometry (buildings, trees). */
  toggleWorldGeneration() {
    this.generateWorld = !this.generateWorld;
    this.worldGenerationInput.checked = this.generateWorld; // Sync checkbox
    this.oldGraphHash = null; // Force potential regeneration on next draw
  }

  /** Main draw loop called by animate. */
  draw() {
    if (!this.world || !this.viewport || !this.miniMap || !this.miniMapViewport)
      return; // Ensure all components are initialized
    // Reset viewport transforms
    this.viewport.reset();
    // Regenerate world geometry if graph has changed and generation is enabled
    const currentGraphHash = this.world.graph.hash();
    if (currentGraphHash !== this.oldGraphHash) {
      console.log('Graph changed, regenerating world...');
      this.world.generate(this.generateWorld);
      this.oldGraphHash = currentGraphHash;
    }
    // Get the current viewpoint based on viewport offset
    const viewPoint = scale(this.viewport.getOffset(), -1);
    // Draw the world
    this.world.draw(this.ctx, viewPoint);
    // Draw editor previews (e.g., marking intent) with transparency
    this.ctx.globalAlpha = 0.3;
    if (this.tools) {
      for (const tool of Object.values(this.tools)) {
        tool.editor.display(); // Call display method of active editor
      }
    }
    this.ctx.globalAlpha = 1.0; // Reset alpha
    // Update and draw the MiniMap
    this.miniMapViewport.reset(); // Reset minimap viewport if separate
    this.miniMap.update(viewPoint, { roadColor: '#BBB', carColor: 'red' }); // Update minimap based on main viewpoint
  }

  /** Animation loop using requestAnimationFrame. */
  animate() {
    this.draw(); // Call the main draw function
    // Request the next frame, binding 'this' context
    requestAnimationFrame(this.animate.bind(this));
  }
}
