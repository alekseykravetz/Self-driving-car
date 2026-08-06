import { SimulatorShell } from '../core/simulatorShell.js';
import type { SimulatorPageHost } from '../views/simulatorPageHost.js';
import { SpatialHashGrid } from '../../math/spatialGrid.js';
import type { GridSegment } from '../../math/spatialGrid.js';
import { TrafficControlGrid } from '../../math/trafficControlGrid.js';
import type { TrafficPanelElement } from '../../ui/organisms/trafficPanel.js';
import { KeyboardManager } from '../../input/keyboardManager.js';
import { zoomViewBindings } from '../../input/viewShortcuts.js';
import {
  greenWaveBinding,
  visualizerDensityBinding,
} from '../../input/simulatorShortcuts.js';
import type { ShortcutsToolbarElement } from '../../ui/molecules/shortcutsToolbar.js';
import { World } from '../../world/world.js';
import { Graph } from '../../math/graph/graph.js';
import type { CarInfo } from '../../car/car.js';
import { Car } from '../../car/car.js';
import type { SensorTrafficControl } from '../../car/sensors/sensor.js';
import { Viewport } from '../../viewport/viewport.js';
import { Camera } from '../../camera/camera.js';
import { MiniMap } from '../../mini-map/miniMap.js';
import { StoreManager } from '../../store/storeManager.js';
import { getRandomColor } from '../../math/color.js';
import { buildRoadBorders, queryBordersNearCar } from '../spatialGridUtils.js';
import {
  buildTrafficControls,
  queryTrafficControlsNearCar,
} from '../trafficControlUtils.js';
import { getNearestSegment, scale } from '../../math/utils.js';
import { carAngleFromDirection } from '../../math/direction.js';
import { Point } from '../../math/primitives/point.js';
import type { BorderMode } from '../types.js';
import { BODY_MARGIN_RATIO } from '../../car/config.js';
import { Light } from '../../world/markings/light.js';
import { Start } from '../../world/markings/start.js';
import type { Segment } from '../../math/primitives/segment.js';

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
/** Upper bound on a single bulk-spawn click, to keep the tab responsive. */
const MAX_BULK_SPAWN = 20000;

export class TrafficSimulator extends SimulatorShell {
  #world: World | null = null;
  #roadBorders: GridSegment[] = [];
  #borderGrid!: SpatialHashGrid;
  #trafficGrid: TrafficControlGrid = new TrafficControlGrid(GRID_CELL_SIZE);

  #statsPanel: TrafficPanelElement;

  // Cars the user has placed on the road (the single source of truth; the
  // stats panel is a pure view over this array).
  #cars: Car[] = [];
  #spawnCount: number = 0;

  // Uniform grid of car indices keyed by cell, rebuilt once per update() step
  // so per-car neighbour lookups (#collectCarObstacles) stay near-linear
  // instead of the O(n^2) scan that chokes on bulk-spawned traffic (1k+ cars).
  #carCellIndex: Map<string, number[]> = new Map();

  // Spawn preview: the last mouse event over the game canvas (null while the
  // cursor is off the canvas), whether the heading is flipped 180° (held 'r'),
  // and a cached ghost car reused across frames (rebuilt when the selected car
  // config changes).
  #hoverEvent: MouseEvent | null = null;
  #reverseHeading: boolean = false;
  #keyboardManager: KeyboardManager | null = null;
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

