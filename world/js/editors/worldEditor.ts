// Base type for editors used in the 'tools' object
interface Editor {
  enable(): void;
  disable(): void;
  display(): void;
  dispose?(): void; // Optional dispose method (GraphEditor has it)
}

// Structure for the 'tools' object, mapping mode names to tool info
type EditorMode =
  | 'graph'
  | 'marking'
  | 'stop'
  | 'crossing'
  | 'start'
  | 'parking'
  | 'light'
  | 'target'
  | 'yield';

type Tools = {
  [key in EditorMode]: {
    button: HTMLButtonElement;
    editor: Editor;
  };
};

class WorldEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private miniMapCanvas: HTMLCanvasElement;

  private world: World | null = null;
  private viewport: Viewport | null = null;
  private miniMap: MiniMap | null = null;
  private miniMapViewport: Viewport | null = null;
  private tools: Tools | null = null;
  private mode: EditorMode = 'graph';
  private oldGraphHash: string | null = null;

  private generateWorld: boolean = true;

  // DOM Element References, Use definite assignment assertion
  private worldGenerationInput!: HTMLInputElement;
  private saveBtn!: HTMLButtonElement;
  private disposeBtn!: HTMLButtonElement;
  private loadWorldInput!: HTMLInputElement;
  private openOsmPanelBtn!: HTMLButtonElement;
  private osmPanel!: HTMLElement;
  private closeOsmPanelBtn!: HTMLButtonElement;
  private parseOsmDataBtn!: HTMLButtonElement;
  private osmDataContainer!: HTMLTextAreaElement;
  private graphBtn!: HTMLButtonElement;
  private markingBtn!: HTMLButtonElement;
  private startBtn!: HTMLButtonElement;
  private targetBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private crossingBtn!: HTMLButtonElement;
  private yieldBtn!: HTMLButtonElement;
  private parkingBtn!: HTMLButtonElement;
  private lightBtn!: HTMLButtonElement;

  constructor(canvas: HTMLCanvasElement, miniMapCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

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
  #assignElementReferences(): void {
    // Helper function to get elements and type cast
    const getElement = <T extends HTMLElement>(id: string): T => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Element with ID "${id}" not found.`);
      return el as T; // Use type assertion
    };

    this.worldGenerationInput = getElement<HTMLInputElement>(
      'worldGenerationInput',
    );
    this.saveBtn = getElement<HTMLButtonElement>('saveBtn');
    this.disposeBtn = getElement<HTMLButtonElement>('disposeBtn');
    this.loadWorldInput = getElement<HTMLInputElement>('loadWorldInput');
    this.openOsmPanelBtn = getElement<HTMLButtonElement>('openOsmPanelBtn');
    this.osmPanel = getElement<HTMLElement>('osmPanel');
    this.closeOsmPanelBtn = getElement<HTMLButtonElement>('closeOsmPanelBtn');
    this.parseOsmDataBtn = getElement<HTMLButtonElement>('parseOsmDataBtn');
    this.osmDataContainer = getElement<HTMLTextAreaElement>('osmDataContainer');
    this.graphBtn = getElement<HTMLButtonElement>('graphBtn');
    this.markingBtn = getElement<HTMLButtonElement>('markingBtn');
    this.startBtn = getElement<HTMLButtonElement>('startBtn');
    this.targetBtn = getElement<HTMLButtonElement>('targetBtn');
    this.stopBtn = getElement<HTMLButtonElement>('stopBtn');
    this.crossingBtn = getElement<HTMLButtonElement>('crossingBtn');
    this.yieldBtn = getElement<HTMLButtonElement>('yieldBtn');
    this.parkingBtn = getElement<HTMLButtonElement>('parkingBtn');
    this.lightBtn = getElement<HTMLButtonElement>('lightBtn');
  }

  /** Adds event listeners to DOM elements. */
  #addEventListeners(): void {
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
  #initializeWorldEditor(worldInfo: World | null): void {
    this.world = worldInfo ? World.load(worldInfo) : new World(new Graph());

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
      0.03, // Scaler
    );

    // Optional: Viewport for MiniMap if it has separate controls
    this.miniMapViewport = new Viewport(this.miniMapCanvas);

    // Set initial state for world generation checkbox
    this.worldGenerationInput.checked = this.generateWorld;
  }

  /** Creates instances of all editor tools. */
  initializeEditors(viewport: Viewport, world: World): Tools {
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
    } as Tools; // Assert final type
    return tools;
  }

  /** Sets the active editor mode. */
  setMode(mode: EditorMode): void {
    if (!this.tools) return; // Guard against tools not being initialized
    this.mode = mode;
    this.disableEditors(); // Disable all editors first
    this.tools[mode].button.style.backgroundColor = 'white';
    this.tools[mode].button.style.filter = '';
    this.tools[mode].editor.enable(); // Enable the selected editor
  }

  /** Disables all editor tools and resets button styles. */
  disableEditors(): void {
    if (!this.tools) return;
    for (const tool of Object.values(this.tools)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  /** Saves the current world state to localStorage and triggers a file download. */
  save(): void {
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
  dispose(): void {
    // this.tools?.graph.editor.dispose?.(); // Optional chaining for dispose
    // if (this.world) {
    //   this.world.markings.length = 0; // Clear markings array
    // }
    this.#initializeWorldEditor(null);
    console.log('Graph disposed and markings cleared.');
  }

  /** Handles the file input change event for loading a world. */
  loadWorldFromFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      alert('No file selected.');
      return;
    }
    const worldFile = input.files[0];

    const reader = new FileReader();
    reader.readAsText(worldFile);
    // Assign onload handler with correct 'this' context
    reader.onload = (event: ProgressEvent<FileReader>) =>
      this.#onLoadWorldFromFileRead(event);
    reader.onerror = () => {
      alert(`Error reading file: ${reader.error}`);
    };
  }

  /** Processes the content read from the loaded world file. */
  #onLoadWorldFromFileRead(e: ProgressEvent<FileReader>): void {
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
  openOsmPanel(): void {
    this.osmPanel.style.display = 'block';
  }

  /** Hides the OSM data input panel. */
  closeOsmPanel(): void {
    this.osmPanel.style.display = 'none';
  }

  /** Parses OSM data from the text area and updates the world graph. */
  parseOsmData(): void {
    const osmData = this.osmDataContainer.value;
    if (!osmData) {
      alert('Paste OSM data (JSON format) into the text area first.');
      return;
    }

    let osmDataJson: OsmData;
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
  toggleWorldGeneration(): void {
    this.generateWorld = !this.generateWorld;
    this.worldGenerationInput.checked = this.generateWorld; // Sync checkbox
    this.oldGraphHash = null; // Force potential regeneration on next draw
  }

  /** Main draw loop called by animate. */
  draw(): void {
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
    this.ctx.globalAlpha = this.mode === 'graph' ? 0.5 : 0.2;
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
  animate(): void {
    this.draw(); // Call the main draw function
    // Request the next frame, binding 'this' context
    requestAnimationFrame(this.animate.bind(this));
  }
}
