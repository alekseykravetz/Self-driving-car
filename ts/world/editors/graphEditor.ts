import { Viewport } from '../../viewport/viewport.js';
import { Graph } from '../../math/graph/graph.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { formatMetersFromWorldPixels } from '../../math/worldUnits.js';
import { ROAD_TYPE_LABELS } from '../../math/roadTypes.js';
import type { BrushState } from '../../ui/organisms/worldEditorPanel.js';
import {
  getNearestPoint,
  subtract,
  normalize,
  perpendicular,
  scale,
  add,
  formatDegrees,
} from '../../math/utils.js';
import { drawPoint } from '../../rendering/pointRenderer.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
import {
  KeyboardManager,
  ShortcutBinding,
} from '../../input/keyboardManager.js';
import { PointerGestures } from '../../input/pointerGestures.js';
import {
  createEditorGestures,
  isTouchSynthEvent,
} from './editorPointerInput.js';

/** Hover hit-test radius (screen px) for precise mouse input. */
const POINT_HIT_RADIUS_PX = 10;
/** Larger hit-test radius (screen px) for imprecise finger taps. */
const TOUCH_POINT_HIT_RADIUS_PX = 24;

export class GraphEditor {
  #viewport: Viewport;
  #canvas: HTMLCanvasElement;
  #graph: Graph;
  #ctx: CanvasRenderingContext2D;

  #selected: Point | null = null;
  #hovered: Point | null = null;
  #dragging: boolean = false;
  #mouse: Point | null = null; // Current mouse position (relative to viewport/canvas)
  #isOneWay: boolean = false;
  #isSeparated: boolean = false;
  #brushState: BrushState | null = null;
  #onToggleChange: ((key: string, active: boolean) => void) | null = null;
  #keyboardManager: KeyboardManager | null = null;

  // Temporary points for finding shortest path operation
  #startPoint: Point | null = null;
  #endPoint: Point | null = null;
  public shortestPath?: Segment[] | null = null;

  #boundMouseDown: (event: MouseEvent) => void;
  #boundMouseMove: (event: MouseEvent) => void;
  #boundMouseUp: () => void;
  #boundContextMenu: (event: MouseEvent) => void;
  #gestures: PointerGestures;

  #bindings: ShortcutBinding[];

