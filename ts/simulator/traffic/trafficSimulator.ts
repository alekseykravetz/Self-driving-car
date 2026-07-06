import { SimulatorShell } from '../core/simulatorShell.js';
import type { SimulatorPageHost } from '../views/simulatorPageHost.js';
import { SpatialHashGrid } from '../../math/spatialGrid.js';
import type { GridSegment } from '../../math/spatialGrid.js';
import type { TrafficPanelElement } from './trafficPanel.js';
import type { ShortcutsToolbarElement } from '../../panels/shortcutsToolbar.js';
import { World } from '../../world/world.js';
import { Graph } from '../../math/graph/graph.js';
import type { CarInfo } from '../../car/car.js';
import { Car } from '../../car/car.js';
import { Viewport } from '../../viewport/viewport.js';
import { Camera } from '../../camera/camera.js';
import { MiniMap } from '../../mini-map/miniMap.js';
import { StoreManager } from '../../store/storeManager.js';
import { getRandomColor } from '../../math/color.js';
import { buildRoadBorders, queryBordersNearCar } from '../spatialGridUtils.js';
import { getNearestSegment, scale, angle } from '../../math/utils.js';
import { Point } from '../../math/primitives/point.js';
import type { BorderMode } from '../../panels/modeControls.js';
import { BODY_MARGIN_RATIO } from '../../car/config.js';
import { Start } from '../../world/markings/start.js';

/**
 * TrafficSimulator — the "Live Traffic Jam" simulator.
 *
 * Loads a saved world and lets the user paint AI cars onto the road by
 * clicking. Each placed car is named "Car N", faces the nearest road segment
 * and immediately starts driving with its loaded brain. A side
 * `<traffic-panel>` lists every placed car (colour, status, speed,
 * distance + read-only config) and drives the selection/remove/clear/pause
 * interactions.
 *
 * Collision semantics (per the feature spec):
 *   - Cars collide with road borders (when the toolbar border mode is on) AND
 *     with each other.
 *   - When a car crashes it stays put, rendered grey, and is *ghosted*: it is
 *     no longer stepped and no other car sees it (excluded from every car's
 *     obstacle set), so traffic flows around the wreck without chain damage.
 *
 * Generic scaffolding (canvases, viewport, camera, mini-map, panels, the
 * render-throttled RAF loop) lives in {@link SimulatorShell}; this class only
 * adds the traffic-specific domain behaviour.
 */
const GRID_CELL_SIZE = 150;
const SEGMENT_SEARCH_RADIUS = 200;

export class TrafficSimulator extends SimulatorShell {
  #world: World | null = null;
  #roadBorders: GridSegment[] = [];
  #borderGrid!: SpatialHashGrid;

  #statsPanel: TrafficPanelElement;

  // Cars the user has placed on the road (the single source of truth; the
  // stats panel is a pure view over this array).
  #cars: Car[] = [];
  #spawnCount: number = 0;

  // Spawn preview: the last mouse event over the game canvas (null while the
  // cursor is off the canvas), whether the heading is flipped 180° (held 'r'),
  // and a cached ghost car reused across frames (rebuilt when the selected car
  // config changes).
  #hoverEvent: MouseEvent | null = null;
  #reverseHeading: boolean = false;
  // Reverse heading is active while 'r' is held OR while latched on by clicking
  // the shortcuts toolbar; the effective `#reverseHeading` is `held || latched`.
  #reverseHeld: boolean = false;
  #reverseLatched: boolean = false;
  #shortcutsToolbar: ShortcutsToolbarElement | null = null;
  #previewCar: Car | null = null;
  #previewInfo: CarInfo | null = null;

  constructor(
    gameCanvas: HTMLCanvasElement,
    networkCanvas: HTMLCanvasElement,
    miniMapCanvas: HTMLCanvasElement,
    cameraCanvas: HTMLCanvasElement,
    host: SimulatorPageHost,
  ) {
    super(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);

    this.#statsPanel = document.querySelector(
      'traffic-panel',
    ) as TrafficPanelElement;

    this.#initToolbar();
    this.#initStatsPanel();

