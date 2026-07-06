/** localStorage key for the editor's per-layer visibility preference. */
const EDITOR_LAYERS_KEY = 'editor:worldLayers';

/** Reads the persisted layer visibility, falling back to the defaults. */
function loadLayerVisibility(): WorldLayerVisibility {
  const stored = safeJsonParse<Partial<WorldLayerVisibility>>(
    localStorage.getItem(EDITOR_LAYERS_KEY),
  );
  return { ...DEFAULT_LAYER_VISIBILITY, ...(stored ?? {}) };
}

/** Persists the layer visibility preference. */
function saveLayerVisibility(visibility: WorldLayerVisibility): void {
  localStorage.setItem(EDITOR_LAYERS_KEY, JSON.stringify(visibility));
}

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
  | 'corridor'
  | 'yield';

type Editors = {
  [key in EditorType]: {
    button: HTMLButtonElement;
    editor: Editor;
  };
};

class WorldEditor {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #miniMapCanvas: HTMLCanvasElement;

  #world!: World;
  #viewport!: Viewport;
  #miniMap!: MiniMap;
  #miniMapViewport!: Viewport;
  #editors!: Editors;
  #mode: EditorType = 'graph';
  #viewportMode: 'mouse' | 'touchpad' = 'mouse';
  #oldGraphHash: string | null = null;

  // Per-layer visibility (local editor preference, persisted to localStorage —
  // never saved into the world file).
  #layerVisibility: WorldLayerVisibility = loadLayerVisibility();
  // True when the graph changed after items were generated, so the rendered
  // buildings/trees are outdated until the user hits Regenerate items.

  // DOM Element References, Use definite assignment assertion
  #saveBtn!: HTMLButtonElement;
  #disposeBtn!: HTMLButtonElement;
  #openOsmPanelBtn!: HTMLButtonElement;
  #osmPanel!: HTMLElement;
  #closeOsmPanelBtn!: HTMLButtonElement;
  #parseOsmDataBtn!: HTMLButtonElement;
  #osmDataContainer!: HTMLTextAreaElement;
  #graphBtn!: HTMLButtonElement;
  #markingBtn!: HTMLButtonElement;
  #startBtn!: HTMLButtonElement;
  #targetBtn!: HTMLButtonElement;
  #stopBtn!: HTMLButtonElement;
  #crossingBtn!: HTMLButtonElement;
  #yieldBtn!: HTMLButtonElement;
  #parkingBtn!: HTMLButtonElement;
  #lightBtn!: HTMLButtonElement;
  #corridorBtn!: HTMLButtonElement;
  #worldToolbar!: WorldToolbarElement;
  #shortcutsToolbar!: ShortcutsToolbarElement;
  #worldLayersToolbar!: WorldLayersToolbarElement;

