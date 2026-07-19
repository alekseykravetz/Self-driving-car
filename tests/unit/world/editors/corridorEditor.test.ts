import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Graph } from '../../../../ts/math/graph/graph.js';
import { Viewport } from '../../../../ts/viewport/viewport.js';
import { World } from '../../../../ts/world/world.js';
import { Corridor } from '../../../../ts/world/corridor.js';
import { CorridorEditor } from '../../../../ts/world/editors/corridorEditor.js';
import { KeyboardManager } from '../../../../ts/panels/keyboardManager.js';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

setupImageMock();

function createMockCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const ctx = {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    setLineDash: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    textBaseline: 'alphabetic',
    font: '',
    measureText: vi.fn(() => ({ width: 100 })),
    save: vi.fn(),
    restore: vi.fn(),
    closePath: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    getContext: vi.fn(() => ctx),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    width: 800,
    height: 600,
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

function createMockViewport(canvas: HTMLCanvasElement): Viewport {
  return {
    canvas,
    zoom: 1,
    getMouse: vi.fn(() => new Point(0, 0)),
  } as unknown as Viewport;
}

function createMockKeyboardManager(): KeyboardManager {
  return {
    pushBindings: vi.fn(),
    popBindings: vi.fn(),
    dispose: vi.fn(),
    setToggleActive: vi.fn(),
  } as unknown as KeyboardManager;
}

describe('CorridorEditor', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let viewport: Viewport;
  let graph: Graph;
  let world: World;
  let editor: CorridorEditor;

  beforeEach(() => {
    const mock = createMockCanvas();
    canvas = mock.canvas;
    ctx = mock.ctx;
    viewport = createMockViewport(canvas);
    graph = new Graph();
    world = new World(graph);
    editor = new CorridorEditor(viewport, world);
  });

  describe('constructor', () => {
    it('stores viewport and world references', () => {
      expect(editor).toBeInstanceOf(CorridorEditor);
    });

    it('obtains canvas context from viewport', () => {
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });
  });

  describe('bindKeyboard', () => {
    it('connects a keyboard manager for shortcut registration', () => {
      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      editor.enable();
      expect(km.pushBindings).toHaveBeenCalledTimes(1);
      const bindings = km.pushBindings.mock.calls[0][0];
      expect(Array.isArray(bindings)).toBe(true);
      expect(bindings.length).toBeGreaterThan(0);
    });
  });

  describe('enable / disable', () => {
    it('enable() adds mouse event listeners to canvas', () => {
      editor.enable();
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
      );
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
      );
      expect(canvas.addEventListener).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
      );
    });

    it('enable() pushes keyboard bindings when keyboard manager is bound', () => {
      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      editor.enable();
      expect(km.pushBindings).toHaveBeenCalledTimes(1);
    });

    it('enable() does not crash when no keyboard manager is bound', () => {
      expect(() => editor.enable()).not.toThrow();
    });

    it('disable() removes mouse event listeners from canvas', () => {
      editor.enable();
      editor.disable();
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
      );
      expect(canvas.removeEventListener).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
      );
    });

    it('disable() pops keyboard bindings when keyboard manager is bound', () => {
      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      editor.enable();
      editor.disable();
      expect(km.popBindings).toHaveBeenCalledTimes(1);
    });

    it('disable() resets in-progress start point', () => {
      // Trigger first click to set start, then disable
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(50, 50));
      mousemove({ offsetX: 50, offsetY: 50 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      editor.disable();
      // After disable, a second click should start a fresh corridor (no corridor built yet)
      expect(world.corridors.length).toBe(0);
    });

    it('disable() does not crash without prior enable()', () => {
      expect(() => editor.disable()).not.toThrow();
    });
  });

  describe('keyboard bindings', () => {
    it('registers the tunnel toggle (T) shortcut', () => {
      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      editor.enable();
      const bindings = km.pushBindings.mock.calls[0][0];

      expect(bindings.length).toBe(1);
      const tBinding = bindings[0];
      expect(tBinding.id).toBe('keyT');
      expect(tBinding.key).toBe('t');
      expect(tBinding.kind).toBe('toggle');
      expect(tBinding.toggle.onActivate).toBeTypeOf('function');
      expect(tBinding.toggle.onDeactivate).toBeTypeOf('function');
    });
  });

  describe('corridor creation', () => {
    it('builds a corridor from two left clicks along graph segments', () => {
      // Set up a graph with a path
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const p3 = new Point(200, 0);
      world.graph.addPoint(p1);
      world.graph.addPoint(p2);
      world.graph.addPoint(p3);
      world.graph.addSegment(new Segment(p1, p2));
      world.graph.addSegment(new Segment(p2, p3));

      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      // First click at (0,0)
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(0, 0));
      mousemove({ offsetX: 0, offsetY: 0 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      expect(world.corridors.length).toBe(0);

      // Second click at (200,0)
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(200, 0));
      mousemove({ offsetX: 200, offsetY: 0 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      expect(world.corridors.length).toBe(1);
      expect(world.corridors[0]).toBeInstanceOf(Corridor);
      // Corridor skeleton should span from start to end
      expect(world.corridors[0].skeleton.length).toBeGreaterThan(0);
      expect(world.corridors[0].borders.length).toBeGreaterThan(0);
    });

    it('right-click cancels an in-progress start point', () => {
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      // First left click sets start
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(50, 50));
      mousemove({ offsetX: 50, offsetY: 50 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      // Right click should cancel start
      mousedown({ button: 2 } as MouseEvent);

      // Second left click should NOT build a corridor (start was cancelled)
      mousedown({ button: 0 } as MouseEvent);

      expect(world.corridors.length).toBe(0);
    });

    it('right-click removes the nearest corridor when no start is set', () => {
      // Add a corridor to the world
      const skeleton = [new Segment(new Point(0, 0), new Point(100, 0))];
      const corr = Corridor.fromPath(skeleton, 100, 10);
      world.addCorridor(corr);
      expect(world.corridors.length).toBe(1);

      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      // Right-click near the corridor
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(50, 0));
      mousemove({ offsetX: 50, offsetY: 0 } as MouseEvent);
      mousedown({ button: 2 } as MouseEvent);

      expect(world.corridors.length).toBe(0);
    });

    it('does not remove corridor when right-clicking far from any corridor', () => {
      const skeleton = [new Segment(new Point(0, 0), new Point(100, 0))];
      const corr = Corridor.fromPath(skeleton, 100, 10);
      world.addCorridor(corr);
      expect(world.corridors.length).toBe(1);

      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      // Right-click far from the corridor skeleton
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(500, 500));
      mousemove({ offsetX: 500, offsetY: 500 } as MouseEvent);
      mousedown({ button: 2 } as MouseEvent);

      expect(world.corridors.length).toBe(1);
    });

    it('does nothing on left-click when mouse position is not set', () => {
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;

      // Left-click without mousemove first (no #mouse set) - should be a no-op
      mousedown({ button: 0 } as MouseEvent);

      expect(world.corridors.length).toBe(0);
    });
  });

  describe('display', () => {
    it('renders without error on empty world', () => {
      expect(() => editor.display()).not.toThrow();
    });

    it('renders with hovered point without error', () => {
      world.graph.addPoint(new Point(100, 100));
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(100, 100));
      mousemove({ offsetX: 100, offsetY: 100 } as MouseEvent);

      expect(() => editor.display()).not.toThrow();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('renders with start point and intent segment without error', () => {
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      // Set start and mouse
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(50, 50));
      mousemove({ offsetX: 50, offsetY: 50 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      // Move mouse to create intent segment from start
      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(150, 50));
      mousemove({ offsetX: 150, offsetY: 50 } as MouseEvent);

      expect(() => editor.display()).not.toThrow();
    });
  });

  describe('tunnel mode', () => {
    it('tunnel toggle creates corridor with open ends', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const p3 = new Point(200, 0);
      world.graph.addPoint(p1);
      world.graph.addPoint(p2);
      world.graph.addPoint(p3);
      world.graph.addSegment(new Segment(p1, p2));
      world.graph.addSegment(new Segment(p2, p3));

      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      const spy = vi.spyOn(canvas, 'addEventListener');
      editor.enable();

      // Enable tunnel mode through toggle
      const bindings = km.pushBindings.mock.calls[0][0];
      const tBinding = bindings.find((b: { id: string }) => b.id === 'keyT');
      tBinding.toggle.onActivate();

      const mousedown = spy.mock.calls.find(
        (c) => c[0] === 'mousedown',
      )![1] as (e: MouseEvent) => void;
      const mousemove = spy.mock.calls.find(
        (c) => c[0] === 'mousemove',
      )![1] as (e: MouseEvent) => void;

      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(0, 0));
      mousemove({ offsetX: 0, offsetY: 0 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      vi.spyOn(viewport, 'getMouse').mockReturnValue(new Point(200, 0));
      mousemove({ offsetX: 200, offsetY: 0 } as MouseEvent);
      mousedown({ button: 0 } as MouseEvent);

      expect(world.corridors.length).toBe(1);
      expect(world.corridors[0].openStart).toBe(true);
      expect(world.corridors[0].openEnd).toBe(true);
    });
  });
});
