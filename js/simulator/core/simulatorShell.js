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
class SimulatorShell {
  gameCanvas;
  gameCtx;
  networkCanvas;
  networkCtx;
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
    // Keep the active viewport's wheel behavior in sync with the toolbar toggle
    this.toolbarPanel.setViewportModeListener((mode) =>
      this.viewport?.setMode(mode),
    );
    // On phone-sized screens, hide the network visualizer and mini-map by
    // default. The matching CSS hides the related panel sections; this unchecks
    // the toggles the layout reads each frame. Kept in sync with the 768px CSS
    // breakpoint.
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.layoutToolbar.applyMobileDefaults();
    }
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
    this.networkCtx.lineDashOffset = -time / 50;
    this.networkCtx.clearRect(
      0,
      0,
      this.networkCanvas.width,
      this.networkCanvas.height,
    );
    if (brain) {
      Visualizer.drawNetwork(this.networkCtx, brain);
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