  constructor(canvas: HTMLCanvasElement, miniMapCanvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d')!;

    this.#miniMapCanvas = miniMapCanvas;

    this.#assignElementReferences();
    this.#addEventListeners();

    const worldString = localStorage.getItem('editorWorld');
    const storedWorld = safeJsonParse<World>(worldString);
    if (storedWorld) {
      this.#initializeWorldEditor(storedWorld);
    } else {
      const storeWorld = StoreManager.getActiveWorld();
      this.#initializeWorldEditor(storeWorld as World | null);
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

    this.#saveBtn = getElement<HTMLButtonElement>('saveBtn');
    this.#disposeBtn = getElement<HTMLButtonElement>('disposeBtn');
    this.#openOsmPanelBtn = getElement<HTMLButtonElement>('openOsmPanelBtn');
    this.#osmPanel = getElement<HTMLElement>('osmPanel');
    this.#closeOsmPanelBtn = getElement<HTMLButtonElement>('closeOsmPanelBtn');
    this.#parseOsmDataBtn = getElement<HTMLButtonElement>('parseOsmDataBtn');
    this.#osmDataContainer =
      getElement<HTMLTextAreaElement>('osmDataContainer');
    this.#graphBtn = getElement<HTMLButtonElement>('graphBtn');
    this.#markingBtn = getElement<HTMLButtonElement>('markingBtn');
    this.#startBtn = getElement<HTMLButtonElement>('startBtn');
    this.#targetBtn = getElement<HTMLButtonElement>('targetBtn');
    this.#stopBtn = getElement<HTMLButtonElement>('stopBtn');
    this.#crossingBtn = getElement<HTMLButtonElement>('crossingBtn');
    this.#yieldBtn = getElement<HTMLButtonElement>('yieldBtn');
    this.#parkingBtn = getElement<HTMLButtonElement>('parkingBtn');
    this.#lightBtn = getElement<HTMLButtonElement>('lightBtn');
    this.#corridorBtn = getElement<HTMLButtonElement>('corridorBtn');
    this.#worldToolbar = document.querySelector(
      'world-toolbar',
    ) as WorldToolbarElement;
    this.#shortcutsToolbar = document.querySelector(
      'shortcuts-toolbar',
    ) as ShortcutsToolbarElement;
    this.#worldLayersToolbar = document.querySelector(
      'world-layers-toolbar',
    ) as WorldLayersToolbarElement;
  }

  /* Adds event listeners to DOM elements. */
  #addEventListeners(): void {
    this.#saveBtn.addEventListener('click', this.save.bind(this));
    this.#disposeBtn.addEventListener('click', this.dispose.bind(this));
    this.#openOsmPanelBtn.addEventListener(
      'click',
      this.openOsmPanel.bind(this),
    );
    this.#closeOsmPanelBtn.addEventListener(
      'click',
      this.closeOsmPanel.bind(this),
    );
    this.#parseOsmDataBtn.addEventListener(
      'click',
      this.parseOsmData.bind(this),
    );

    // Mode setting buttons
    this.#graphBtn.addEventListener('click', () => this.setMode('graph'));
    this.#markingBtn.addEventListener('click', () => this.setMode('marking'));
    this.#startBtn.addEventListener('click', () => this.setMode('start'));
    this.#targetBtn.addEventListener('click', () => this.setMode('target'));
    this.#stopBtn.addEventListener('click', () => this.setMode('stop'));
    this.#crossingBtn.addEventListener('click', () => this.setMode('crossing'));
    this.#yieldBtn.addEventListener('click', () => this.setMode('yield'));
    this.#parkingBtn.addEventListener('click', () => this.setMode('parking'));
    this.#lightBtn.addEventListener('click', () => this.setMode('light'));
    this.#corridorBtn.addEventListener('click', () => this.setMode('corridor'));

    // The shared <world-toolbar> hosts the World group (load/save/dispose/OSM)
    // and the Viewport mode toggle. Reveal the editor-only actions and hide the
    // simulator-only groups (Car, Borders, Tracking, Debug).
    this.#worldToolbar.showWorldEditorActions();
    this.#worldToolbar.hideGroups(
      'car',
      'borders',
      'borders-sep',
      'tracking',
      'tracking-sep',
      'debug',
      'debug-sep',
    );

    // Viewport wheel-mode toggle (mouse vs. touchpad) driven by the toolbar.
    this.#worldToolbar.setViewportModeListener((mode) =>
      this.setViewportMode(mode),
    );

    // Populate the shared shortcuts toolbar with the graph-editor keys plus the
    // viewport zoom modifier. Behavior stays in GraphEditor / Viewport.
    this.#shortcutsToolbar.setShortcuts([
      {
        id: 'keyS',
        label: 'S',
        title: 'S — Set path start point (hover a point)',
        group: 'Graph',
        kind: 'momentary',
      },
      {
        id: 'keyE',
        label: 'E',
        title: 'E — Set path end point (hover a point)',
        group: 'Graph',
        kind: 'momentary',
      },
      {
        id: 'keyC',
        label: 'C',
        title: 'C — Clear computed path and start/end points',
        group: 'Graph',
        kind: 'momentary',
      },
      {
        id: 'keyO',
        label: 'O',
        title:
          'O — One-way road mode. Hold while creating a segment, or click to latch it on permanently.',
        group: 'Graph',
        kind: 'toggle',
      },
      {
        id: 'keyH',
        label: 'H',
        title:
          'H — Hard-separation road mode (solid centre line). Hold while creating a segment, or click to latch it on permanently.',
        group: 'Graph',
        kind: 'toggle',
      },
      {
        id: 'keyT',
        label: 'T',
        title:
          'T — Tunnel (open-ended) corridor mode. Hold or click to latch; the next corridor you draw has open ends.',
        group: 'Corridor',
        kind: 'toggle',
      },
      {
        id: 'keyCtrl',
        label: 'Ctrl',
        title: 'Ctrl + scroll wheel — Zoom in/out (touchpad mode)',
        group: 'View',
        kind: 'momentary',
        display: true,
        keys: ['Control'],
      },
    ]);

    // World selector: loading a file opens it for editing; picking from the
    // library (loaded / editor / store) loads that world into the editor.
    this.#worldToolbar.configureSelectors({
      selectOnWorldFileLoad: true,
      onWorldSelected: (entry) =>
        this.#initializeWorldEditor((entry?.data as World) ?? null),
    });

    // World Layers toolbar: per-layer visibility toggles + Regenerate items action.
    this.#worldLayersToolbar.setVisibility(this.#layerVisibility);
    this.#worldLayersToolbar.setChangeListener((visibility) => {
      this.#layerVisibility = visibility;
      saveLayerVisibility(visibility);
    });
    this.#worldLayersToolbar.setRegenerateListener(() =>
      this.regenerateItems(),
    );
  }

  /* Initializes or re-initializes the world, viewport, minimap, and tools. */
  #initializeWorldEditor(worldInfo: World | null): void {
    this.#world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.#viewport = new Viewport(
      this.#canvas,
      this.#world.zoom,
      this.#world.offset,
    );
    this.#viewport.setMode(this.#viewportMode);

    this.#editors = this.initializeEditors(this.#viewport, this.#world);

    this.#oldGraphHash = this.#world.graph.hash();

    this.setMode('graph');

    this.#miniMap = new MiniMap(
      this.#miniMapCanvas,
      this.#world.graph,
      this.#miniMapCanvas.width, // Use canvas width for size
      0.03, // Scaler
    );

    this.#miniMapViewport = new Viewport(this.#miniMapCanvas);
    this.#miniMapViewport.setMode(this.#viewportMode);

    // A freshly loaded/created world already has its items generated in memory.
    this.#worldLayersToolbar?.setStale(false);
  }

  /* Creates instances of all editor tools. */
  initializeEditors(viewport: Viewport, world: World): Editors {
    const graphEditor = new GraphEditor(viewport, world.graph);
    graphEditor.setShortcutsToolbar(this.#shortcutsToolbar);

    const corridorEditor = new CorridorEditor(viewport, world);
    corridorEditor.setShortcutsToolbar(this.#shortcutsToolbar);

    const tools = {
      graph: {
        button: this.#graphBtn,
        editor: graphEditor,
      },
      marking: {
        button: this.#markingBtn,
        editor: new MarkingEditor(viewport, world),
      },
      stop: { button: this.#stopBtn, editor: new StopEditor(viewport, world) },
      crossing: {
        button: this.#crossingBtn,
        editor: new CrossingEditor(viewport, world),
      },
      start: {
        button: this.#startBtn,
        editor: new StartEditor(viewport, world),
      },
      parking: {
        button: this.#parkingBtn,
        editor: new ParkingEditor(viewport, world),
      },
      light: {
        button: this.#lightBtn,
        editor: new LightEditor(viewport, world),
      },
      target: {
        button: this.#targetBtn,
        editor: new TargetEditor(viewport, world),
      },
      corridor: {
        button: this.#corridorBtn,
        editor: corridorEditor,
      },
      yield: {
        button: this.#yieldBtn,
        editor: new YieldEditor(viewport, world),
      },
    } as Editors; // Assert final type
    return tools;
  }

  /* Sets the active editor mode. */
  setMode(mode: EditorType): void {
    this.#mode = mode;
    this.disableEditors(); // Disable all editors first
    this.#editors[mode].button.style.backgroundColor = 'white';
    this.#editors[mode].button.style.filter = '';
    this.#editors[mode].editor.enable(); // Enable the selected editor
  }

  /* Disables all editor tools and resets button styles. */
  disableEditors(): void {
    for (const tool of Object.values(this.#editors)) {
      tool.button.style.backgroundColor = 'gray';
      tool.button.style.filter = 'grayscale(100%)';
      tool.editor.disable();
    }
  }

  /* Sets the viewport wheel-input mode (mouse vs. touchpad) on both viewports. */
  setViewportMode(mode: 'mouse' | 'touchpad'): void {
    this.#viewportMode = mode;
    this.#viewport?.setMode(mode);
    this.#miniMapViewport?.setMode(mode);
  }

  save(): void {
    // Update world state with current viewport settings
    this.#world.zoom = this.#viewport.zoom;
    this.#world.offset = this.#viewport.offset;

    const worldString = JSON.stringify(this.#world);

    // Save to localStorage via the store (updates the in-memory editor world so
    // it appears in the selector list, with size-limit handling).
    const saved =
      StoreManager.getInstance()?.setEditorWorld(this.#world) ?? false;
    if (!saved) {
      alert(
        'Warning: World could not be saved to local storage (too large). Saving to file only.',
      );
    }
    this.#worldToolbar.refreshWorldList();

    // Trigger file download
    const element = document.createElement('a');
    // Save as pure JSON (no wrapper)
    element.setAttribute(
      'href',
      `data:application/json;charset=utf-8,${encodeURIComponent(worldString)}`,
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
    // this.#editors.graph.editor.dispose?.();
    // this.#world.markings.length = 0;
    this.#initializeWorldEditor(null);
  }

  /* Displays the OSM data input panel. */
  openOsmPanel(): void {
    this.#osmPanel.style.display = 'block';
  }

  /* Hides the OSM data input panel. */
  closeOsmPanel(): void {
    this.#osmPanel.style.display = 'none';
  }

  /* Parses OSM data from the text area and updates the world graph. */
  parseOsmData(): void {
    const osmData = this.#osmDataContainer.value;
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
      this.#world.graph.points = result.points;
      this.#world.graph.segments = result.segments;
      this.#oldGraphHash = null; // Force regeneration on next draw
      this.closeOsmPanel(); // Close panel on success
    } catch (error) {
      alert(`Error processing OSM data: ${error}`);
      console.error('Error processing OSM data:', error);
    }
  }

  /* Rebuilds the expensive item placement (buildings + trees) on demand. */
  regenerateItems(): void {
    this.#worldLayersToolbar.setBusy(true);
    // Yield once so the busy state paints before the heavy synchronous work.
    setTimeout(() => {
      this.#world.generate({ roads: false, buildings: true, trees: true });
      this.#worldLayersToolbar.setStale(false);
      this.#worldLayersToolbar.setBusy(false);
    }, 0);
  }

  /* Main draw loop called by animate. */
  draw(): void {
    // Reset viewport transforms
    this.#viewport.reset();

    // On graph change, refresh only the cheap road geometry + marking anchors.
    // Expensive item placement is left to the explicit Regenerate items action.
    const currentGraphHash = this.#world.graph.hash();
    if (currentGraphHash !== this.#oldGraphHash) {
      WorldGenerator.generateRoads(this.#world);
      WorldGenerator.reanchorMarkings(this.#world);
      this.#oldGraphHash = currentGraphHash;
      if (this.#world.buildings.length || this.#world.trees.length) {
        this.#worldLayersToolbar?.setStale(true);
      }
    }

    // Get the current viewpoint based on viewport offset
    const viewPoint = scale(this.#viewport.getOffset(), -1);

    // Draw the world with the current per-layer visibility mask.
    this.#world.draw(this.#ctx, { viewPoint, layers: this.#layerVisibility });

    // Draw editor previews (e.g., marking intent) with transparency
    this.#ctx.globalAlpha = this.#mode === 'graph' ? 0.5 : 0.2;
    for (const [, tool] of Object.entries(this.#editors)) {
      tool.editor.display(); // Call display method of active editor
    }
    this.#ctx.globalAlpha = 1.0; // Reset alpha

    this.#viewport.drawScaleIndicator(this.#ctx);

    // Update MiniMapViewPort
    this.#miniMapViewport.reset();
    // Draw the MiniMap
    this.#miniMap.draw({
      viewPoint,
      cars: [],
      roadColor: '#BBB',
      carColor: 'red',
      viewport: this.#miniMapViewport,
      compactScaleIndicator: true,
    }); // Update minimap based on main viewpoint
  }

  /* Animation loop using requestAnimationFrame. */
  animate(): void {
    this.draw();
    requestAnimationFrame(this.animate.bind(this));
  }
}