    // Scroll-to-zoom the mini-map (the main viewport already zooms on wheel).
    this.miniMapCanvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (e.deltaY < 0) this.miniMap?.zoomIn();
        else if (e.deltaY > 0) this.miniMap?.zoomOut();
      },
      { passive: false },
    );

    // 'R' (reverse heading) and 'G' (green wave) shortcuts are registered
    // via KeyboardManager in #initToolbar().

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

    // Shortcuts toolbar: spawn-heading flip ('r'), green wave ('g'), and
    // viewport zoom modifier. All key routing is handled by KeyboardManager.
    const toolbar = document.querySelector(
      'shortcuts-toolbar',
    ) as ShortcutsToolbarElement | null;
    if (toolbar) {
      this.#keyboardManager = new KeyboardManager(toolbar);
      this.#keyboardManager.setBindings([
        {
          id: 'keyR',
          key: 'r',
          label: 'R',
          title:
            'R — Flip spawn heading 180°. Hold while placing a car, or click to latch it on permanently.',
          group: 'Spawn',
          kind: 'toggle',
          toggle: {
            onActivate: () => {
              this.#reverseHeading = true;
            },
            onDeactivate: () => {
              this.#reverseHeading = false;
            },
          },
        },
        greenWaveBinding({
          group: 'Spawn',
          onActivate: () => this.#enableGreenWave(),
          onDeactivate: () => this.#disableGreenWave(),
        }),
        // Shared Ctrl / Shift zoom-modifier indicators (traffic is always a
        // full world view, so include the Shift fine-zoom key).
        ...zoomViewBindings(),
        visualizerDensityBinding(() => this.networkVisualizer.toggleDensity()),
      ]);
    }

    // Single-select car: the chosen car is painted on the next road click.
    // Switching world reloads everything (and drops the placed cars). Loading a
    // car file adds it to the library without auto-selecting it.
    this.toolbarPanel.configureSelectors({
      carMode: 'single',
      onWorldSelected: (entry) =>
        this.#loadWorld((entry?.data as World) ?? null),
    });
  }

  #enableGreenWave(): void {
    if (!this.#world) return;
    for (const marking of this.#world.markings) {
      if (marking instanceof Light) {
        this.#world.trafficManager.overrideLight(marking, 'green');
      }
    }
  }

  #disableGreenWave(): void {
    if (!this.#world) return;
    this.#world.trafficManager.releaseAllOverrides();
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
    this.#statsPanel.setSpawnListener((count) => this.#spawnRandomCars(count));
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
    this.#trafficGrid.rebuild(buildTrafficControls(this.#world));
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
    car.name = String(++this.#spawnCount);

    this.#cars.push(car);
    this.#statsPanel.setCars(this.#cars);
    this.#statsPanel.selectCar(car);
  }

  /** Angle that faces the nearest road segment to `point` (start convention).
   *
   * For one-way roads the car faces in the direction of traffic flow (p1→p2).
   * For two-way roads the car faces opposite to the segment's directionVector
   * (the training convention — car travels from start toward target).
   */
  #headingAt(point: Point): number {
    if (!this.#world) return 0;
    const segment = getNearestSegment(
      point,
      this.#world.graph.segments,
      SEGMENT_SEARCH_RADIUS,
    );
    if (!segment) return 0;
    return this.#headingForSegment(segment);
  }

  /** Angle that faces along `segment`'s direction of travel (see #headingAt). */
  #headingForSegment(segment: Segment): number {
    const segDir = segment.directionVector();
    const dir = segment.oneWay ? segDir : new Point(-segDir.x, -segDir.y);
    return carAngleFromDirection(dir);
  }

  /** Spawn heading at `point`, flipped 180° while 'r' is held. */
  #spawnAngle(point: Point): number {
    return this.#headingAt(point) + (this.#reverseHeading ? Math.PI : 0);
  }

  /**
   * Bulk-spawns `rawCount` cars (clamped to `MAX_BULK_SPAWN`) at random points
   * along the world's road segments, using the car currently selected in the
   * toolbar's car selector. Segments are picked length-weighted so spawn
   * density matches road density instead of clustering on short segments.
   * Two-way segments get a random travel direction per car; one-way segments
   * always face the legal direction of travel.
   */
  #spawnRandomCars(rawCount: number): void {
    if (!this.#world) return;

    const segments = this.#world.graph.segments;
    if (segments.length === 0) {
      alert('This world has no roads to spawn cars on.');
      return;
    }

    const info = this.toolbarPanel.getSelectedCars()[0] ?? null;
    if (!info) {
      alert('Pick a car in the Car selector before spawning traffic.');
      return;
    }

    const count = Math.max(1, Math.min(MAX_BULK_SPAWN, Math.round(rawCount)));

    // Cumulative segment-length prefix sums for a length-weighted random pick.
    const prefix: number[] = new Array(segments.length);
    let total = 0;
    for (let i = 0; i < segments.length; i++) {
      total += Math.max(segments[i].length(), 1);
      prefix[i] = total;
    }

    const newCars: Car[] = [];
    for (let i = 0; i < count; i++) {
      const segment = segments[this.#pickWeightedSegment(prefix, total)];
      const t = 0.05 + Math.random() * 0.9;
      const p1 = segment.p1;
      const p2 = segment.p2;
      const point = new Point(
        p1.x + (p2.x - p1.x) * t,
        p1.y + (p2.y - p1.y) * t,
      );
      const flip = !segment.oneWay && Math.random() < 0.5;
      const angle = this.#headingForSegment(segment) + (flip ? Math.PI : 0);

      const car = new Car({
        controlType: 'AI',
        x: point.x,
        y: point.y,
        angle,
        color: getRandomColor(),
      });
      car.load(info);
      car.name = String(++this.#spawnCount);
      newCars.push(car);
    }

    this.#cars.push(...newCars);
    this.#statsPanel.setCars(this.#cars);
  }

  /** Length-weighted random segment index, picked via binary search over `prefix`. */
  #pickWeightedSegment(prefix: number[], total: number): number {
    const r = Math.random() * total;
    let lo = 0;
    let hi = prefix.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (prefix[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // ── Simulation step ──────────────────────────────────

  protected update(): void {
    if (!this.#world || !this.viewport) return;

    const borderMode = this.toolbarPanel.borderMode;
    this.#rebuildCarGrid();

    for (let i = 0; i < this.#cars.length; i++) {
      const car = this.#cars[i];
      // Ghost wrecks: crashed cars stay frozen and invisible to everyone else.
      if (car.damaged) continue;
      const obstacles = this.#collectBorders(car, borderMode);
      const carObstacles = this.#collectCarObstacles(car, i);
      const trafficControls: SensorTrafficControl[] = car.sensor?.stateAware
        ? queryTrafficControlsNearCar(this.#trafficGrid, car)
        : [];
      if (car.sensor?.stateAware) {
        car.update(obstacles, trafficControls, carObstacles);
      } else {
        car.update([...obstacles, ...carObstacles], trafficControls);
      }
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
   * Road borders a single car senses/collides with this step.
   */
  #collectBorders(car: Car, borderMode: BorderMode): Point[][] {
    if (borderMode === 'none') return [];
    return queryBordersNearCar(this.#borderGrid, car);
  }

  /**
   * Buckets alive cars by cell (keyed on `GRID_CELL_SIZE`) so
   * #collectCarObstacles only scans nearby cells instead of every car —
   * O(n) per step instead of O(n^2) once bulk-spawned traffic reaches into
   * the thousands.
   */
  #rebuildCarGrid(): void {
    this.#carCellIndex.clear();
    for (let i = 0; i < this.#cars.length; i++) {
      const car = this.#cars[i];
      if (car.damaged) continue;
      const key = `${Math.floor(car.x / GRID_CELL_SIZE)},${Math.floor(car.y / GRID_CELL_SIZE)}`;
      const bucket = this.#carCellIndex.get(key);
      if (bucket) bucket.push(i);
      else this.#carCellIndex.set(key, [i]);
    }
  }

  /**
   * Other alive cars within sensor reach. Crashed cars are always excluded,
   * so traffic flows around wrecks. `index` is this car's position in
   * `#cars`, used to skip itself without an identity check per candidate.
   */
  #collectCarObstacles(car: Car, index: number): Point[][] {
    const MIN_RANGE = 100;
    const rayLength = car.sensor?.rayLength ?? MIN_RANGE;
    const reach = Math.max(rayLength, MIN_RANGE);
    const bodyMargin = Math.hypot(car.width, car.height) * BODY_MARGIN_RATIO;
    const reachWithBody = reach + bodyMargin;
    const reachWithBodySq = reachWithBody * reachWithBody;

    const minCx = Math.floor((car.x - reachWithBody) / GRID_CELL_SIZE);
    const maxCx = Math.floor((car.x + reachWithBody) / GRID_CELL_SIZE);
    const minCy = Math.floor((car.y - reachWithBody) / GRID_CELL_SIZE);
    const maxCy = Math.floor((car.y + reachWithBody) / GRID_CELL_SIZE);

    const result: Point[][] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.#carCellIndex.get(`${cx},${cy}`);
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const j = bucket[k];
          if (j === index) continue;
          const other = this.#cars[j];
          const dx = other.x - car.x;
          const dy = other.y - car.y;
          if (dx * dx + dy * dy <= reachWithBodySq) {
            result.push(other.polygon);
          }
        }
      }
    }
    return result;
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
      screenBounds: this.viewport.getVisibleBounds(),
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

    this.drawNetworkVisualizer(
      time,
      selected?.brain,
      selected?.sensor?.stateAware,
    );

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
      angle: carAngleFromDirection(direction),
    };
  }
}
