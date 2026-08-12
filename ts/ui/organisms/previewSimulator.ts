import { StoreManager } from '../../store/storeManager.js';
import { World } from '../../world/world.js';
import { Car } from '../../car/car.js';
import type { CarInfo } from '../../car/car.js';
import type { SensorTrafficControl } from '../../car/sensors/sensor.js';
import { Viewport } from '../../viewport/viewport.js';
import { SpatialHashGrid } from '../../math/spatialGrid.js';
import type { GridSegment } from '../../math/spatialGrid.js';
import { TrafficControlGrid } from '../../math/trafficControlGrid.js';
import {
  buildRoadBorders,
  queryBordersNearCar,
} from '../../simulator/spatialGridUtils.js';
import {
  buildTrafficControls,
  queryTrafficControlsNearCar,
} from '../../simulator/trafficControlUtils.js';
import { getRandomColor } from '../../math/color.js';
import { carAngleFromDirection } from '../../math/direction.js';
import { Point } from '../../math/primitives/point.js';
import { scale } from '../../math/utils.js';
import type { Segment } from '../../math/primitives/segment.js';

/** Cell size (world px) for the border / traffic-control spatial grids. */
const GRID_CELL_SIZE = 150;
/** Number of cars auto-spawned into the showcase. */
const PREVIEW_CAR_COUNT = 20;
/** Cars crash into road borders as well as each other in the showcase. */
const PREVIEW_BORDER_COLLISION = true;
/** How quickly the camera eases toward the swarm centroid (0..1 per frame). */
const CAMERA_EASE = 0.06;
/** Store worlds preferred for the showcase, most-preferred first. */
const PREFERRED_WORLDS = ['Ashkelon_city.world', 'Ashkelon_part.world'];

/**
 * PreviewSimulator — a self-contained, non-interactive "live traffic" showcase
 * rendered on a single canvas for the landing page's second screen.
 *
 * It reuses the real {@link World} / {@link Car} / {@link Viewport} stack (the
 * same driving brains and physics as the Live Traffic Jam simulator) but owns a
 * tiny, purpose-built loop instead of the full {@link SimulatorShell}: no
 * toolbars, panels, network visualizer or mini-map. ~20 cars from the store are
 * spawned along the road and drive themselves; crashed cars respawn so the
 * scene stays lively. The camera eases toward the swarm centroid.
 *
 * The loop is inert until {@link activate} is called (so it costs nothing while
 * the landing grid is on screen) and is stopped again by {@link deactivate}.
 */
export class PreviewSimulatorElement extends HTMLElement {
  #canvas!: HTMLCanvasElement;
  #ctx!: CanvasRenderingContext2D;

  #world: World | null = null;
  #viewport: Viewport | null = null;
  #cars: Car[] = [];
  #configs: CarInfo[] = [];

  #roadBorders: GridSegment[] = [];
  #borderGrid = new SpatialHashGrid(GRID_CELL_SIZE);
  #trafficGrid = new TrafficControlGrid(GRID_CELL_SIZE);

  #camera = new Point(0, 0);
  #rafId = -1;
  #initialized = false;
  #running = false;
  #paused = false;
  #resizeObserver: ResizeObserver | null = null;

