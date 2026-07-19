import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulatorShell } from '../../../../ts/simulator/core/simulatorShell.js';
import type { LayoutMode } from '../../../../ts/simulator/panels/layoutToolbar.js';
import type { WorldLayerVisibility } from '../../../../ts/world/types.js';
import { DEFAULT_LAYER_VISIBILITY } from '../../../../ts/world/types.js';
// ── Helpers ───────────────────────────────────────────────

const LS_SIM_LAYERS_KEY = 'sim:worldLayers';

/** Create a minimal CanvasRenderingContext2D mock with standard methods. */
function makeMockCtx(): CanvasRenderingContext2D {
  return {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    rect: vi.fn(),
    setLineDash: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  } as unknown as CanvasRenderingContext2D;
}

function makeMockCanvas(): HTMLCanvasElement {
  const ctx = makeMockCtx();
  const el = {
    width: 800,
    height: 600,
    getContext: vi.fn((type: string) => (type === '2d' ? ctx : null)),
    style: {} as CSSStyleDeclaration,
    classList: {
      toggle: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(() => false),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
    })),
  } as unknown as HTMLCanvasElement;
  return el;
}

function makeMockToolbars() {
  const animationLoopToolbar = {
    paused: false,
    _renderInterval: 1,
    get renderInterval(): number {
      return this._renderInterval;
    },
    set renderInterval(v: number) {
      this._renderInterval = v;
    },
    recordFrame: vi.fn(),
    addEventListener: vi.fn(),
    querySelector: vi.fn(),
  } as unknown as import('../../../../ts/simulator/panels/animationLoopToolbar.js').AnimationLoopToolbarElement;

  const layoutToolbar = {
    showCameraView: true,
    showVisualizer: true,
    showMiniMap: true,
    layoutMode: 'topview-big' as LayoutMode,
    applyMobileDefaults: vi.fn(),
    addEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  } as unknown as import('../../../../ts/simulator/panels/layoutToolbar.js').LayoutToolbarElement;

  const toolbarPanel = {
    setViewportModeListener: vi.fn(),
    addEventListener: vi.fn(),
    querySelector: vi.fn(),
  } as unknown as import('../../../../ts/panels/worldToolbar.js').WorldToolbarElement;

  return { animationLoopToolbar, layoutToolbar, toolbarPanel };
}

function makeWorldLayersToolbarMock() {
  return {
    hideItems: vi.fn(),
    setVisibility: vi.fn(),
    setChangeListener: vi.fn(),
    setHeatmapChangeListener: vi.fn(),
    addEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  } as unknown as import('../../../../ts/panels/worldLayersToolbar.js').WorldLayersToolbarElement;
}

// ── Concrete test subclass ────────────────────────────────

class TestShell extends SimulatorShell {
  updateCalled = false;
  drawCalled = false;
  lastDrawTime = 0;
  isPausedValue = false;
  onPausedRenderCalled = false;

  update(): void {
    this.updateCalled = true;
  }

  draw(time: number): void {
    this.drawCalled = true;
    this.lastDrawTime = time;
  }

  isPaused(): boolean {
    return this.isPausedValue;
  }

  onPausedRender(): void {
    this.onPausedRenderCalled = true;
  }

  runAnimate(time: number): void {
    this.animate(time);
  }
}

// ── Factory ───────────────────────────────────────────────

function createShell(opts?: {
  noWorldLayersToolbar?: boolean;
  mobile?: boolean;
}): {
  shell: TestShell;
  canvases: {
    game: HTMLCanvasElement;
    network: HTMLCanvasElement;
    miniMap: HTMLCanvasElement;
    camera: HTMLCanvasElement;
  };
  toolbars: ReturnType<typeof makeMockToolbars>;
  worldLayersToolbar: ReturnType<typeof makeWorldLayersToolbarMock> | null;
} {
  const game = makeMockCanvas();
  const network = makeMockCanvas();
  const miniMap = makeMockCanvas();
  const camera = makeMockCanvas();
  const toolbars = makeMockToolbars();
  const wlt = opts?.noWorldLayersToolbar ? null : makeWorldLayersToolbarMock();

  const host = {
    toolbarPanel: toolbars.toolbarPanel,
    layoutToolbar: toolbars.layoutToolbar,
    animationLoopToolbar: toolbars.animationLoopToolbar,
    worldLayersToolbar: wlt,
  } as import('../../../../ts/simulator/views/simulatorPageHost.js').SimulatorPageHost;

  const shell = new TestShell(game, network, miniMap, camera, host);

  return {
    shell,
    canvases: { game, network, miniMap, camera },
    toolbars,
    worldLayersToolbar: wlt,
  };
}

