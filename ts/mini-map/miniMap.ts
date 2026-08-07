import { Graph } from '../math/graph/graph.js';
import { Point } from '../math/primitives/point.js';
import { ScaleIndicator } from '../viewport/scaleIndicator.js';
import { scale } from '../math/utils.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import { drawPoint } from '../rendering/pointRenderer.js';
import { WORLD_PIXELS_PER_METER } from '../math/worldUnits.js';
import { PointerGestures } from '../input/pointerGestures.js';

export interface IMiniMapCar {
  x: number;
  y: number;
  damaged: boolean;
  color: string;
}

export interface MiniMapDrawOptions {
  viewPoint: Point;
  cars: IMiniMapCar[];
  roadColor?: string;
  carColor?: string;
  backgroundColor?: string;
  /**
   * Current zoom of the main top-down viewport. When provided, the mini-map
   * follows the main viewport's zoom changes proportionally — a one-way sync:
   * zooming the mini-map itself (via {@link MiniMap#zoomIn} /
   * {@link MiniMap#zoomOut}) never affects the main viewport.
   */
  mainViewportZoom?: number;
  compactScaleIndicator?: boolean;
  /** Whether to draw the scale-indicator overlay. Defaults to true. */
  showScaleIndicator?: boolean;
}

/** Smallest world-to-minimap scale (most zoomed out). */
const MIN_SCALER = 0.005;
/** Largest world-to-minimap scale (most zoomed in). */
const MAX_SCALER = 0.3;
/** Multiplicative step applied per zoom-in/out button click. */
const SCALER_ZOOM_FACTOR = 1.25;

