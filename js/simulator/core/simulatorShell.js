'use strict';
/**
 * SimulatorShell — reusable scaffolding shared by every canvas-based simulator
 * (AI training Simulator, Live Traffic Jam simulator, …).
 *
 * It owns the generic, non-domain pieces that every simulator needs:
 *   - the four canvases + their 2D contexts (top-down game, 3D camera,
 *     neural-network visualizer, mini-map)
 *   - the Viewport, MiniMap and Camera references
 *   - the shared `<world-toolbar>` / `<layout-toolbar>` /
 *     `<animation-loop-toolbar>` element refs
 *   - the multi-panel responsive layout/resize wiring
 *   - the render-throttled `requestAnimationFrame` loop
 *
 * Subclasses provide the domain behaviour by implementing `update()` and
 * `draw(time)` (and optionally `isPaused()` / `onPausedRender()`), then call
 * `this.animate(0)` once at the end of their constructor to start the loop.
 *
 * Physics/state always steps every animation frame via `update()`; the heavier
 * `draw()` pass is throttled to once per `renderInterval` frames (read live from
 * the animation-loop-toolbar panel) so very large populations keep stepping even
 * when rendering dominates the frame budget.
 */
/** localStorage key for the simulator's per-layer visibility preference. */
const SIM_LAYERS_KEY = 'sim:worldLayers';
/** Load the persisted simulator layer visibility, merged over the defaults. */
function loadSimLayerVisibility() {
  const stored = safeJsonParse(localStorage.getItem(SIM_LAYERS_KEY));
  return { ...DEFAULT_LAYER_VISIBILITY, ...(stored ?? {}) };
}

/** Persist the simulator layer visibility preference. */
function saveSimLayerVisibility(v) {
  localStorage.setItem(SIM_LAYERS_KEY, JSON.stringify(v));
}

