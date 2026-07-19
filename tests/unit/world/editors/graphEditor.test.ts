import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Graph } from '../../../../ts/math/graph/graph.js';
import { Viewport } from '../../../../ts/viewport/viewport.js';
import { GraphEditor } from '../../../../ts/world/editors/graphEditor.js';
import { KeyboardManager } from '../../../../ts/panels/keyboardManager.js';

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
    measureText: vi.fn(() => ({
      width: 100,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
    })),
    save: vi.fn(),
    restore: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
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

describe('GraphEditor', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let viewport: Viewport;
  let graph: Graph;
  let editor: GraphEditor;

  beforeEach(() => {
    const mock = createMockCanvas();
    canvas = mock.canvas;
    ctx = mock.ctx;
    viewport = createMockViewport(canvas);
    graph = new Graph();
    editor = new GraphEditor(viewport, graph);
  });

  describe('constructor', () => {
    it('stores viewport and graph references', () => {
      expect(editor).toBeInstanceOf(GraphEditor);
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
        'mouseup',
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
        'mouseup',
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

    it('disable() does not crash when no keyboard manager is bound', () => {
      editor.enable();
      expect(() => editor.disable()).not.toThrow();
    });

    it('disable() may be called without prior enable()', () => {
      expect(() => editor.disable()).not.toThrow();
    });
  });

  describe('keyboard bindings', () => {
    it('registers expected momentary and toggle shortcuts', () => {
      const km = createMockKeyboardManager();
      editor.bindKeyboard(km);
      editor.enable();
      const bindings = km.pushBindings.mock.calls[0][0];

      const ids = bindings.map((b: { id: string }) => b.id);
      expect(ids).toContain('keyS');
      expect(ids).toContain('keyE');
      expect(ids).toContain('keyC');
      expect(ids).toContain('keyO');
      expect(ids).toContain('keyH');

      const momentaries = bindings.filter(
        (b: { kind: string }) => b.kind === 'momentary',
      );
      const toggles = bindings.filter(
        (b: { kind: string }) => b.kind === 'toggle',
      );

      expect(momentaries.length).toBe(3);
      expect(toggles.length).toBe(2);

      const sBinding = bindings.find((b: { id: string }) => b.id === 'keyS');
      expect(sBinding.key).toBe('s');
      expect(sBinding.handler.onKeyDown).toBeTypeOf('function');

      const oBinding = bindings.find((b: { id: string }) => b.id === 'keyO');
      expect(oBinding.key).toBe('o');
      expect(oBinding.toggle.onActivate).toBeTypeOf('function');
      expect(oBinding.toggle.onDeactivate).toBeTypeOf('function');
    });
  });

  describe('dispose', () => {
    it('calls graph.dispose and resets internal state', () => {
      const graphDisposeSpy = vi.spyOn(graph, 'dispose');
      editor.dispose();
      expect(graphDisposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('display', () => {
    it('renders graph segments and points without error', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));

      expect(() => editor.display()).not.toThrow();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('renders with selected and hovered points', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addSegment(new Segment(p1, p2));

      expect(() => editor.display()).not.toThrow();
    });

    it('renders shortest path when set', () => {
      const p1 = new Point(0, 0);
      const p2 = new Point(100, 0);
      const p3 = new Point(200, 0);
      graph.addPoint(p1);
      graph.addPoint(p2);
      graph.addPoint(p3);
      graph.addSegment(new Segment(p1, p2));
      graph.addSegment(new Segment(p2, p3));

      editor.shortestPath = [new Segment(p1, p2)];
      expect(() => editor.display()).not.toThrow();
    });

    it('does not crash on empty graph', () => {
      expect(() => editor.display()).not.toThrow();
    });
  });
});