export class MiniMap {
  #canvas: HTMLCanvasElement;
  #graph: Graph;
  #size: number;
  #scaler: number;
  #ctx: CanvasRenderingContext2D;
  #scaleIndicator: ScaleIndicator | null = null;
  // Last main-viewport zoom seen by #syncToMainZoom, used to compute the
  // proportional scaler change on the next call (one-way sync).
  #lastMainZoom: number | null = null;
  // Last drawn view point (main-viewport center), needed to invert a tapped
  // mini-map pixel back to a world coordinate.
  #lastViewPoint: Point = new Point(0, 0);
  #gestures: PointerGestures | null = null;
  #onRecenter: ((worldPoint: Point) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    graph: Graph,
    size: number,
    scaler: number = 0.05,
  ) {
    this.#canvas = canvas;
    this.#graph = graph;
    this.#size = size;
    this.#scaler = scaler;

    this.#canvas.width = size;
    this.#canvas.height = size;

    this.#ctx = canvas.getContext('2d')!;
  }

  /** Current world-to-minimap scale. */
  getScaler(): number {
    return this.#scaler;
  }

  #setScaler(scaler: number): void {
    this.#scaler = Math.max(MIN_SCALER, Math.min(MAX_SCALER, scaler));
  }

  /** Zooms the minimap in one step (clamped). */
  zoomIn(): void {
    this.#setScaler(this.#scaler * SCALER_ZOOM_FACTOR);
  }

  /** Zooms the minimap out one step (clamped). */
  zoomOut(): void {
    this.#setScaler(this.#scaler / SCALER_ZOOM_FACTOR);
  }

  /**
   * Registers a callback invoked when the user taps or drags the mini-map, so
   * the host can recenter the main viewport on the chosen world location.
   */
  setOnRecenter(cb: (worldPoint: Point) => void): void {
    this.#onRecenter = cb;
  }

  /** Converts a mini-map canvas pixel to a world coordinate (inverse of draw). */
  #canvasToWorld(cx: number, cy: number): Point {
    return new Point(
      (cx - this.#size / 2) / this.#scaler + this.#lastViewPoint.x,
      (cy - this.#size / 2) / this.#scaler + this.#lastViewPoint.y,
    );
  }

  /**
   * Enables touch input: one-finger tap or drag recenters the main viewport on
   * the touched location; pinch zooms the mini-map's own scale.
   */
  enableInput(): void {
    if (this.#gestures) return;
    const recenter = (p: { x: number; y: number }) => {
      this.#onRecenter?.(this.#canvasToWorld(p.x, p.y));
    };
    this.#gestures = new PointerGestures(this.#canvas, {
      onTap: recenter,
      onDragStart: recenter,
      onDragMove: recenter,
      onPinch: (s) => this.#setScaler(this.#scaler * s),
    });
    this.#gestures.enable();
  }

  /** Disables touch input. */
  disableInput(): void {
    this.#gestures?.disable();
    this.#gestures = null;
  }

  /**
   * Follows the main viewport's zoom proportionally (one-way sync — never
   * writes back to the main viewport). Call every frame with the main
   * viewport's current `zoom`; the first call just records the baseline.
   */
  #syncToMainZoom(mainZoom: number): void {
    if (this.#lastMainZoom !== null && mainZoom !== this.#lastMainZoom) {
      this.#setScaler(this.#scaler * (this.#lastMainZoom / mainZoom));
    }
    this.#lastMainZoom = mainZoom;
  }

  draw(options: MiniMapDrawOptions): void {
    const {
      viewPoint,
      cars,
      roadColor = 'white',
      carColor = 'blue',
      backgroundColor,
      mainViewportZoom,
      compactScaleIndicator = true,
      showScaleIndicator = true,
    } = options;

    if (mainViewportZoom !== undefined) {
      this.#syncToMainZoom(mainViewportZoom);
    }

    this.#lastViewPoint = viewPoint;

    // When a backgroundColor is given, paint it onto the canvas itself rather
    // than leaving the pixels transparent and relying on the CSS background.
    // The floating mini-map is a `position: fixed` canvas, and Chrome keeps a
    // stale (black) CSS background painted on its compositing layer after the
    // class toggles. Filling the bitmap (which repaints every frame) sidesteps
    // that bug entirely.
    if (backgroundColor) {
      this.#ctx.fillStyle = backgroundColor;
      this.#ctx.fillRect(0, 0, this.#size, this.#size);
    } else {
      this.#ctx.clearRect(0, 0, this.#size, this.#size);
    }

    const scaledViewPoint: Point = scale(viewPoint, -this.#scaler);

    this.#ctx.save();
    this.#ctx.translate(
      scaledViewPoint.x + this.#size / 2,
      scaledViewPoint.y + this.#size / 2,
    );
    this.#ctx.scale(this.#scaler, this.#scaler);

    for (const segment of this.#graph.segments) {
      drawSegment(this.#ctx, segment, {
        width: 3 / this.#scaler,
        color: roadColor,
        cap: 'round',
      });
    }

    for (const car of cars) {
      this.#ctx.beginPath();
      this.#ctx.fillStyle = car.damaged ? 'gray' : car.color || 'red';
      this.#ctx.strokeStyle = 'white';
      this.#ctx.lineWidth = (car.damaged ? 1 : 2) / this.#scaler;
      this.#ctx.arc(
        car.x,
        car.y,
        (car.damaged ? 2 : 3) / this.#scaler,
        0,
        Math.PI * 2,
      );
      this.#ctx.fill();
      this.#ctx.stroke();

      // new Point(car.x, car.y).draw(this.#ctx, {
      //   color: car.damaged ? 'gray' : 'red',
      //   size: 5 / this.#scaler,
      // });
    }

    this.#ctx.restore();

    drawPoint(this.#ctx, new Point(this.#size / 2, this.#size / 2), {
      size: 12,
      color: carColor,
      outline: true,
    });

    if (showScaleIndicator) {
      if (!this.#scaleIndicator) {
        // Adapter over the mini-map's own scaler — always live, so it needs
        // no external Viewport instance and no stale multiplier options.
        this.#scaleIndicator = new ScaleIndicator(
          this.#size,
          this.#size,
          {
            getZoom: () => this.#scaler,
            getPixelsPerMeter: () => WORLD_PIXELS_PER_METER * this.#scaler,
          },
          {
            paddingX: compactScaleIndicator ? 6 : 20,
            paddingY: compactScaleIndicator ? 6 : 20,
            fontSize: compactScaleIndicator ? 9 : 12,
            lineWidth: compactScaleIndicator ? 1 : 2,
            scaleInMeters: 100,
            inlineStats: compactScaleIndicator,
            statSeparator: ' • ',
          },
        );
      }
      this.#scaleIndicator.draw(
        this.#ctx,
        this.#canvas.width,
        this.#canvas.height,
      );
    }
  }
}

/**
 * Wires scroll-wheel zoom on a mini-map canvas. Only ever changes the
 * mini-map's own scale — the main viewport is synced the other way, via
 * {@link MiniMap#draw}'s `mainViewportZoom` option, never from the mini-map.
 * `getMiniMap` is called lazily so this keeps working across mini-map
 * instances recreated on world/mode reload.
 */
export function wireMiniMapWheelZoom(
  canvas: HTMLCanvasElement,
  getMiniMap: () => MiniMap | null,
): void {
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.deltaY < 0) getMiniMap()?.zoomIn();
      else if (e.deltaY > 0) getMiniMap()?.zoomOut();
    },
    { passive: false },
  );
}
