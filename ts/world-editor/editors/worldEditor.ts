interface Editor {
  enable(): void;
  disable(): void;
  display(): void;
  dispose?(): void; // Optional dispose method (GraphEditor has it)
}

type EditorType =
  | 'graph'
  | 'marking'
  | 'stop'
  | 'crossing'
  | 'start'
  | 'parking'
  | 'light'
  | 'target'
  | 'yield';

type Editors = {
  [key in EditorType]: {
    button: HTMLButtonElement;
    editor: Editor;
  };
};

class WorldEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private miniMapCanvas: HTMLCanvasElement;

  private world!: World;
  private viewport!: Viewport;
  private miniMap!: MiniMap;
  private miniMapViewport!: Viewport;
  private editors!: Editors;
  private mode: EditorType = 'graph';
  private oldGraphHash: string | null = null;

  private generateWorld: boolean = true;

  // DOM Element References, Use definite assignment assertion
  private worldGenerationInput!: HTMLInputElement;
  private saveBtn!: HTMLButtonElement;
  private disposeBtn!: HTMLButtonElement;
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

  /* Adds event listeners to DOM elements. */
  #addEventListeners(): void {
    this.worldGenerationInput.addEventListener(
      'change',
      this.toggleWorldGeneration.bind(this),
    );
    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.disposeBtn.addEventListener('click', this.dispose.bind(this));
    new WorldLoader((worldInfo) =>
      this.#initializeWorldEditor(worldInfo as World),
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

  /* Initializes or re-initializes the world, viewport, minimap, and tools. */
  #initializeWorldEditor(worldInfo: World | null): void {
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
      0.03, // Scaler
    );

    this.miniMapViewport = new Viewport(this.miniMapCanvas);

    this.worldGenerationInput.checked = this.generateWorld;
  }

  /* Creates instances of all editor tools. */
  initializeEditors(viewport: Viewport, world: World): Editors {
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
    } as Editors; // Assert final type
    return tools;
  }

  /* Sets the active editor mode. */
  setMode(mode: EditorType): void {
    this.mode = mode;
    this.disableEditors(); // Disable all editors first
    this.editors[mode].button.style.backgroundColor = 'white';
    this.editors[mode].button.style.filter = '';
    this.editors[mode].editor.enable(); // Enable the selected editor
  }

  /* Disables all editor tools and resets button styles. */
  disableEditors(): void {
    for (const tool of Object.values(this.editors)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  /* Saves the current world state to localStorage and triggers a file download. */
  save(): void {
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
  dispose(): void {
    // this.editors.graph.editor.dispose?.();
    // this.world.markings.length = 0;
    this.#initializeWorldEditor(null);
  }

  /* Displays the OSM data input panel. */
  openOsmPanel(): void {
    this.osmPanel.style.display = 'block';
  }

  /* Hides the OSM data input panel. */
  closeOsmPanel(): void {
    this.osmPanel.style.display = 'none';
  }

  /* Parses OSM data from the text area and updates the world graph. */
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
  toggleWorldGeneration(): void {
    this.generateWorld = !this.generateWorld;
    this.worldGenerationInput.checked = this.generateWorld; // Sync checkbox
    this.oldGraphHash = null; // Force potential regeneration on next draw
  }

  /* Main draw loop called by animate. */
  draw(): void {
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
  animate(): void {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
