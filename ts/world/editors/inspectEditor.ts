import { Viewport } from '../../viewport/viewport.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { getNearestSegment } from '../../math/utils.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
import type { World } from '../world.js';
import type {
  KeyboardManager,
  ShortcutBinding,
} from '../../input/keyboardManager.js';

export class InspectEditor {
  #viewport: Viewport;
  #world: World;
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;

  #mouse: Point | null = null;
  #selectedSegment: Segment | null = null;
  #hoveredSegment: Segment | null = null;
  #onSegmentSelected: ((segment: Segment | null) => void) | null = null;
  #keyboardManager: KeyboardManager | null = null;

  #boundMouseDown: (event: MouseEvent) => void;
  #boundMouseMove: (event: MouseEvent) => void;
  #boundContextMenu: (event: MouseEvent) => void;

  #bindings: ShortcutBinding[] = [
    {
      id: 'keyInspectEscape',
      key: 'escape',
      label: 'Esc',
      title: 'Escape — Deselect current segment',
      group: 'Inspect',
      kind: 'momentary',
      handler: {
        onKeyDown: () => {
          this.#deselectSegment();
        },
      },
    },
  ];

  constructor(viewport: Viewport, world: World) {
    this.#viewport = viewport;
    this.#world = world;
    this.#canvas = viewport.canvas;
    this.#ctx = this.#canvas.getContext('2d')!;

    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundContextMenu = (e: MouseEvent) => e.preventDefault();
  }

  bindKeyboard(km: KeyboardManager): void {
    this.#keyboardManager = km;
  }

  enable(): void {
    this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
    this.#keyboardManager?.pushBindings(this.#bindings);
  }

  disable(): void {
    this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
    this.#keyboardManager?.popBindings();
    this.#deselectSegment();
    this.#hoveredSegment = null;
    this.#mouse = null;
  }

  setOnSegmentSelected(cb: (segment: Segment | null) => void): void {
    this.#onSegmentSelected = cb;
  }

  getSelectedSegment(): Segment | null {
    return this.#selectedSegment;
  }

  #deselectSegment(): void {
    this.#selectedSegment = null;
    this.#onSegmentSelected?.(null);
  }

  #handleMouseMove(e: MouseEvent): void {
    this.#mouse = this.#viewport.getMouse(e, true);
    const threshold = 10 * this.#viewport.zoom;
    this.#hoveredSegment = getNearestSegment(
      this.#mouse,
      this.#world.graph.segments,
      threshold,
    );
  }

  #handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      e.preventDefault();
      if (this.#selectedSegment) {
        this.#deselectSegment();
      }
      return;
    }

    if (e.button === 0 && this.#mouse) {
      if (this.#hoveredSegment) {
        this.#selectedSegment = this.#hoveredSegment;
        this.#onSegmentSelected?.(this.#selectedSegment);
      } else {
        this.#deselectSegment();
      }
    }
  }

  display(): void {
    if (this.#hoveredSegment) {
      drawSegment(this.#ctx, this.#hoveredSegment, {
        color: 'yellow',
        width: 4,
      });
    }
    if (this.#selectedSegment) {
      const seg = this.#selectedSegment;
      const ctx = this.#ctx;
      ctx.save();
      // Outer glow: a wide, translucent amber halo so the selection stands out
      // against the road fill regardless of the underlying colour.
      drawSegment(ctx, seg, {
        color: 'rgba(255, 200, 0, 0.35)',
        width: 18,
        cap: 'round',
      });
      // Bright core line.
      drawSegment(ctx, seg, {
        color: '#ffd400',
        width: 6,
        cap: 'round',
      });
      // Endpoint markers to emphasise the exact segment extents.
      ctx.fillStyle = '#ffd400';
      ctx.strokeStyle = '#663c00';
      ctx.lineWidth = 2;
      for (const p of [seg.p1, seg.p2]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