    // Paint a car wherever the user left-clicks the road. Left-click is free:
    // viewport panning uses the middle mouse button.
    this.gameCanvas.addEventListener('click', (e) => this.#handleSpawnClick(e));

    // Track the cursor to render a ghost preview of the car that would spawn.
    this.gameCanvas.addEventListener(
      'mousemove',
      (e) => (this.#hoverEvent = e),
    );
    this.gameCanvas.addEventListener(
      'mouseleave',
      () => (this.#hoverEvent = null),
    );

    // Hold 'r' to flip the spawn heading 180° (preview + actual spawn). The
    // shortcuts toolbar can also latch it on with a click.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.#reverseHeld = true;
        this.#updateReverse();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.#reverseHeld = false;
        this.#updateReverse();
      }
    });

    // Load the active world (store/loaded selection, then the editor's copy).
    const storeWorld =
      StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld();
    this.#loadWorld((storeWorld as World | null) ?? null);

    this.animate(0);
  }

  // ── Setup ────────────────────────────────────────────

  #initToolbar(): void {
    // Tracking is driven by the stats-panel selection, not the training pool,
    // so the toolbar's pool-tracking group is irrelevant here.
    this.toolbarPanel.hideGroups('tracking-sep', 'tracking');

    // Shortcuts toolbar: spawn-heading flip ('r') plus the viewport zoom
    // modifier. The reverse toggle can be held or click-latched.
    this.#shortcutsToolbar = document.querySelector(
      'shortcuts-toolbar',
    ) as ShortcutsToolbarElement | null;
    this.#shortcutsToolbar?.setShortcuts([
      {
        id: 'keyR',
        label: 'R',
        title:
          'R — Flip spawn heading 180°. Hold while placing a car, or click to latch it on permanently.',
        group: 'Spawn',
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
    this.#shortcutsToolbar?.setClickListener((id) => {
      if (id === 'keyR') {
        this.#reverseLatched = !this.#reverseLatched;
        this.#updateReverse();
      }
    });

    // Single-select car: the chosen car is painted on the next road click.
    // Switching world reloads everything (and drops the placed cars). Loading a
    // car file adds it to the library without auto-selecting it.
    this.toolbarPanel.configureSelectors({
      carMode: 'single',
      onWorldSelected: (entry) =>
        this.#loadWorld((entry?.data as World) ?? null),
    });
  }

  // Recompute the effective reverse-heading state (held OR latched) and sync the
  // toolbar indicator.
  #updateReverse(): void {
    this.#reverseHeading = this.#reverseHeld || this.#reverseLatched;
    this.#shortcutsToolbar?.setActive('keyR', this.#reverseHeading);
  }

  #initStatsPanel(): void {
    this.#statsPanel.setSelectListener((car) => this.#snapTo(car));
    this.#statsPanel.setRemoveListener((car) => {
      const i = this.#cars.indexOf(car);
      if (i >= 0) this.#cars.splice(i, 1);
      this.#statsPanel.setCars(this.#cars);
    });
    this.#statsPanel.setClearListener(() => {
      this.#cars = [];
      this.#statsPanel.setCars(this.#cars);
    });
    this.#statsPanel.setDeleteDamagedListener(() => {
      this.#cars = this.#cars.filter((c) => !c.damaged);
      this.#statsPanel.setCars(this.#cars);
    });
  }

  #loadWorld(worldInfo: World | null): void {
    this.#world = worldInfo ? World.load(worldInfo) : new World(new Graph());

    this.#cars = [];
    this.#spawnCount = 0;
    this.#statsPanel.setCars(this.#cars);
    this.resetHeatmap();

    this.viewport = new Viewport(
      this.gameCanvas,
      this.#world.zoom,
      this.#world.offset,
    );
    this.viewport.setMode(this.toolbarPanel.viewportMode);

    this.miniMap = new MiniMap(
      this.miniMapCanvas,
      this.#world.graph,
      this.miniMapCanvas.width,
    );

    const startInfo = this.#getStartInfo();
    this.camera = new Camera(startInfo);

    // Snap the viewport to the start so the first click lands on visible road.
    this.viewport.offset.x = -startInfo.x;
    this.viewport.offset.y = -startInfo.y;

    this.#roadBorders = buildRoadBorders(this.#world);
    this.#borderGrid = new SpatialHashGrid(GRID_CELL_SIZE);
    this.#borderGrid.build(this.#roadBorders);
  }

  // ── Spawning ─────────────────────────────────────────

  #handleSpawnClick(e: MouseEvent): void {
    if (e.button !== 0 || !this.#world || !this.viewport) return;

    const info = this.toolbarPanel.getSelectedCars()[0] ?? null;
    if (!info) {
      alert('Pick a car in the Car selector before placing one.');
      return;
    }

    const point = this.viewport.getMouse(e);
    const car = new Car({
      controlType: 'AI',
      x: point.x,
      y: point.y,
      angle: this.#spawnAngle(point),
      color: getRandomColor(),
    });
    car.load(info);
    car.name = `Car ${++this.#spawnCount}`;

    this.#cars.push(car);
    this.#statsPanel.setCars(this.#cars);
  }

  /** Angle that faces the nearest road segment to `point` (start convention). */
  #headingAt(point: Point): number {
    if (!this.#world) return 0;
    const segment = getNearestSegment(
      point,
      this.#world.graph.segments,
      SEGMENT_SEARCH_RADIUS,
    );
    if (!segment) return 0;
    return -angle(segment.directionVector()) + Math.PI / 2;
  }

  /** Spawn heading at `point`, flipped 180° while 'r' is held. */
  #spawnAngle(point: Point): number {
    return this.#headingAt(point) + (this.#reverseHeading ? Math.PI : 0);
  }

  // ── Simulation step ──────────────────────────────────

  protected update(): void {
    if (!this.#world || !this.viewport) return;

    const borderMode = this.toolbarPanel.borderMode;

    for (let i = 0; i < this.#cars.length; i++) {
      const car = this.#cars[i];
      // Ghost wrecks: crashed cars stay frozen and invisible to everyone else.
      if (car.damaged) continue;
      car.update(this.#collectObstacles(car, borderMode));
    }

    this.recordHeatmap(this.#cars);

    // Follow the car selected in the stats panel (if any).
    const target = this.#statsPanel.getSelectedCar();
    if (target) {
      this.viewport.offset.x = -target.x;
      this.viewport.offset.y = -target.y;
      this.camera?.move(target);
    }
  }

  /**
   * Obstacle polygons a single car senses/collides with this step:
   *   - nearby road borders (narrow-phase filtered),
   *   - the body polygons of other *alive* cars within reach (car-vs-car).
   * Both follow the toolbar border/collision mode: when it is 'none' there is
   * no collision at all (free driving). Crashed cars are always excluded, so
   * traffic flows around wrecks.
   */
  #collectObstacles(car: Car, borderMode: BorderMode): Point[][] {
    if (borderMode === 'none') return [];

    const MIN_RANGE = 100;
    const rayLength = car.sensor?.rayLength ?? MIN_RANGE;
    const reach = Math.max(rayLength, MIN_RANGE);
    const bodyMargin = Math.hypot(car.width, car.height) * BODY_MARGIN_RATIO;
    const reachWithBody = reach + bodyMargin;
    const reachWithBodySq = reachWithBody * reachWithBody;

    const obstacles: Point[][] = [];

    // Road borders (broad-phase grid query + narrow-phase distance filter).
    const nearby = queryBordersNearCar(this.#borderGrid, car);
    for (let j = 0; j < nearby.length; j++) {
      obstacles.push(nearby[j]);
    }

    // Car-vs-car: small populations, so a distance-filtered O(n²) scan is fine.
    for (let j = 0; j < this.#cars.length; j++) {
      const other = this.#cars[j];
      if (other === car || other.damaged) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      if (dx * dx + dy * dy <= reachWithBodySq) {
        obstacles.push(other.polygon);
      }
    }

    return obstacles;
  }

  // ── Render ───────────────────────────────────────────

  protected draw(time: number): void {
    if (!this.#world || !this.viewport) return;

    this.resizeLayout();
    this.viewport.reset();
    const viewPoint = scale(this.viewport.getOffset(), -1);

    // Draw the world without its own cars; we render the placed cars ourselves
    // so we can grey-out wrecks and show the selected car's sensor.
    this.#world.draw(this.gameCtx, {
      viewPoint,
      showStartMarkings: false,
      layers: this.worldLayers,
    });

    this.viewport.drawScaleIndicator(this.gameCtx);

    const selected = this.#statsPanel.getSelectedCar();
    for (let i = 0; i < this.#cars.length; i++) {
      const car = this.#cars[i];
      if (car.damaged) {
        // Grey polygon (showMask:false renders damaged cars in grey).
        car.draw(this.gameCtx, { showMask: false });
      } else {
        car.draw(this.gameCtx, {
          showMask: true,
          showName: true,
          showSensor: car === selected,
        });
      }
    }

    // Ghost preview of the car that would spawn under the cursor.
    this.#drawSpawnPreview();

    this.drawHeatmap(viewPoint);

    // When the network visualizer is hidden the mini-map floats over the green
    // game canvas, so it mirrors the world editor's palette (grey roads) and
    // paints its own green backdrop into the canvas bitmap. Next to the network
    // panel it sits on a black backdrop and uses white roads.
    const floatingMiniMap =
      this.layoutToolbar.showMiniMap && !this.layoutToolbar.showVisualizer;
    this.miniMap?.draw(
      floatingMiniMap
        ? {
            viewPoint,
            cars: this.#cars,
            roadColor: '#BBB',
            carColor: 'red',
            backgroundColor: '#2a5',
          }
        : { viewPoint, cars: this.#cars },
    );

    this.drawNetworkVisualizer(time, selected?.brain);

    if (this.layoutToolbar.showCameraView && this.camera) {
      const keyCar = selected ?? this.#cars[0];
      const traffic = keyCar
        ? this.#cars.filter((c) => c !== keyCar)
        : this.#cars;
      this.camera.render(this.cameraCtx, this.#world, {
        keyCar,
        cars: this.#cars,
        traffic,
        showTrees: this.worldLayers.trees,
        showBuildings: this.worldLayers.buildings,
      });
    }

    this.#statsPanel.refresh();
  }

  // ── Helpers ──────────────────────────────────────────

  /**
   * Render a translucent ghost of the car that would spawn under the cursor,
   * oriented like the real spawn (faces the nearest road, flipped 180° while
   * 'r' is held), plus a forward-direction arrow. No-op when the cursor is off
   * the canvas or no car is selected.
   */
  #drawSpawnPreview(): void {
    if (!this.#hoverEvent || !this.#world || !this.viewport) return;

    const info = this.toolbarPanel.getSelectedCars()[0] ?? null;
    if (!info) return;

    // Rebuild the ghost only when the selected car config changes.
    if (this.#previewInfo !== info || !this.#previewCar) {
      const car = new Car({ controlType: 'AI', x: 0, y: 0, color: '#fff' });
      car.load(info);
      this.#previewCar = car;
      this.#previewInfo = info;
    }

    const point = this.viewport.getMouse(this.#hoverEvent);
    const heading = this.#spawnAngle(point);
    const car = this.#previewCar;
    car.x = point.x;
    car.y = point.y;
    car.angle = heading;

    // Body: sprite draws straight from x/y/angle, so a stale polygon is fine.
    car.draw(this.gameCtx, { showMask: true, alpha: 0.5 });

    // Forward-direction arrow (forward unit vector = (-sin a, -cos a)).
    const fx = -Math.sin(heading);
    const fy = -Math.cos(heading);
    const len = car.height * 1.4;
    const tipX = point.x + fx * len;
    const tipY = point.y + fy * len;
    const head = 8;

    const ctx = this.gameCtx;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(tipX, tipY);
    // Arrowhead: two barbs rotated ±150° off the forward direction.
    ctx.lineTo(
      tipX +
        (Math.cos((5 * Math.PI) / 6) * fx - Math.sin((5 * Math.PI) / 6) * fy) *
          head,
      tipY +
        (Math.sin((5 * Math.PI) / 6) * fx + Math.cos((5 * Math.PI) / 6) * fy) *
          head,
    );
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
      tipX +
        (Math.cos((-5 * Math.PI) / 6) * fx -
          Math.sin((-5 * Math.PI) / 6) * fy) *
          head,
      tipY +
        (Math.sin((-5 * Math.PI) / 6) * fx +
          Math.cos((-5 * Math.PI) / 6) * fy) *
          head,
    );
    ctx.stroke();
    ctx.restore();
  }

  #snapTo(car: Car | null): void {
    if (!car || !this.viewport) return;
    this.viewport.offset.x = -car.x;
    this.viewport.offset.y = -car.y;
    this.camera?.move(car);
  }

  #getStartInfo(): { x: number; y: number; angle: number } {
    if (!this.#world) {
      return { x: 100, y: 100, angle: 0 };
    }

    const startMarkings = this.#world.markings.filter(
      (m): m is Start => m instanceof Start,
    );

    const startPoint = startMarkings.length
      ? startMarkings[0].center
      : new Point(100, 100);
    const direction = startMarkings.length
      ? startMarkings[0].directionVector
      : new Point(0, -1);

    return {
      x: startPoint.x,
      y: startPoint.y,
      angle: -angle(direction) + Math.PI / 2,
    };
  }
}