class SimulatorShell {
  gameCanvas;
  gameCtx;
  networkCanvas;
  networkCtx;
  networkVisualizer = new NetworkVisualizer();
  miniMapCanvas;
  cameraCanvas;
  cameraCtx;
  viewport = null;
  miniMap = null;
  camera = null;
  // Shared UI panels (custom elements present on every simulator page).
  toolbarPanel;
  layoutToolbar;
  animationLoopToolbar;
  // Per-layer visibility for the top-down 2D view and the 3D camera view.
  // Backed by the optional <world-layers-panel> and persisted to localStorage.
  worldLayers = loadSimLayerVisibility();
  worldLayersPanel = null;
  // Render throttle: physics runs every animation frame, the (heavier) render
  // pass only runs once per `renderInterval` frames (read live from the
  // animation-loop-toolbar panel).
  framesSinceRender = 0;
  // Loop control
  animationFrameId = -1;
  constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas) {
    this.gameCanvas = gameCanvas;
    this.gameCtx = gameCanvas.getContext('2d');
    this.networkCanvas = networkCanvas;
    this.networkCtx = networkCanvas.getContext('2d');
    this.miniMapCanvas = miniMapCanvas;
    this.cameraCanvas = cameraCanvas;
    this.cameraCtx = cameraCanvas.getContext('2d');
    // Get panel element references
    this.toolbarPanel = document.querySelector('world-toolbar');
    this.layoutToolbar = document.querySelector('layout-toolbar');
    this.animationLoopToolbar = document.querySelector(
      'animation-loop-toolbar',
    );
    // Optional world-layers panel: lets the user hide roads/markings/trees/
    // buildings in both the 2D and 3D views. Absent on pages without it.
    this.worldLayersPanel = document.querySelector('world-layers-panel');
    if (this.worldLayersPanel) {
      this.worldLayersPanel.hideItems(); // no regeneration in simulators
      this.worldLayersPanel.setVisibility(this.worldLayers);
      this.worldLayersPanel.setChangeListener((v) => {
        this.worldLayers = v;
        saveSimLayerVisibility(v);
      });
    }
    // Keep the active viewport's wheel behavior in sync with the toolbar toggle
    this.toolbarPanel.setViewportModeListener((mode) =>
      this.viewport?.setMode(mode),
    );
    this.#wireNetworkInteractivity();
    // On phone-sized screens, hide the network visualizer and mini-map by
    // default. The matching CSS hides the related panel sections; this unchecks
    // the toggles the layout reads each frame. Kept in sync with the 768px CSS
    // breakpoint.
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.layoutToolbar.applyMobileDefaults();
    }
  }

  /**
   * Wire hover/click/keyboard interactivity for the neural-network visualizer.
   * Mouse coordinates are converted from client space to the canvas' internal
   * pixel space so hit-testing stays correct under CSS scaling.
   */
  #wireNetworkInteractivity() {
    const toCanvasCoords = (e) => {
      const rect = this.networkCanvas.getBoundingClientRect();
      const sx = rect.width ? this.networkCanvas.width / rect.width : 1;
      const sy = rect.height ? this.networkCanvas.height / rect.height : 1;
      return {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
    };
    this.networkCanvas.addEventListener('mousemove', (e) => {
      const { x, y } = toCanvasCoords(e);
      const interactive = this.networkVisualizer.setMouse(x, y);
      this.networkCanvas.style.cursor = interactive ? 'pointer' : 'default';
    });
    this.networkCanvas.addEventListener('mouseleave', () => {
      this.networkVisualizer.clearMouse();
      this.networkCanvas.style.cursor = 'default';
    });
    this.networkCanvas.addEventListener('click', (e) => {
      const { x, y } = toCanvasCoords(e);
      this.networkVisualizer.handleClick(x, y);
    });
    // `v` toggles the always-show-values density mode (ignored while typing).
    window.addEventListener('keydown', (e) => {
      const target = e.target;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (!typing && (e.key === 'v' || e.key === 'V')) {
        this.networkVisualizer.toggleDensity();
      }
    });
  }

  /**
   * Resize the multi-panel canvas layout to the current window/panel state.
   * Called from the subclass draw pass (before the viewport reset).
   */
  resizeLayout() {
    resizeSimulatorLayout(
      {
        gameCanvas: this.gameCanvas,
        networkCanvas: this.networkCanvas,
        miniMapCanvas: this.miniMapCanvas,
        cameraCanvas: this.cameraCanvas,
      },
      {
        showCamera: this.layoutToolbar.showCameraView,
        showNetwork: this.layoutToolbar.showVisualizer,
        showMiniMap: this.layoutToolbar.showMiniMap,
        layoutMode: this.layoutToolbar.layoutMode,
      },
      this.viewport,
    );
  }

  /**
   * Render the neural-network visualizer for the given brain into the network
   * canvas. No-op when the visualizer toggle is off or no brain is provided.
   */
  drawNetworkVisualizer(time, brain) {
    if (!this.layoutToolbar.showVisualizer) return;
    this.networkCtx.clearRect(
      0,
      0,
      this.networkCanvas.width,
      this.networkCanvas.height,
    );
    if (brain) {
      this.networkVisualizer.draw(this.networkCtx, brain, time);
    }
  }

  /** Whether the simulation step is currently paused. Driven by the toolbar. */
  isPaused() {
    return this.animationLoopToolbar.paused;
  }

  /**
   * Hook invoked on render frames while paused (the world is frozen but the
   * canvas still redraws). Default: no-op.
   */
  onPausedRender() {}
  animate(time) {
    const interval = this.animationLoopToolbar.renderInterval;
    const render = this.framesSinceRender >= interval - 1;
    this.framesSinceRender = render ? 0 : this.framesSinceRender + 1;
    if (!this.isPaused()) {
      this.update();
    } else if (render) {
      this.onPausedRender();
    }
    if (render) {
      this.draw(time);
    }
    // Record the frame in the animation loop toolbar for time tracking
    // Pass true as second parameter if this is a rendered frame
    this.animationLoopToolbar.recordFrame(render);
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
}
