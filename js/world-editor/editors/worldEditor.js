'use strict';
class WorldEditor {
  canvas;
  ctx;
  miniMapCanvas;
  world;
  viewport;
  miniMap;
  miniMapViewport;
  editors;
  mode = 'graph';
  oldGraphHash = null;
  generateWorld = true;
  // DOM Element References, Use definite assignment assertion
  worldGenerationInput;
  saveBtn;
  disposeBtn;
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
    this.#assignElementReferences();
    this.#addEventListeners();
    if (typeof world === 'undefined') {
      const worldString = localStorage.getItem('world');
      const worldInfo = worldString ? JSON.parse(worldString) : null;
      this.#initializeWorldEditor(worldInfo);
    } else {
      this.#initializeWorldEditor(world); // note: global world
    }
  }

  /* Assigns DOM elements to class properties. */
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

  /* Adds event listeners to DOM elements. */
  #addEventListeners() {
    this.worldGenerationInput.addEventListener(
      'change',
      this.toggleWorldGeneration.bind(this),
    );
    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.disposeBtn.addEventListener('click', this.dispose.bind(this));
    new WorldLoader((worldInfo) => this.#initializeWorldEditor(worldInfo));
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

  /* Initializes or re-initializes the world, viewport, minimap, and tools. */
  #initializeWorldEditor(worldInfo) {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());
    this.viewport = new Viewport(
      this.canvas,
      this.world.zoom,
      this.world.offset,
    );
    this.editors = this.initializeEditors(this.viewport, this.world);
    this.oldGraphHash = this.world.graph.hash();
    this.setMode('graph');
    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.world.graph,
      this.miniMapCanvas.width, // Use canvas width for size
      0.03,
    );
    this.miniMapViewport = new Viewport(this.miniMapCanvas);
    this.worldGenerationInput.checked = this.generateWorld;
  }

  /* Creates instances of all editor tools. */
  initializeEditors(viewport, world) {
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

  /* Sets the active editor mode. */
  setMode(mode) {
    this.mode = mode;
    this.disableEditors(); // Disable all editors first
    this.editors[mode].button.style.backgroundColor = 'white';
    this.editors[mode].button.style.filter = '';
    this.editors[mode].editor.enable(); // Enable the selected editor
  }

  /* Disables all editor tools and resets button styles. */
  disableEditors() {
    for (const tool of Object.values(this.editors)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  /* Saves the current world state to localStorage and triggers a file download. */
  save() {
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

  /* Disposes the graph editor and clears world markings. */
  dispose() {
    // this.editors.graph.editor.dispose?.();
    // this.world.markings.length = 0;
    this.#initializeWorldEditor(null);
  }

  /* Displays the OSM data input panel. */
  openOsmPanel() {
    this.osmPanel.style.display = 'block';
  }

  /* Hides the OSM data input panel. */
  closeOsmPanel() {
    this.osmPanel.style.display = 'none';
  }

  /* Parses OSM data from the text area and updates the world graph. */
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
      // Update the world's graph
      this.world.graph.points = result.points;
      this.world.graph.segments = result.segments;
      this.oldGraphHash = null; // Force regeneration on next draw
      this.closeOsmPanel(); // Close panel on success
    } catch (error) {
      alert(`Error processing OSM data: ${error}`);
      console.error('Error processing OSM data:', error);
    }
  }

  /* Toggles the flag for generating world geometry (buildings, trees). */
  toggleWorldGeneration() {
    this.generateWorld = !this.generateWorld;
    this.worldGenerationInput.checked = this.generateWorld; // Sync checkbox
    this.oldGraphHash = null; // Force potential regeneration on next draw
  }

  /* Main draw loop called by animate. */
  draw() {
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
    this.ctx.globalAlpha = this.mode === 'graph' ? 0.5 : 0.2;
    for (const tool of Object.values(this.editors)) {
      tool.editor.display(); // Call display method of active editor
    }
    this.ctx.globalAlpha = 1.0; // Reset alpha
    // Update MiniMapViewPort
    this.miniMapViewport.reset();
    // Draw the MiniMap
    this.miniMap.draw(viewPoint, { roadColor: '#BBB', carColor: 'red' }); // Update minimap based on main viewpoint
  }

  /* Animation loop using requestAnimationFrame. */
  animate() {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