  constructor(viewport: Viewport, graph: Graph) {
    this.#viewport = viewport;
    this.#canvas = viewport.canvas;
    this.#graph = graph;

    this.#ctx = this.#canvas.getContext('2d')!;

    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = () => {
      this.#dragging = false;
    };
    this.#boundContextMenu = (e: MouseEvent) => e.preventDefault();

    this.#gestures = createEditorGestures(this.#canvas, {
      hover: (e) => this.#handleMouseMove(e),
      primary: (e) => this.#handleMouseDown(e),
      secondary: (e) => this.#handleMouseDown(e),
      drag: (e) => this.#handleMouseMove(e),
      dragEnd: () => {
        this.#dragging = false;
      },
    });

    this.#bindings = this.#buildBindings();
  }

  #addEventListeners(): void {
    this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.addEventListener('mouseup', this.#boundMouseUp);
    this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
    this.#gestures.enable();
  }

  #removeEventListeners(): void {
    this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.removeEventListener('mouseup', this.#boundMouseUp);
    this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
    this.#gestures.disable();
  }

  public enable(): void {
    this.#addEventListeners();
    this.#keyboardManager?.pushBindings(this.#bindings);
  }

  /**
   * Connect the {@link KeyboardManager} so this editor's shortcuts are
   * registered while the editor is enabled.
   */
  public bindKeyboard(km: KeyboardManager): void {
    this.#keyboardManager = km;
  }

  setBrushState(state: BrushState): void {
    this.#brushState = state;
  }

  setOneWay(value: boolean): void {
    this.#isOneWay = value;
  }

  setSeparated(value: boolean): void {
    this.#isSeparated = value;
  }

  setOnToggleChange(cb: (key: string, active: boolean) => void): void {
    this.#onToggleChange = cb;
  }

  public disable(): void {
    this.#removeEventListeners();
    this.#keyboardManager?.popBindings();
    this.#selected = null;
    this.#hovered = null;
    this.#dragging = false;
    this.#startPoint = null;
    this.#endPoint = null;
  }

  #buildBindings(): ShortcutBinding[] {
    return [
      {
        id: 'keyS',
        key: 's',
        label: 'S',
        title: 'S — Set path start point (hover a point)',
        group: 'Graph',
        kind: 'momentary',
        handler: {
          onKeyDown: () => {
            if (this.#mouse) this.#startPoint = this.#mouse;
            this.#computeShortestPath();
          },
        },
      },
      {
        id: 'keyE',
        key: 'e',
        label: 'E',
        title: 'E — Set path end point (hover a point)',
        group: 'Graph',
        kind: 'momentary',
        handler: {
          onKeyDown: () => {
            if (this.#mouse) this.#endPoint = this.#mouse;
            this.#computeShortestPath();
          },
        },
      },
      {
        id: 'keyC',
        key: 'c',
        label: 'C',
        title: 'C — Clear computed path and start/end points',
        group: 'Graph',
        kind: 'momentary',
        handler: {
          onKeyDown: () => {
            this.#startPoint = null;
            this.#endPoint = null;
            this.shortestPath = null;
          },
        },
      },
      {
        id: 'keyO',
        key: 'o',
        label: 'O',
        title:
          'O — One-way road mode. Hold while creating a segment, or click to latch it on permanently.',
        group: 'Graph',
        kind: 'toggle',
        hidden: true,
        toggle: {
          onActivate: () => {
            this.#isOneWay = true;
            this.#onToggleChange?.('O', true);
          },
          onDeactivate: () => {
            this.#isOneWay = false;
            this.#onToggleChange?.('O', false);
          },
        },
      },
      {
        id: 'keyH',
        key: 'h',
        label: 'H',
        title:
          'H — Hard-separation road mode (solid centre line). Hold while creating a segment, or click to latch it on permanently.',
        group: 'Graph',
        kind: 'toggle',
        hidden: true,
        toggle: {
          onActivate: () => {
            this.#isSeparated = true;
            this.#onToggleChange?.('H', true);
          },
          onDeactivate: () => {
            this.#isSeparated = false;
            this.#onToggleChange?.('H', false);
          },
        },
      },
    ];
  }

  #computeShortestPath(): void {
    if (this.#startPoint && this.#endPoint) {
      this.shortestPath = this.#graph.getShortestPath(
        this.#startPoint,
        this.#endPoint,
      );
    }
  }

  // Handles mouse movement over the canvas. Updates hovered state and drags selected points.
  #handleMouseMove(e: MouseEvent): void {
    this.#mouse = this.#viewport.getMouse(e, true);
    // Finger taps are far less precise than a mouse cursor, so give touch a
    // larger hit-radius — this lets tapping/long-pressing an existing point
    // select/delete it instead of dropping a new point beside it.
    const hitRadiusPx = isTouchSynthEvent(e)
      ? TOUCH_POINT_HIT_RADIUS_PX
      : POINT_HIT_RADIUS_PX;
    this.#hovered = getNearestPoint(
      this.#mouse,
      this.#graph.points,
      hitRadiusPx * this.#viewport.zoom, // Dynamic threshold based on zoom
    );

    if (this.#dragging && this.#selected) {
      // Update the position of the selected point to the current mouse position
      this.#selected.x = this.#mouse.x;
      this.#selected.y = this.#mouse.y;
    }
  }

  // Handles mouse button presses on the canvas. Manages point selection, creation, and removal.
  #handleMouseDown(e: MouseEvent): void {
    // Right-click (button === 2)
    if (e.button === 2) {
      if (this.#selected) {
        // If a point is selected, deselect it on right-click
        this.#selected = null;
      } else if (this.#hovered) {
        // If hovering over a point and nothing is selected, remove the hovered point
        this.#removePoint(this.#hovered);
      }
    }

    // Left-click (button === 0)
    if (e.button === 0) {
      if (this.#mouse) {
        if (this.#hovered) {
          // If clicking on an existing point (hovered)
          this.#selectPoint(this.#hovered); // Select it (and try to add segment if another was selected)
          this.#dragging = true; // Start dragging the selected point
          return; // Prevent adding a new point
        }
        // If clicking on empty space, add a new point at the mouse position
        this.#graph.addPoint(this.#mouse);
        // Select the newly added point
        this.#selectPoint(this.#mouse);
        // The new point is now also the hovered point
        this.#hovered = this.#mouse;
      }
    }
  }

  /**
   * Selects a point. If another point was previously selected, attempts to add a segment between them.
   * @param point - The point to select.
   */
  #selectPoint(point: Point): void {
    if (this.#selected && this.#selected !== point) {
      const metadata = this.#brushState
        ? {
            highwayType: this.#brushState.highwayType,
            name: this.#brushState.name || undefined,
            nameEn: this.#brushState.nameEn || undefined,
            nameHe: this.#brushState.nameHe || undefined,
            nameAr: this.#brushState.nameAr || undefined,
            nameRu: this.#brushState.nameRu || undefined,
            lanes: this.#brushState.lanes,
            maxSpeed: this.#brushState.maxSpeed,
            ref: this.#brushState.ref || undefined,
            bridge: this.#brushState.bridge || undefined,
            laneMarkings: this.#brushState.laneMarkings ? undefined : false,
            parkingLeft: this.#brushState.parkingLeft || undefined,
            parkingRight: this.#brushState.parkingRight || undefined,
          }
        : undefined;
      this.#graph.tryAddSegment(
        new Segment(
          this.#selected,
          point,
          this.#isOneWay,
          this.#isSeparated,
          metadata,
        ),
      );
    }
    this.#selected = point;
  }

  #removePoint(point: Point): void {
    this.#graph.removePoint(point);
    this.#hovered = null;
    if (this.#selected === point) {
      this.#selected = null;
    }
  }

  public dispose(): void {
    this.#graph.dispose();
    this.#selected = null;
    this.#hovered = null;
    this.#dragging = false;
    this.#mouse = null;
    this.shortestPath = null;
    this.#startPoint = null;
    this.#endPoint = null;
  }

  // todo: change name to draw in all editors
  // Renders the graph and editor-specific visuals (hovered, selected points, intent line) onto the canvas.
  public display(): void {
    for (const seg of this.#graph.segments) {
      drawSegment(this.#ctx, seg);
    }
    for (const point of this.#graph.points) {
      drawPoint(this.#ctx, point);
    }

    if (this.#hovered) {
      drawPoint(this.#ctx, this.#hovered, { fill: true });
    }

    if (this.#selected) {
      const intent = this.#hovered ?? this.#mouse;
      const segment = new Segment(this.#selected, intent!);
      drawSegment(this.#ctx, segment, {
        dash: [3, 3],
      });
      this.#drawIntentMeasurements(segment);
      drawPoint(this.#ctx, this.#selected, { outline: true });
    }

    if (this.shortestPath) {
      this.shortestPath.forEach((seg) => {
        drawSegment(this.#ctx, seg, { color: 'red', width: 8 });
      });
    }
  }

  #drawIntentMeasurements(segment: Segment): void {
    const lengthPx = segment.length();
    if (lengthPx < 1) return;

    const dir = subtract(segment.p2, segment.p1);
    const angleFromStart = Math.atan2(dir.y, dir.x);
    let prefix = '';
    if (this.#brushState?.highwayType) {
      const label =
        ROAD_TYPE_LABELS[this.#brushState.highwayType] ??
        this.#brushState.highwayType;
      prefix = `${label} · ${this.#brushState.lanes} lanes · `;
    }
    const label = `${prefix}${formatMetersFromWorldPixels(lengthPx)}  ${formatDegrees(angleFromStart)}`;
    const paddingX = 8;
    const paddingY = 5;
    const gap = 12 * this.#viewport.zoom;
    const fontSize = 13 * this.#viewport.zoom;
    const normal = perpendicular(normalize(dir));
    const anchor = add(segment.p2, scale(normal, gap));

    this.#ctx.save();
    this.#ctx.font = `${fontSize}px Arial`;
    this.#ctx.textBaseline = 'middle';

    const width = this.#ctx.measureText(label).width + paddingX * 2;
    const height = fontSize + paddingY * 2;
    const x = anchor.x - width / 2;
    const y = anchor.y - height / 2;

    this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this.#ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    this.#ctx.lineWidth = 1 * this.#viewport.zoom;
    this.#ctx.beginPath();
    this.#ctx.roundRect(x, y, width, height, 4 * this.#viewport.zoom);
    this.#ctx.fill();
    this.#ctx.stroke();

    this.#ctx.fillStyle = '#111';
    this.#ctx.fillText(label, x + paddingX, anchor.y);
    this.#ctx.restore();
  }
}
