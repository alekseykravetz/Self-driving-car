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
import { PointerGestures } from '../../input/pointerGestures.js';
import { createEditorGestures } from './editorPointerInput.js';

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
  #gestures: PointerGestures;

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

    this.#gestures = createEditorGestures(this.#canvas, {
      hover: (e) => this.#handleMouseMove(e),
      primary: (e) => this.#handleMouseDown(e),
      secondary: (e) => this.#handleMouseDown(e),
    });
  }

  bindKeyboard(km: KeyboardManager): void {
    this.#keyboardManager = km;
  }

  enable(): void {
    this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
    this.#gestures.enable();
    this.#keyboardManager?.pushBindings(this.#bindings);
  }

  disable(): void {
    this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
    this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
    this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
    this.#gestures.disable();
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
    const ctx = this.#ctx;
    ctx.save();
    // The world editor draws all editors under a reduced globalAlpha (0.2 in
    // non-graph modes) so marking-placement PREVIEWS look translucent. The
    // inspect tool shows an actual selection, not a preview, so force full
    // opacity here.
    ctx.globalAlpha = 1;
    if (this.#hoveredSegment) {
      drawSegment(ctx, this.#hoveredSegment, {
        color: 'yellow',
        width: 4,
      });
    }
    if (this.#selectedSegment) {
      const seg = this.#selectedSegment;
      // Soft, low-opacity halo so the selection reads without washing the
      // segment out.
      drawSegment(ctx, seg, {
        color: 'rgba(255, 210, 0, 0.18)',
        width: 16,
        cap: 'round',
      });
      // Dark casing gives the bright core contrast on BOTH the green grass and
      // the light-gray road surface.
      drawSegment(ctx, seg, {
        color: 'rgba(40, 30, 0, 0.9)',
        width: 8,
        cap: 'round',
      });
      // Bright core line.
      drawSegment(ctx, seg, {
        color: '#ffdd00',
        width: 4,
        cap: 'round',
      });
      // Endpoint markers to emphasise the exact segment extents.
      ctx.fillStyle = '#ffdd00';
      ctx.strokeStyle = 'rgba(40, 30, 0, 0.9)';
      ctx.lineWidth = 2;
      for (const p of [seg.p1, seg.p2]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
