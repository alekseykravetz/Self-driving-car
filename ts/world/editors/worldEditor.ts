import { WorldLayerVisibility, DEFAULT_LAYER_VISIBILITY } from '../types.js';
import { EditorType } from '../../simulator/types.js';
import { World } from '../world.js';
import { WorldGenerator } from '../generation/worldGenerator.js';
import { GraphEditor } from './graphEditor.js';
import { MarkingEditor } from './markingEditor.js';
import { CorridorEditor } from './corridorEditor.js';
import { StopEditor } from './stopEditor.js';
import { CrossingEditor } from './crossingEditor.js';
import { StartEditor } from './startEditor.js';
import { ParkingEditor } from './parkingEditor.js';
import { LightEditor } from './lightEditor.js';
import { TargetEditor } from './targetEditor.js';
import { YieldEditor } from './yieldEditor.js';
import { Graph } from '../../math/graph/graph.js';
import { Viewport } from '../../viewport/viewport.js';
import { MiniMap } from '../../mini-map/miniMap.js';
import { Osm, OsmData } from '../../math/osm-importer/osm.js';
import { StoreManager } from '../../store/storeManager.js';
import { WorldToolbarElement } from '../../ui/molecules/worldToolbar.js';
import { WorldLayersToolbarElement } from '../../ui/molecules/worldLayersToolbar.js';
import { ShortcutsToolbarElement } from '../../ui/molecules/shortcutsToolbar.js';
import { EditorToolbarElement } from '../../ui/molecules/editorToolbar.js';
import { KeyboardManager } from '../../input/keyboardManager.js';
import { safeJsonParse } from '../../store/serialization.js';
import { scale } from '../../math/utils.js';

/** Overpass QL filter used to query drivable roads from OpenStreetMap. */
const OSM_FILTER = `[out:json];
(
  way["highway"]
  ["highway" !~"pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway|no"]
  ["access" !~"private"]
  ({{bbox}});
);
out body;
>;
out skel;`;

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

export interface Editor {
  enable(): void;
  disable(): void;
  display(): void;
  dispose?(): void; // Optional dispose method (GraphEditor has it)
}

type Editors = {
  [key in EditorType]: Editor;
};

export class WorldEditor {
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
  #autoRegen: boolean = false;
  #animationFrameId: number = -1;

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
  #openOverpassBtn!: HTMLButtonElement;
  #copyFilterBtn!: HTMLButtonElement;
  #editorToolbar!: EditorToolbarElement;
  #worldToolbar!: WorldToolbarElement;
  #shortcutsToolbar!: ShortcutsToolbarElement;
  #keyboardManager!: KeyboardManager;
  #worldLayersToolbar!: WorldLayersToolbarElement;

  constructor(canvas: HTMLCanvasElement, miniMapCanvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d')!;

    this.#miniMapCanvas = miniMapCanvas;

    this.#assignElementReferences();
    this.#keyboardManager = new KeyboardManager(this.#shortcutsToolbar);
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
    this.#openOverpassBtn = getElement<HTMLButtonElement>('openOverpassBtn');
    this.#copyFilterBtn = getElement<HTMLButtonElement>('copyFilterBtn');
    this.#editorToolbar = document.querySelector(
      'editor-toolbar',
    ) as EditorToolbarElement;
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
    this.#openOverpassBtn.addEventListener(
      'click',
      this.openOverpassTurbo.bind(this),
    );
    this.#copyFilterBtn.addEventListener(
      'click',
      this.copyOsmFilter.bind(this),
    );

    // Editor mode switching via the <editor-toolbar> custom element
    this.#editorToolbar.setModeChangeListener((mode) => this.setMode(mode));

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

    // Populate the shared shortcuts toolbar with the always-active keys.
    // Editor-specific shortcuts (S, E, C, O, H, T) are registered by the
    // editors themselves via KeyboardManager.pushBindings().
    this.#keyboardManager.setBindings([
      {
        id: 'keyCtrl',
        key: '',
        label: 'Ctrl',
        title: 'Ctrl + scroll wheel — Zoom in/out (touchpad mode)',
        group: 'View',
        kind: 'display',
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
    this.#worldLayersToolbar.setAutoRegenListener((on) => {
      this.#autoRegen = on;
      if (on) this.regenerateItems();
    });
    // The editor has no live traffic, so the heatmap overlay toggle is irrelevant.
    this.#worldLayersToolbar.hideOverlays();
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
    graphEditor.bindKeyboard(this.#keyboardManager);

    const corridorEditor = new CorridorEditor(viewport, world);
    corridorEditor.bindKeyboard(this.#keyboardManager);

    const tools: Editors = {
      graph: graphEditor,
      marking: new MarkingEditor(viewport, world),
      stop: new StopEditor(viewport, world),
      crossing: new CrossingEditor(viewport, world),
      start: new StartEditor(viewport, world),
      parking: new ParkingEditor(viewport, world),
      light: new LightEditor(viewport, world),
      target: new TargetEditor(viewport, world),
      corridor: corridorEditor,
      yield: new YieldEditor(viewport, world),
    };
    return tools;
  }

  /* Sets the active editor mode. */
  setMode(mode: EditorType): void {
    this.#mode = mode;
    this.disableEditors();
    this.#editors[mode].enable();
  }

  /* Disables all editor tools and resets button styles. */
  disableEditors(): void {
    for (const editor of Object.values(this.#editors)) {
      editor.disable();
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
  /* Opens Overpass Turbo in a new tab. */
  openOverpassTurbo(): void {
    window.open('https://overpass-turbo.eu/', '_blank');
  }

  /* Copies the Overpass QL filter query to the clipboard. */
  copyOsmFilter(): void {
    navigator.clipboard.writeText(OSM_FILTER).then(
      () => {
        this.#copyFilterBtn.textContent = 'Copied!';
        setTimeout(() => {
          this.#copyFilterBtn.textContent = 'Copy Filter';
        }, 2000);
      },
      () => {
        alert(
          'Could not copy automatically. Select and copy the filter from saves/osm-data-loading-readme.txt',
        );
      },
    );
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

    // On graph change, refresh cheap road geometry + marking anchors,
    // and optionally the expensive building/tree placement (auto-regen).
    const currentGraphHash = this.#world.graph.hash();
    if (currentGraphHash !== this.#oldGraphHash) {
      WorldGenerator.generateRoads(this.#world);
      WorldGenerator.reanchorMarkings(this.#world);
      this.#oldGraphHash = currentGraphHash;
      if (this.#autoRegen) {
        this.#world.generate({ roads: false, buildings: true, trees: true });
      } else if (this.#world.buildings.length || this.#world.trees.length) {
        this.#worldLayersToolbar?.setStale(true);
      }
    }

    // Sync viewport zoom so world.draw can use it for road name visibility.
    this.#world.zoom = this.#viewport.zoom;

    // Get the current viewpoint based on viewport offset
    const viewPoint = scale(this.#viewport.getOffset(), -1);

    // Draw the world with the current per-layer visibility mask.
    this.#world.draw(this.#ctx, { viewPoint, layers: this.#layerVisibility });

    // Draw editor previews (e.g., marking intent) with transparency
    this.#ctx.globalAlpha = this.#mode === 'graph' ? 0.5 : 0.2;
    for (const editor of Object.values(this.#editors)) {
      editor.display();
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
    this.#animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  pause(): void {
    if (this.#animationFrameId !== -1) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = -1;
    }
    this.draw();
  }
}
