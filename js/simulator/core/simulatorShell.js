import { DEFAULT_LAYER_VISIBILITY } from '../../world/types.js';
import { NetworkVisualizer } from '../../neural-network/visualizer.js';
import { safeJsonParse } from '../../store/serialization.js';
import { resizeSimulatorLayout } from '../rendering/layoutManager.js';
import { HeatmapGrid } from '../../math/heatmapGrid.js';
import { HeatmapRenderer } from '../../rendering/heatmapRenderer.js';
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
export class SimulatorShell {
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
    // Backed by the optional <world-layers-toolbar> and persisted to localStorage.
    worldLayers = loadSimLayerVisibility();
    worldLayersToolbar = null;
    // Render throttle: physics runs every animation frame, the (heavier) render
    // pass only runs once per `renderInterval` frames (read live from the
    // animation-loop-toolbar panel).
    framesSinceRender = 0;
    // Spatial congestion heatmap. Off by default; toggled via the 🌡️ button on
    // the <world-layers-toolbar> "Overlays" group. Recording and rendering are
    // both gated on the toggle so there is zero overhead when the overlay is
    // hidden. The state lives on the shell (not read live from the toolbar) so
    // `recordHeatmap`/`drawHeatmap` keep working even when the toolbar element is
    // absent.
    heatmapGrid = new HeatmapGrid(150);
    heatmapRenderer = new HeatmapRenderer(this.heatmapGrid);
    heatmapVisible = false;
    // Loop control
    animationFrameId = -1;
    constructor(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host) {
        this.gameCanvas = gameCanvas;
        this.gameCtx = gameCanvas.getContext('2d');
        this.networkCanvas = networkCanvas;
        this.networkCtx = networkCanvas.getContext('2d');
        this.miniMapCanvas = miniMapCanvas;
        this.cameraCanvas = cameraCanvas;
        this.cameraCtx = cameraCanvas.getContext('2d');
        // Shared toolbar elements (injected via host to avoid direct DOM queries).
        this.toolbarPanel = host.toolbarPanel;
        this.layoutToolbar = host.layoutToolbar;
        this.animationLoopToolbar = host.animationLoopToolbar;
        this.worldLayersToolbar = host.worldLayersToolbar;
        if (this.worldLayersToolbar) {
            this.worldLayersToolbar.hideItems(); // no regeneration in simulators
            this.worldLayersToolbar.setVisibility(this.worldLayers);
            this.worldLayersToolbar.setChangeListener((v) => {
                this.worldLayers = v;
                saveSimLayerVisibility(v);
            });
            this.worldLayersToolbar.setHeatmapChangeListener((on) => {
                this.heatmapVisible = on;
                if (!on)
                    this.resetHeatmap();
            });
        }
        // Keep the active viewport's wheel behavior in sync with the toolbar toggle
        this.toolbarPanel.setViewportModeListener((mode) => this.viewport?.setMode(mode));
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
            const typing = target?.tagName === 'INPUT' ||
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
        resizeSimulatorLayout({
            gameCanvas: this.gameCanvas,
            networkCanvas: this.networkCanvas,
            miniMapCanvas: this.miniMapCanvas,
            cameraCanvas: this.cameraCanvas,
        }, {
            showCamera: this.layoutToolbar.showCameraView,
            showNetwork: this.layoutToolbar.showVisualizer,
            showMiniMap: this.layoutToolbar.showMiniMap,
            layoutMode: this.layoutToolbar.layoutMode,
        }, this.viewport);
    }
    /**
     * Record one frame of vehicle occupancy into the heatmap. No-op when the
     * heatmap toggle is off (zero overhead when hidden). Call from a subclass
     * `update()` with the cars currently in the simulation.
     */
    recordHeatmap(cars) {
        if (!this.heatmapVisible)
            return;
        this.heatmapGrid.record(cars.map((c) => ({ x: c.x, y: c.y, speed: c.speed, damaged: c.damaged })));
    }
    /**
     * Paint the heatmap overlay on the game canvas. Call from a subclass
     * `draw()` after the world + cars are drawn, while the viewport transform is
     * still applied to `gameCtx`. No-op when the toggle is off.
     */
    drawHeatmap(viewPoint) {
        if (!this.heatmapVisible)
            return;
        const zoom = this.viewport?.zoom ?? 1;
        const halfW = (this.gameCanvas.width / 2) * zoom;
        const halfH = (this.gameCanvas.height / 2) * zoom;
        this.heatmapRenderer.draw(this.gameCtx, {
            minX: viewPoint.x - halfW,
            minY: viewPoint.y - halfH,
            maxX: viewPoint.x + halfW,
            maxY: viewPoint.y + halfH,
        });
    }
    /** Reset heatmap counters (call on simulation restart / world change). */
    resetHeatmap() {
        this.heatmapGrid.reset();
    }
    /**
     * Render the neural-network visualizer for the given brain into the network
     * canvas. No-op when the visualizer toggle is off or no brain is provided.
     */
    drawNetworkVisualizer(time, brain, stateAware, match) {
        if (!this.layoutToolbar.showVisualizer)
            return;
        this.networkCtx.clearRect(0, 0, this.networkCanvas.width, this.networkCanvas.height);
        if (brain) {
            this.networkVisualizer.draw(this.networkCtx, brain, time, stateAware, match);
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
    onPausedRender() { }
    animate(time) {
        const interval = this.animationLoopToolbar.renderInterval;
        const render = this.framesSinceRender >= interval - 1;
        this.framesSinceRender = render ? 0 : this.framesSinceRender + 1;
        if (!this.isPaused()) {
            this.update();
        }
        else if (render) {
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