  connectedCallback(): void {
    this.#paused = new URLSearchParams(window.location.search).has('paused');

    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'preview-sim-canvas';
    this.appendChild(this.#canvas);
    this.#ctx = this.#canvas.getContext('2d')!;

    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(this);
    this.#resize();
  }

  disconnectedCallback(): void {
    this.deactivate();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  /** Start (or resume) the showcase loop, initializing the world on first use. */
  async activate(): Promise<void> {
    if (this.#running) return;
    if (!this.#initialized) await this.#init();
    if (!this.#world) return; // no usable world in the store — leave the canvas blank

    this.#running = true;
    if (this.#paused) {
      // Deterministic single frame for screenshots; no animation loop.
      this.#draw();
      return;
    }
    const step = (): void => {
      if (!this.#running) return;
      this.#update();
      this.#draw();
      this.#rafId = requestAnimationFrame(step);
    };
    this.#rafId = requestAnimationFrame(step);
  }

  /** Stop the showcase loop (leaves the last frame painted on the canvas). */
  deactivate(): void {
    this.#running = false;
    if (this.#rafId !== -1) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = -1;
    }
  }

  // ── Setup ────────────────────────────────────────────

  async #init(): Promise<void> {
    this.#initialized = true;
    await StoreManager.init();

    const worldInfo = this.#pickWorld();
    if (!worldInfo) return;

    this.#world = World.load(worldInfo as World);
    this.#configs = this.#pickCarConfigs();

    this.#viewport = new Viewport(
      this.#canvas,
      this.#world.zoom,
      this.#world.offset,
    );

    this.#roadBorders = buildRoadBorders(this.#world);
    this.#borderGrid.build(this.#roadBorders);
    this.#trafficGrid.rebuild(buildTrafficControls(this.#world));

    this.#spawnCars();

    const c = this.#swarmCentroid();
    this.#camera = c;
    this.#viewport.offset.x = -c.x;
    this.#viewport.offset.y = -c.y;
  }

  /** Pick a store world with roads, preferring the curated city maps. */
  #pickWorld(): object | null {
    const active = StoreManager.getActiveWorld();
    if (active && this.#hasRoads(active)) return active;

    const worlds = StoreManager.getAllWorlds();
    for (const name of PREFERRED_WORLDS) {
      const match = worlds.find(
        (w) => w.name === name && this.#hasRoads(w.data),
      );
      if (match) return match.data;
    }
    return worlds.find((w) => this.#hasRoads(w.data))?.data ?? null;
  }

  #hasRoads(worldInfo: object): boolean {
    const g = (worldInfo as { graph?: { segments?: unknown[] } }).graph;
    return Boolean(g?.segments && g.segments.length > 0);
  }

  /** All store cars (bundled + user-loaded), falling back to the active set. */
  #pickCarConfigs(): CarInfo[] {
    const stored = StoreManager.getAllCars().map((c) => c.data);
    if (stored.length > 0) return stored;
    return StoreManager.getActiveCars();
  }

  // ── Spawning ─────────────────────────────────────────

  #spawnCars(): void {
    this.#cars = [];
    for (let i = 0; i < PREVIEW_CAR_COUNT; i++) {
      const car = this.#makeCar();
      if (car) this.#cars.push(car);
    }
  }

  /** Build one car at a random road point, or null if the world has no roads. */
  #makeCar(): Car | null {
    if (!this.#world || this.#configs.length === 0) return null;
    const segments = this.#world.graph.segments;
    if (segments.length === 0) return null;

    const segment = segments[Math.floor(Math.random() * segments.length)];
    const t = 0.1 + Math.random() * 0.8;
    const point = new Point(
      segment.p1.x + (segment.p2.x - segment.p1.x) * t,
      segment.p1.y + (segment.p2.y - segment.p1.y) * t,
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
    car.load(this.#configs[Math.floor(Math.random() * this.#configs.length)]);
    return car;
  }

  #headingForSegment(segment: Segment): number {
    const segDir = segment.directionVector();
    const dir = segment.oneWay ? segDir : new Point(-segDir.x, -segDir.y);
    return carAngleFromDirection(dir);
  }

  // ── Simulation step ──────────────────────────────────

  #update(): void {
    if (!this.#world || !this.#viewport) return;

    for (let i = 0; i < this.#cars.length; i++) {
      const car = this.#cars[i];
      if (car.damaged) {
        // Respawn wrecks elsewhere so the showcase never empties out.
        const fresh = this.#makeCar();
        if (fresh) this.#cars[i] = fresh;
        continue;
      }

      const borders = PREVIEW_BORDER_COLLISION
        ? queryBordersNearCar(this.#borderGrid, car)
        : [];
      const carObstacles = this.#collectCarObstacles(car, i);
      const trafficControls: SensorTrafficControl[] = car.sensor?.stateAware
        ? queryTrafficControlsNearCar(this.#trafficGrid, car)
        : [];

      if (car.sensor?.stateAware) {
        car.update(borders, trafficControls, carObstacles);
      } else {
        car.update([...borders, ...carObstacles], trafficControls);
      }
    }

    // Ease the camera toward the centroid of the alive swarm.
    const c = this.#swarmCentroid();
    this.#camera.x += (c.x - this.#camera.x) * CAMERA_EASE;
    this.#camera.y += (c.y - this.#camera.y) * CAMERA_EASE;
    this.#viewport.offset.x = -this.#camera.x;
    this.#viewport.offset.y = -this.#camera.y;
  }

  /** O(n^2) neighbour scan — trivial at ~20 cars. */
  #collectCarObstacles(car: Car, index: number): Point[][] {
    const result: Point[][] = [];
    for (let j = 0; j < this.#cars.length; j++) {
      if (j === index) continue;
      const other = this.#cars[j];
      if (other.damaged) continue;
      result.push(other.polygon);
    }
    return result;
  }

  #swarmCentroid(): Point {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const car of this.#cars) {
      if (car.damaged) continue;
      sx += car.x;
      sy += car.y;
      n++;
    }
    if (n === 0) return new Point(this.#camera.x, this.#camera.y);
    return new Point(sx / n, sy / n);
  }

  // ── Render ───────────────────────────────────────────

  #draw(): void {
    if (!this.#world || !this.#viewport) return;

    this.#viewport.reset();
    const viewPoint = scale(this.#viewport.getOffset(), -1);

    this.#world.draw(this.#ctx, {
      viewPoint,
      showStartMarkings: false,
      screenBounds: this.#viewport.getVisibleBounds(),
      renderRadius: this.#viewport.getRenderRadius(),
    });

    for (const car of this.#cars) {
      if (car.damaged) continue;
      car.draw(this.#ctx, { showMask: true });
    }
  }

  #resize(): void {
    const w = Math.max(1, Math.round(this.clientWidth));
    const h = Math.max(1, Math.round(this.clientHeight));
    if (this.#canvas.width === w && this.#canvas.height === h) return;
    this.#canvas.width = w;
    this.#canvas.height = h;
    if (this.#viewport) {
      this.#viewport.center = new Point(w / 2, h / 2);
      if (!this.#running) this.#draw();
    }
  }
}

customElements.define('preview-simulator', PreviewSimulatorElement);
