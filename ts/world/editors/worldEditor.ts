import { WorldLayerVisibility, DEFAULT_LAYER_VISIBILITY } from '../types.js';
import { EditorType } from '../types.js';
import { World } from '../world.js';
import { WorldGenerator } from '../generation/worldGenerator.js';
import { GraphEditor } from './graphEditor.js';
import { MarkingEditor } from './markingEditor.js';
import { CorridorEditor } from './corridorEditor.js';
import { InspectEditor } from './inspectEditor.js';
import { StopEditor } from './stopEditor.js';
import { CrossingEditor } from './crossingEditor.js';
import { StartEditor } from './startEditor.js';
import { ParkingEditor } from './parkingEditor.js';
import { LightEditor } from './lightEditor.js';
import { TargetEditor } from './targetEditor.js';
import { YieldEditor } from './yieldEditor.js';
import { Graph } from '../../math/graph/graph.js';
import { Viewport } from '../../viewport/viewport.js';
import { MiniMap, wireMiniMapWheelZoom } from '../../mini-map/miniMap.js';
import { WorldEditorOsmImporter } from './worldEditorOsmImport.js';
import { StoreManager } from '../../store/storeManager.js';
import { WorldSetupElement } from '../../ui/molecules/worldSetup.js';
import { WorldLayersToolbarElement } from '../../ui/molecules/worldLayersToolbar.js';
import { ShortcutsToolbarElement } from '../../ui/molecules/shortcutsToolbar.js';
import { EditorToolbarElement } from '../../ui/molecules/editorToolbar.js';
import { GenerationProgressElement } from '../../ui/molecules/generationProgress.js';
import { KeyboardManager } from '../../input/keyboardManager.js';
import { zoomViewBindings } from '../../input/viewShortcuts.js';
import { safeJsonParse } from '../../store/serialization.js';
import { scale } from '../../math/utils.js';
import {
  segmentToMetadata,
  applyMetadataToSegment,
} from './segmentMetadata.js';
import type {
  WorldEditorPanelElement,
  SegmentMetadata,
} from '../../ui/organisms/worldEditorPanel.js';

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
  #editors!: Editors;
  #mode: EditorType = 'graph';
  #viewportMode: 'mouse' | 'touchpad' = 'mouse';
  #oldGraphHash: string | null = null;
  #autoRegen: boolean = false;
  #animationFrameId: number = -1;
  // True while an async (time-sliced) generation is in progress; blocks
  // re-entrant generation requests.
  #generating: boolean = false;

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
  #worldToolbar!: WorldSetupElement;
  #shortcutsToolbar!: ShortcutsToolbarElement;
  #keyboardManager!: KeyboardManager;
  #worldLayersToolbar!: WorldLayersToolbarElement;
  #worldEditorPanel!: WorldEditorPanelElement;
  #inspectEditor!: InspectEditor;
  #generationProgress: GenerationProgressElement | null = null;
  #osmImporter!: WorldEditorOsmImporter;

  constructor(canvas: HTMLCanvasElement, miniMapCanvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d')!;

    this.#miniMapCanvas = miniMapCanvas;
    wireMiniMapWheelZoom(this.#miniMapCanvas, () => this.#miniMap);

    this.#assignElementReferences();
    this.#keyboardManager = new KeyboardManager(this.#shortcutsToolbar);
    this.#osmImporter = new WorldEditorOsmImporter({
      getWorld: () => this.#world,
      getViewport: () => this.#viewport,
      getCanvas: () => this.#canvas,
      getAutoRegen: () => this.#autoRegen,
      onGraphHashUpdated: (hash) => {
        this.#oldGraphHash = hash;
      },
      osmPanel: this.#osmPanel,
      osmDataContainer: this.#osmDataContainer,
      copyFilterBtn: this.#copyFilterBtn,
      worldLayersToolbar: this.#worldLayersToolbar,
      generationProgress: this.#generationProgress,
      generatingGuard: {
        get: () => this.#generating,
        set: (v) => {
          this.#generating = v;
        },
      },
    });

    // Decide which world the editor opens, and reflect that choice as the active
    // store selection *before* the toolbar selectors render so the "Selected"
    // display and world-picker radio stay in sync on every (re-)entry.
    const storedWorld = safeJsonParse<World>(
      localStorage.getItem('editorWorld'),
    );
    let initialWorld: World | null;
    if (storedWorld) {
      StoreManager.getInstance()?.setActiveWorldId('editor');
      initialWorld = storedWorld;
    } else {
      initialWorld = StoreManager.getActiveWorld() as World | null;
    }

    this.#addEventListeners();
    this.#initializeWorldEditor(initialWorld);
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
      'world-setup',
    ) as WorldSetupElement;
    this.#shortcutsToolbar = document.querySelector(
      'shortcuts-toolbar',
    ) as ShortcutsToolbarElement;
    this.#worldLayersToolbar = document.querySelector(
      'world-layers-toolbar',
    ) as WorldLayersToolbarElement;
    this.#worldEditorPanel = document.querySelector(
      'world-editor-panel',
    ) as WorldEditorPanelElement;
    this.#generationProgress =
      document.querySelector<GenerationProgressElement>('generation-progress');
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

    // The shared <world-setup> hosts the World group (load/save/dispose/OSM)
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
    // Adopt the toolbar's initial mode (touchpad by default on mobile).
    this.#viewportMode = this.#worldToolbar.viewportMode;
    this.#worldToolbar.setViewportModeListener((mode) =>
      this.setViewportMode(mode),
    );

    // Populate the shared shortcuts toolbar with the always-active keys.
    // Editor-specific shortcuts (S, E, C, O, H, T) are registered by the
    // editors themselves via KeyboardManager.pushBindings().
    this.#keyboardManager.setBindings([
      // Shared Ctrl / Shift zoom-modifier indicators (the editor is always a
      // full world view, so include the Shift fine-zoom key).
      ...zoomViewBindings(),
      {
        id: 'keyG',
        key: 'g',
        label: 'G',
        title: 'G — Switch to the Graph editor (draw roads)',
        group: 'Editor',
        kind: 'momentary',
        handler: {
          onKeyDown: () => this.setMode('graph'),
        },
      },
      {
        id: 'keyI',
        key: 'i',
        label: 'I',
        title: 'I — Switch to the Inspect tool (view/edit segment metadata)',
        group: 'Editor',
        kind: 'momentary',
        handler: {
          onKeyDown: () => this.setMode('inspect'),
        },
      },
    ]);

    // World selector: loading a file opens it for editing; picking from the
    // library (loaded / editor / store) loads that world into the editor.
    this.#worldToolbar.configureSelectors({
      selectOnWorldFileLoad: true,
      onWorldSelected: (entry) =>
        this.#initializeWorldEditor((entry?.data as World) ?? null),
    });
    // The editor edits a single world; the car selector is irrelevant here.
    this.#worldToolbar.hideSelectedCarRow();

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

    // ── World Editor Panel — toggle → km sync (stored, fires later) ──
    this.#worldEditorPanel.setToggleOListener((active) =>
      this.#keyboardManager.setToggleActive('keyO', active),
    );
    this.#worldEditorPanel.setToggleHListener((active) =>
      this.#keyboardManager.setToggleActive('keyH', active),
    );
    this.#worldEditorPanel.setToggleTListener((active) =>
      this.#keyboardManager.setToggleActive('keyT', active),
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
    // A drawing tool is always active in the editor, so single-finger touches
    // draw/select and only two-finger gestures pan/zoom the map.
    this.#viewport.setTouchPanMode('two-finger-only');

    this.#editors = this.initializeEditors(this.#viewport, this.#world);

    this.#oldGraphHash = this.#world.graph.hash();

    this.setMode('graph');

    this.#miniMap = new MiniMap(
      this.#miniMapCanvas,
      this.#world.graph,
      this.#miniMapCanvas.width, // Use canvas width for size
      0.02, // Scaler
    );
    this.#miniMap.setOnRecenter((p) => this.#viewport.recenterOn(p));
    this.#miniMap.enableInput();

    // Wire brush state + metadata + editor toggle sync (after editors exist)
    this.#worldEditorPanel?.setBrushChangeListener((state) => {
      (this.#editors.graph as GraphEditor).setBrushState(state);
    });
    (this.#editors.graph as GraphEditor).setOnToggleChange((key, active) => {
      if (key === 'O') this.#worldEditorPanel?.setToggleOActive(active);
      if (key === 'H') this.#worldEditorPanel?.setToggleHActive(active);
    });
    this.#worldEditorPanel?.setOnMetadataChange((meta) => {
      this.#applyMetadataToSelectedSegment(meta);
    });
    // Language changes only affect label text; the signage cache key folds the
    // language, so a redraw re-renders the labels in the chosen language.
    this.#worldEditorPanel?.setOnSignageLanguageChange(() => {
      this.draw();
    });
    // A freshly loaded/created world already has its items generated in memory.
    this.#worldLayersToolbar?.setStale(false);
  }

  /* Creates instances of all editor tools. */
  initializeEditors(viewport: Viewport, world: World): Editors {
    const graphEditor = new GraphEditor(viewport, world.graph);
    graphEditor.bindKeyboard(this.#keyboardManager);

    const corridorEditor = new CorridorEditor(viewport, world);
    corridorEditor.bindKeyboard(this.#keyboardManager);

    const inspectEditor = new InspectEditor(viewport, world);
    inspectEditor.bindKeyboard(this.#keyboardManager);
    this.#inspectEditor = inspectEditor;

    // Wire corridor toggle sync with panel
    corridorEditor.setOnToggleChange((key, active) => {
      if (key === 'T') this.#worldEditorPanel.setToggleTActive(active);
    });

    // Wire inspect editor segment-selected callback
    inspectEditor.setOnSegmentSelected((segment) => {
      this.#worldEditorPanel.showSegmentMetadata(
        segment ? segmentToMetadata(segment) : null,
      );
    });

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
      inspect: inspectEditor,
    };
    return tools;
  }

  /* Sets the active editor mode. */
  setMode(mode: EditorType): void {
    this.#mode = mode;
    this.disableEditors();
    this.#editors[mode].enable();
    // Keep the editor-toolbar button highlight in sync (e.g. when the mode is
    // switched via the G / I keyboard shortcuts rather than a button click).
    this.#editorToolbar.highlightMode(mode);
    if (mode === 'inspect') {
      this.#worldEditorPanel.showSegmentMetadata(null);
    } else {
      this.#worldEditorPanel.resetToDefaults();
    }
  }

  #applyMetadataToSelectedSegment(meta: Partial<SegmentMetadata>): void {
    const seg = this.#inspectEditor.getSelectedSegment();
    if (!seg) return;
    applyMetadataToSegment(seg, meta);
  }

  /* Disables all editor tools and resets button styles. */
  disableEditors(): void {
    for (const editor of Object.values(this.#editors)) {
      editor.disable();
    }
  }

  /* Sets the viewport wheel-input mode (mouse vs. touchpad) on the main viewport. */
  setViewportMode(mode: 'mouse' | 'touchpad'): void {
    this.#viewportMode = mode;
    this.#viewport?.setMode(mode);
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
    this.#osmImporter.openPanel();
  }

  /* Hides the OSM data input panel. */
  closeOsmPanel(): void {
    this.#osmImporter.closePanel();
  }

  /* Parses OSM data from the text area and updates the world graph. */
  parseOsmData(): Promise<void> {
    return this.#osmImporter.parse();
  }

  /* Opens Overpass Turbo in a new tab. */
  openOverpassTurbo(): void {
    this.#osmImporter.openOverpassTurbo();
  }

  /* Copies the Overpass QL filter query to the clipboard. */
  copyOsmFilter(): void {
    this.#osmImporter.copyFilter();
  }

  /* Rebuilds the expensive item placement on demand. For OSM-imported worlds
   * this regenerates only trees — the real building footprints are preserved
   * (building generation is skipped for the `'osm'` source). */
  regenerateItems(): void {
    void this.#runGeneration({ roads: false, buildings: true, trees: true });
  }

  /* Whether generated items are now out of date with the roads (drives the
   * "regenerate" pulse). OSM footprints are real and road-independent, so they
   * never count — only generated trees can go stale for an OSM world. */
  #itemsBecameStale(): boolean {
    if (this.#world.buildingSource === 'osm') {
      return this.#world.trees.length > 0;
    }
    return this.#world.buildings.length > 0 || this.#world.trees.length > 0;
  }

  /**
   * Runs a time-sliced world generation with a progress overlay, keeping the
   * UI responsive so large OSM imports never freeze the tab. Re-entrant calls
   * while a generation is in flight are ignored.
   */
  async #runGeneration(opts: {
    roads?: boolean;
    buildings?: boolean;
    trees?: boolean;
  }): Promise<void> {
    if (this.#generating) return;
    this.#generating = true;
    this.#worldLayersToolbar?.setBusy(true);
    const overlay = this.#generationProgress;
    overlay?.start('Generating world…');
    try {
      await this.#world.generateAsync({
        ...opts,
        onProgress: (p) => overlay?.update(p),
      });
      this.#oldGraphHash = this.#world.graph.hash();
      // Items were (re)built unless both were skipped; clear the stale flag if
      // items now exist, otherwise mark stale so the user knows to regenerate.
      const builtItems = opts.buildings || opts.trees;
      if (
        !builtItems &&
        (this.#world.buildings.length || this.#world.trees.length)
      ) {
        this.#worldLayersToolbar?.setStale(true);
      } else {
        this.#worldLayersToolbar?.setStale(false);
      }
    } catch (err) {
      console.error('World generation failed:', err);
      alert(`World generation failed: ${err}`);
    } finally {
      overlay?.finish();
      this.#worldLayersToolbar?.setBusy(false);
      this.#generating = false;
    }
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
      } else if (this.#itemsBecameStale()) {
        this.#worldLayersToolbar?.setStale(true);
      }
    }

    // Sync viewport zoom so world.draw can use it for road name visibility.
    this.#world.zoom = this.#viewport.zoom;

    // Get the current viewpoint based on viewport offset
    const viewPoint = scale(this.#viewport.getOffset(), -1);

    // Draw the world with the current per-layer visibility mask. Reuse the
    // hash already computed above for change detection so world.draw doesn't
    // recompute it.
    this.#world.draw(this.#ctx, {
      viewPoint,
      layers: this.#layerVisibility,
      graphHash: currentGraphHash,
      screenBounds: this.#viewport.getVisibleBounds(),
      renderRadius: this.#viewport.getRenderRadius(),
    });

    // Draw editor previews (e.g., marking intent) with transparency. In inspect
    // mode fade the graph (points + segments) to almost invisible so the
    // selected/hovered segment reads clearly; the inspect tool forces full
    // opacity for its own highlight internally.
    this.#ctx.globalAlpha =
      this.#mode === 'graph' ? 0.5 : this.#mode === 'inspect' ? 0.06 : 0.2;
    for (const editor of Object.values(this.#editors)) {
      editor.display();
    }
    this.#ctx.globalAlpha = 1.0; // Reset alpha

    this.#viewport.drawScaleIndicator(this.#ctx);

    // Draw the MiniMap, synced one-way to the main viewport's zoom.
    this.#miniMap.draw({
      viewPoint,
      cars: [],
      roadColor: '#BBB',
      carColor: 'red',
      mainViewportZoom: this.#viewport.zoom,
      compactScaleIndicator: true,
    });
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
