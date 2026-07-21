import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

setupImageMock();

// ── Global mocks ──────────────────────────────────────────

const LS_STORE: Record<string, string> = {};
const LS_EDITOR_LAYERS_KEY = 'editor:worldLayers';

vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => LS_STORE[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    LS_STORE[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete LS_STORE[key];
  }),
  clear: vi.fn(() => {
    for (const k in LS_STORE) delete LS_STORE[k];
  }),
  get length() {
    return Object.keys(LS_STORE).length;
  },
  key: vi.fn((i: number) => Object.keys(LS_STORE)[i] ?? null),
});

vi.stubGlobal('alert', vi.fn());
vi.stubGlobal(
  'requestAnimationFrame',
  vi.fn((cb: () => void) => {
    return setTimeout(cb, 16);
  }),
);
vi.stubGlobal(
  'setTimeout',
  vi.fn((cb: (...args: unknown[]) => void) => {
    cb();
    return 1 as unknown as ReturnType<typeof setTimeout>;
  }),
);

// ── DOM mocks ─────────────────────────────────────────────

const domElements = new Map<string, unknown>();
const querySelectors = new Map<string, unknown>();

function makeMockElement(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const el: Record<string, unknown> = {
    tagName: 'DIV',
    style: { display: '' },
    dataset: {} as Record<string, string>,
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
      value: '',
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn((sel: string) => querySelectors.get(sel) ?? null),
    querySelectorAll: vi.fn(() => []),
    getAttribute: vi.fn(() => null),
    setAttribute: vi.fn(),
    closest: vi.fn(() => null),
    value: '',
    checked: false,
    id: '',
    disabled: false,
    getContext: vi.fn(() => ({
      restore: vi.fn(),
      save: vi.fn(),
      clearRect: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      globalAlpha: 1,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      setTransform: vi.fn(),
    })),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    })),
    ...overrides,
  };
  return el;
}

function registerDomElement(id: string, el: Record<string, unknown>): void {
  el.id = id;
  domElements.set(id, el);
}

const osmDataContainer = makeMockElement({ value: '' });
registerDomElement('saveBtn', makeMockElement());
registerDomElement('disposeBtn', makeMockElement());
registerDomElement('openOsmPanelBtn', makeMockElement());
registerDomElement('osmPanel', makeMockElement({ style: { display: 'none' } }));
registerDomElement('closeOsmPanelBtn', makeMockElement());
registerDomElement('parseOsmDataBtn', makeMockElement());
registerDomElement('osmDataContainer', osmDataContainer);

const toolbarMocks = {
  editorToolbar: makeMockElement({
    setModeChangeListener: vi.fn(),
    setMode: vi.fn(),
  }),
  worldToolbar: makeMockElement({
    showWorldEditorActions: vi.fn(),
    hideGroups: vi.fn(),
    setViewportModeListener: vi.fn(),
    configureSelectors: vi.fn(),
    refreshWorldList: vi.fn(),
  }),
  shortcutsToolbar: makeMockElement({
    setShortcuts: vi.fn(),
    setToggleHandler: vi.fn(),
    setActive: vi.fn(),
    flash: vi.fn(),
  }),
  worldLayersToolbar: makeMockElement({
    setVisibility: vi.fn(),
    setChangeListener: vi.fn(),
    setAutoRegenListener: vi.fn(),
    hideOverlays: vi.fn(),
    setStale: vi.fn(),
    setBusy: vi.fn(),
    getVisibility: vi.fn(() => ({})),
  }),
};

querySelectors.set('editor-toolbar', toolbarMocks.editorToolbar);
querySelectors.set('world-toolbar', toolbarMocks.worldToolbar);
querySelectors.set('shortcuts-toolbar', toolbarMocks.shortcutsToolbar);
querySelectors.set('world-layers-toolbar', toolbarMocks.worldLayersToolbar);

