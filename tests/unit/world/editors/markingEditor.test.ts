import { describe, it, expect, vi } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { MarkingEditor } from '../../../../ts/world/editors/markingEditor.js';
import { Marking } from '../../../../ts/world/markings/marking.js';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

setupImageMock();

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };
}

function createMockCanvas() {
  return {
    getContext: vi.fn(() => createMockCtx()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMockViewport() {
  return {
    canvas: createMockCanvas(),
    getMouse: vi.fn(() => new Point(0, 0)),
    zoom: 1,
  };
}

function createMockWorld() {
  return {
    graph: { segments: [] },
    roadWidth: 100,
    laneGuides: [],
    markings: [],
  };
}

describe('MarkingEditor', () => {
  it('constructor creates instance with viewport, world, targetSegments', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    expect(editor).toBeInstanceOf(MarkingEditor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).viewport).toBe(viewport);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).world).toBe(world);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).targetSegments).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).canvas).toBe(viewport.canvas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).ctx).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).markings).toBe(world.markings);
  });

  it('constructor defaults targetSegments to world.graph.segments', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).targetSegments).toBe(world.graph.segments);
  });

  it('createMarking creates a base Marking with correct properties', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    const center = new Point(100, 100);
    const dir = new Point(1, 0);
    const marking = editor.createMarking(center, dir);

    expect(marking).toBeInstanceOf(Marking);
    expect(marking.type).toBe('marking');
    expect(marking.center.x).toBe(100);
    expect(marking.center.y).toBe(100);
    expect(marking.width).toBe(world.roadWidth);
    expect(marking.height).toBe(world.roadWidth);
  });

  it('enable() adds mousedown, mousemove, and contextmenu listeners', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    editor.enable();

    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );
    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'contextmenu',
      expect.any(Function),
    );
  });

  it('disable() removes mousedown, mousemove, and contextmenu listeners', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    editor.enable();
    editor.disable();

    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );
    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'contextmenu',
      expect.any(Function),
    );
  });

  it('disable() clears intent', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).intent = new Marking(
      new Point(0, 0),
      new Point(1, 0),
      10,
      10,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).intent).not.toBeNull();

    editor.disable();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).intent).toBeNull();
  });

  it('display() does not throw when intent is null', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    expect(() => editor.display()).not.toThrow();
  });

  it('display() does not throw when intent is set', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new MarkingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
      [],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).intent = new Marking(
      new Point(0, 0),
      new Point(1, 0),
      10,
      10,
    );

    expect(() => editor.display()).not.toThrow();
  });
});