// ── Tests ─────────────────────────────────────────────────

describe('SimulatorShell', () => {
  let lsStore: Record<string, string>;

  beforeEach(() => {
    lsStore = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => lsStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        lsStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete lsStore[key];
      }),
      clear: vi.fn(() => {
        for (const k in lsStore) delete lsStore[k];
      }),
      get length() {
        return Object.keys(lsStore).length;
      },
      key: vi.fn((i: number) => Object.keys(lsStore)[i] ?? null),
    });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 42),
    );

    if (typeof globalThis.window === 'undefined') {
      (globalThis as Record<string, unknown>).window = {} as Window &
        typeof globalThis;
    }
    globalThis.window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Layer visibility ──────────────────────────────────

  describe('layer visibility', () => {
    it('loads defaults when localStorage has no data', () => {
      const { shell } = createShell();
      expect(shell.worldLayers).toEqual(DEFAULT_LAYER_VISIBILITY);
    });

    it('merges stored partial visibility over defaults', () => {
      lsStore[LS_SIM_LAYERS_KEY] = JSON.stringify({
        roads: false,
        trees: false,
      });

      const { shell } = createShell();
      expect(shell.worldLayers.roads).toBe(false);
      expect(shell.worldLayers.markings).toBe(true);
      expect(shell.worldLayers.trees).toBe(false);
      expect(shell.worldLayers.buildings).toBe(true);
    });

    it('persists visibility on change via toolbar callback', () => {
      const { shell, worldLayersToolbar } = createShell();

      let registeredCb: ((v: WorldLayerVisibility) => void) | null = null;
      const setChangeListener = worldLayersToolbar!
        .setChangeListener as ReturnType<typeof vi.fn>;
      expect(setChangeListener).toHaveBeenCalledTimes(1);
      registeredCb = setChangeListener.mock.calls[0][0];

      const newVis: WorldLayerVisibility = {
        ...DEFAULT_LAYER_VISIBILITY,
        roads: false,
        markings: false,
      };
      registeredCb!(newVis);

      expect(shell.worldLayers).toEqual(newVis);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        LS_SIM_LAYERS_KEY,
        JSON.stringify(newVis),
      );
    });
  });

  // ── Construction ──────────────────────────────────────

  describe('construction', () => {
    it('acquires 2d rendering contexts from game, network, and camera canvases', () => {
      const { canvases } = createShell();
      expect(canvases.game.getContext).toHaveBeenCalledWith('2d');
      expect(canvases.network.getContext).toHaveBeenCalledWith('2d');
      expect(canvases.miniMap.getContext).not.toHaveBeenCalled();
      expect(canvases.camera.getContext).toHaveBeenCalledWith('2d');
    });

    it('wires world layers toolbar when present', () => {
      const { worldLayersToolbar } = createShell();
      expect(worldLayersToolbar!.hideItems).toHaveBeenCalled();
      expect(worldLayersToolbar!.setVisibility).toHaveBeenCalledWith(
        DEFAULT_LAYER_VISIBILITY,
      );
      expect(worldLayersToolbar!.setChangeListener).toHaveBeenCalled();
      expect(worldLayersToolbar!.setHeatmapChangeListener).toHaveBeenCalled();
    });

    it('handles missing world layers toolbar gracefully', () => {
      expect(() => createShell({ noWorldLayersToolbar: true })).not.toThrow();
    });

    it('wires viewport mode listener on toolbarPanel', () => {
      const { toolbars } = createShell();
      expect(toolbars.toolbarPanel.setViewportModeListener).toHaveBeenCalled();
    });
  });

  // ── Animation loop ────────────────────────────────────

  describe('animate()', () => {
    it('calls update() and draw() each frame with renderInterval=1', () => {
      const { shell, toolbars } = createShell();
      expect(toolbars.animationLoopToolbar.recordFrame).not.toHaveBeenCalled();

      shell.runAnimate(100);

      expect(shell.updateCalled).toBe(true);
      expect(shell.drawCalled).toBe(true);
      expect(shell.lastDrawTime).toBe(100);

      expect(toolbars.animationLoopToolbar.recordFrame).toHaveBeenCalledWith(
        true,
      );
    });

    it('throttles draw() when renderInterval > 1', () => {
      const { shell, toolbars } = createShell();
      toolbars.animationLoopToolbar['_renderInterval'] = 3;

      // Frame 0: framesSinceRender=0, render=0>=2=false, no draw
      shell.runAnimate(0);
      expect(shell.updateCalled).toBe(true);
      expect(shell.drawCalled).toBe(false);
      expect(toolbars.animationLoopToolbar.recordFrame).toHaveBeenCalledWith(
        false,
      );

      shell.updateCalled = false;

      // Frame 1: framesSinceRender=1, render=1>=2=false, no draw
      shell.runAnimate(1);
      expect(shell.updateCalled).toBe(true);
      expect(shell.drawCalled).toBe(false);
      expect(toolbars.animationLoopToolbar.recordFrame).toHaveBeenCalledWith(
        false,
      );

      shell.updateCalled = false;

      // Frame 2: framesSinceRender=2, render=2>=2=true, DRAW
      shell.runAnimate(2);
      expect(shell.updateCalled).toBe(true);
      expect(shell.drawCalled).toBe(true);
      expect(shell.lastDrawTime).toBe(2);
      expect(toolbars.animationLoopToolbar.recordFrame).toHaveBeenCalledWith(
        true,
      );
    });

    it('skips update() when isPaused() returns true', () => {
      const { shell } = createShell();
      shell.isPausedValue = true;

      shell.runAnimate(0);

      expect(shell.updateCalled).toBe(false);
    });

    it('calls onPausedRender on render frames while paused', () => {
      const { shell } = createShell();
      shell.isPausedValue = true;

      shell.runAnimate(0);

      expect(shell.onPausedRenderCalled).toBe(true);
    });

    it('schedules next frame via requestAnimationFrame', () => {
      const { shell } = createShell();
      shell.runAnimate(0);

      expect(requestAnimationFrame).toHaveBeenCalled();
      expect(shell['animationFrameId']).not.toBe(-1);
    });
  });

  // ── drawNetworkVisualizer ─────────────────────────────

  describe('drawNetworkVisualizer()', () => {
    it('clears network canvas and draws when visualizer is enabled', () => {
      const { shell } = createShell();
      const clearSpy = vi.spyOn(shell.networkCtx, 'clearRect');

      shell.drawNetworkVisualizer(42, {
        levels: [{ inputs: [1], outputs: [0], weights: [[0.5]], biases: [0] }],
      });

      expect(clearSpy).toHaveBeenCalled();

      clearSpy.mockRestore();
    });

    it('does nothing when showVisualizer is false', () => {
      const { shell, toolbars } = createShell();
      toolbars.layoutToolbar['showVisualizer'] = false;

      const clearSpy = vi.spyOn(shell.networkCtx, 'clearRect');
      shell.drawNetworkVisualizer(42, {});

      expect(clearSpy).not.toHaveBeenCalled();
      clearSpy.mockRestore();
    });

    it('clears canvas but does not draw when brain is falsy', () => {
      const { shell } = createShell();
      const clearSpy = vi.spyOn(shell.networkCtx, 'clearRect');

      shell.drawNetworkVisualizer(42, null);

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  // ── Heatmap ───────────────────────────────────────────

  describe('heatmap', () => {
    it('recordHeatmap is no-op when heatmap is hidden', () => {
      const { shell } = createShell();
      const resetSpy = vi.spyOn(shell['heatmapGrid'], 'record');

      shell.recordHeatmap([]);

      expect(resetSpy).not.toHaveBeenCalled();
      resetSpy.mockRestore();
    });
  });

  // ── resetHeatmap ──────────────────────────────────────

  describe('resetHeatmap()', () => {
    it('delegates to heatmapGrid.reset', () => {
      const { shell } = createShell();
      const resetSpy = vi.spyOn(shell['heatmapGrid'], 'reset');

      shell.resetHeatmap();

      expect(resetSpy).toHaveBeenCalledOnce();
      resetSpy.mockRestore();
    });
  });
});