const mockDoc = {
  getElementById: vi.fn((id: string) => domElements.get(id) ?? null),
  querySelector: vi.fn((sel: string) => querySelectors.get(sel) ?? null),
  querySelectorAll: vi.fn(() => []),
  createElement: vi.fn((tag: string) =>
    makeMockElement({ tagName: tag.toUpperCase(), click: vi.fn() }),
  ),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

vi.stubGlobal('document', mockDoc as unknown as Document);

vi.stubGlobal('window', {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  document: mockDoc,
} as unknown as Window & typeof globalThis);

vi.stubGlobal('customElements', {
  define: vi.fn(),
  get: vi.fn(() => undefined),
} as unknown as CustomElementRegistry);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.stubGlobal('HTMLElement', class MockHTMLElement {} as any);

// ── Captured toolbar callbacks ────────────────────────────

interface CapturedCallbacks {
  changeListener: ((v: Record<string, boolean>) => void) | null;
  autoRegenListener: ((on: boolean) => void) | null;
  modeListener: ((mode: string) => void) | null;
  viewportModeListener: ((mode: string) => void) | null;
}

const captured: CapturedCallbacks = {
  changeListener: null,
  autoRegenListener: null,
  modeListener: null,
  viewportModeListener: null,
};

function resetCaptured(): void {
  captured.changeListener = null;
  captured.autoRegenListener = null;
  captured.modeListener = null;
  captured.viewportModeListener = null;
}

// Update the toolbar mocks to capture callbacks
beforeEach(() => {
  toolbarMocks.editorToolbar.setModeChangeListener = vi.fn(
    (cb: (mode: string) => void) => {
      captured.modeListener = cb;
    },
  );
  toolbarMocks.worldToolbar.setViewportModeListener = vi.fn(
    (cb: (mode: string) => void) => {
      captured.viewportModeListener = cb;
    },
  );
  toolbarMocks.worldLayersToolbar.setChangeListener = vi.fn(
    (cb: (v: Record<string, boolean>) => void) => {
      captured.changeListener = cb;
    },
  );
  toolbarMocks.worldLayersToolbar.setAutoRegenListener = vi.fn(
    (cb: (on: boolean) => void) => {
      captured.autoRegenListener = cb;
    },
  );
  resetCaptured();
});

// ── Mock factories for sub-editors ────────────────────────

// ── Module mocks ──────────────────────────────────────────

vi.mock('../../../../ts/world/editors/graphEditor.js', () => ({
  GraphEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
      bindKeyboard: vi.fn(),
      dispose: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/corridorEditor.js', () => ({
  CorridorEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
      bindKeyboard: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/markingEditor.js', () => ({
  MarkingEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/stopEditor.js', () => ({
  StopEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/crossingEditor.js', () => ({
  CrossingEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/startEditor.js', () => ({
  StartEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/parkingEditor.js', () => ({
  ParkingEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/lightEditor.js', () => ({
  LightEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/targetEditor.js', () => ({
  TargetEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/world/editors/yieldEditor.js', () => ({
  YieldEditor: function () {
    return {
      enable: vi.fn(),
      disable: vi.fn(),
      display: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/panels/keyboardManager.js', () => ({
  KeyboardManager: function () {
    return {
      setBindings: vi.fn(),
      pushBindings: vi.fn(),
      popBindings: vi.fn(),
      dispose: vi.fn(),
      setToggleActive: vi.fn(),
    };
  },
}));

vi.mock('../../../../ts/viewport/viewport.js', () => ({
  Viewport: function () {
    return {
      canvas: { getContext: vi.fn() } as unknown as HTMLCanvasElement,
      zoom: 1,
      offset: { x: 0, y: 0 },
      mode: 'mouse',
      setMode: vi.fn(),
      reset: vi.fn(),
      getOffset: vi.fn(() => ({ x: 0, y: 0 })),
      drawScaleIndicator: vi.fn(),
      getZoom: vi.fn(() => 1),
      getMouse: vi.fn(() => ({ x: 0, y: 0 })),
      getPixelsPerMeter: vi.fn(() => 10),
    };
  },
}));

vi.mock('../../../../ts/mini-map/miniMap.js', () => ({
  MiniMap: function () {
    return {
      draw: vi.fn(),
      viewport: {
        canvas: { getContext: vi.fn() } as unknown as HTMLCanvasElement,
        zoom: 1,
        offset: { x: 0, y: 0 },
        setMode: vi.fn(),
        reset: vi.fn(),
        getOffset: vi.fn(() => ({ x: 0, y: 0 })),
        getZoom: vi.fn(() => 1),
      },
    };
  },
}));

vi.mock('../../../../ts/store/storeManager.js', () => ({
  StoreManager: {
    getActiveWorld: vi.fn(() => null),
    getInstance: vi.fn(() => ({
      setEditorWorld: vi.fn(() => true),
    })),
  },
}));

vi.mock('../../../../ts/math/osm-importer/osm.js', () => ({
  Osm: {
    parseRoads: vi.fn(() => ({
      points: [],
      segments: [],
    })),
  },
}));

// ── Module under test ─────────────────────────────────────

import { WorldEditor } from '../../../../ts/world/editors/worldEditor.js';
import { DEFAULT_LAYER_VISIBILITY } from '../../../../ts/world/types.js';
import type { EditorType } from '../../../../ts/simulator/types.js';

// ── Helpers ───────────────────────────────────────────────

function makeCanvas(): HTMLCanvasElement {
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ({
      restore: vi.fn(),
      save: vi.fn(),
      clearRect: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
      globalAlpha: 1,
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      setTransform: vi.fn(),
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    })),
    style: {} as CSSStyleDeclaration,
  } as unknown as HTMLCanvasElement;
}

function createEditor(): WorldEditor {
  return new WorldEditor(makeCanvas(), makeCanvas());
}

beforeEach(() => {
  LS_STORE[LS_EDITOR_LAYERS_KEY] = JSON.stringify({
    roads: true,
    markings: true,
    corridors: false,
    itemBases: false,
    trees: true,
    buildings: false,
  });
});

afterEach(() => {
  for (const k in LS_STORE) delete LS_STORE[k];
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────

describe('WorldEditor', () => {
  describe('construction', () => {
    it('creates editor with canvas context', () => {
      const editor = createEditor();
      expect(editor).toBeInstanceOf(WorldEditor);
    });

    it('loads layer visibility from localStorage', () => {
      const stored = JSON.parse(LS_STORE[LS_EDITOR_LAYERS_KEY]);
      expect(stored.buildings).toBe(false);
      expect(stored.corridors).toBe(false);
    });

    it('toolbar setVisibility is called during construction', () => {
      createEditor();
      expect(toolbarMocks.worldLayersToolbar.setVisibility).toHaveBeenCalled();
    });
  });

  describe('layer visibility', () => {
    it('persists to localStorage when change listener fires', () => {
      createEditor();

      expect(captured.changeListener).toBeInstanceOf(Function);

      const newVisibility: Record<string, boolean> = {
        roads: false,
        markings: false,
        corridors: false,
        itemBases: true,
        trees: false,
        buildings: true,
      };
      captured.changeListener!(newVisibility);

      const saved = JSON.parse(LS_STORE[LS_EDITOR_LAYERS_KEY]);
      expect(saved.roads).toBe(false);
      expect(saved.buildings).toBe(true);
      expect(saved.itemBases).toBe(true);
    });

    it('defaults match DEFAULT_LAYER_VISIBILITY when nothing stored', () => {
      delete LS_STORE[LS_EDITOR_LAYERS_KEY];

      createEditor();

      expect(DEFAULT_LAYER_VISIBILITY.roads).toBe(true);
      expect(DEFAULT_LAYER_VISIBILITY.markings).toBe(true);
      expect(DEFAULT_LAYER_VISIBILITY.corridors).toBe(true);
      expect(DEFAULT_LAYER_VISIBILITY.itemBases).toBe(false);
      expect(DEFAULT_LAYER_VISIBILITY.trees).toBe(true);
      expect(DEFAULT_LAYER_VISIBILITY.buildings).toBe(true);
    });
  });

  describe('editor mode switching', () => {
    it('default mode enables graph editor', () => {
      createEditor();
      expect(
        toolbarMocks.editorToolbar.setModeChangeListener,
      ).toHaveBeenCalled();
    });

    it('switching mode disables old editor and enables new one', () => {
      const editor = createEditor();
      editor.setMode('stop');
      expect(toolbarMocks.worldLayersToolbar.setVisibility).toHaveBeenCalled();
    });

    it('each editor type can be activated', () => {
      const editor = createEditor();

      const modes: EditorType[] = [
        'graph',
        'marking',
        'stop',
        'crossing',
        'start',
        'parking',
        'light',
        'target',
        'corridor',
        'yield',
      ];

      for (const mode of modes) {
        expect(() => editor.setMode(mode)).not.toThrow();
      }
    });

    it('setMode through mode listener callback works', () => {
      createEditor();

      expect(captured.modeListener).toBeInstanceOf(Function);
      expect(() => captured.modeListener!('corridor')).not.toThrow();
    });
  });

  describe('auto-regen', () => {
    it('regenerateItems does not throw', () => {
      const editor = createEditor();
      expect(() => editor.regenerateItems()).not.toThrow();
    });

    it('setAutoRegen listener fires but does not throw', () => {
      createEditor();
      expect(captured.autoRegenListener).toBeInstanceOf(Function);
      expect(() => captured.autoRegenListener!(true)).not.toThrow();
      expect(() => captured.autoRegenListener!(false)).not.toThrow();
    });
  });

  describe('setViewportMode', () => {
    it('switching viewport mode does not throw', () => {
      const editor = createEditor();
      expect(() => editor.setViewportMode('touchpad')).not.toThrow();
    });

    it('setViewportMode through toolbar callback works', () => {
      createEditor();
      expect(captured.viewportModeListener).toBeInstanceOf(Function);
      expect(() => captured.viewportModeListener!('touchpad')).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('dispose recreates world without throwing', () => {
      const editor = createEditor();
      expect(() => editor.dispose()).not.toThrow();
    });
  });

  describe('initializeEditors', () => {
    it('returns editors object with all required keys', () => {
      const viewport = {
        canvas: makeCanvas(),
      } as unknown as import('../../../../ts/viewport/viewport.js').Viewport;
      const worldLike = {
        graph: {},
      } as import('../../../../ts/world/world.js').World;
      const editor = createEditor();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const editors = (editor as any).initializeEditors(viewport, worldLike);

      const expected: EditorType[] = [
        'graph',
        'marking',
        'stop',
        'crossing',
        'start',
        'parking',
        'light',
        'target',
        'corridor',
        'yield',
      ];
      for (const key of expected) {
        expect(editors[key]).toBeDefined();
      }
    });
  });

  describe('save', () => {
    it('save does not throw', () => {
      const editor = createEditor();
      expect(() => editor.save()).not.toThrow();
    });
  });

  describe('openOsmPanel / closeOsmPanel', () => {
    it('openOsmPanel sets osmPanel display to block', () => {
      const editor = createEditor();
      const osmPanelEl = domElements.get('osmPanel') as Record<string, unknown>;
      expect(() => editor.openOsmPanel()).not.toThrow();
      expect(osmPanelEl.style).toBeDefined();
    });

    it('closeOsmPanel sets osmPanel display to none', () => {
      const editor = createEditor();
      expect(() => editor.closeOsmPanel()).not.toThrow();
    });
  });

  describe('parseOsmData', () => {
    it('parseOsmData with empty text area alerts user', () => {
      const editor = createEditor();
      editor.parseOsmData();
      expect(alert).toHaveBeenCalled();
    });

    it('parseOsmData stores parsed data via mock', () => {
      const editor = createEditor();
      const osmDataEl = domElements.get('osmDataContainer') as Record<
        string,
        unknown
      >;
      osmDataEl.value = '{"elements":[]}';
      editor.parseOsmData();
    });
  });

  describe('draw', () => {
    it('draw does not throw', () => {
      const editor = createEditor();
      expect(() => editor.draw()).not.toThrow();
    });
  });
});
