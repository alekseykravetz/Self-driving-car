import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Viewport } from '../../../ts/viewport/viewport.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { WORLD_PIXELS_PER_METER } from '../../../ts/math/worldUnits.js';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';

/**
 * The `Viewport` constructor wires `wheel`/`mousedown`/`mousemove` on the canvas
 * and `mouseup` on `window`. We stand in a fake canvas that *captures* those
 * handlers so the tests can drive the real (private) drag/zoom logic through the
 * genuine event surface — exercising `#handleMouseWheel`, `#handleMouseDown`,
 * `#handleMouseMove`, `#handleMouseUp`, `#resetDrag` and `#clampZoom` end-to-end.
 */
type Handler = (e: unknown) => void;

interface Harness {
  viewport: Viewport;
  fire: (type: string, event: unknown) => void;
  width: number;
  height: number;
}

const originalWindow = (globalThis as { window?: unknown }).window;

function makeViewport(zoom = 1, offset: Point | null = null): Harness {
  const width = 800;
  const height = 600;
  const listeners: Record<string, Handler[]> = {};
  const record = (type: string, handler: Handler) => {
    (listeners[type] ??= []).push(handler);
  };

  const ctx = mockCanvas2D().ctx;
  const canvas = {
    width,
    height,
    getContext: () => ctx,
    addEventListener: (type: string, handler: Handler) => record(type, handler),
  } as unknown as HTMLCanvasElement;

  // `window` is undefined in the node test env — shim just enough for the ctor.
  (globalThis as { window?: unknown }).window = {
    addEventListener: (type: string, handler: Handler) => record(type, handler),
  };

  const viewport = new Viewport(canvas, zoom, offset);

  const fire = (type: string, event: unknown) => {
    for (const h of listeners[type] ?? []) h(event);
  };

  return { viewport, fire, width, height };
}

afterEach(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

describe('Viewport wheel zoom (mouse mode)', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeViewport(1);
  });

  it('scrolling down zooms out by the fast step', () => {
    h.fire('wheel', { deltaY: 100, preventDefault() {} });
    expect(h.viewport.getZoom()).toBeCloseTo(1.3, 6);
  });

  it('scrolling up zooms in by the fast step', () => {
    h = makeViewport(2);
    h.fire('wheel', { deltaY: -100, preventDefault() {} });
    expect(h.viewport.getZoom()).toBeCloseTo(1.7, 6);
  });

  it('Shift held uses the slow, fine-grained step', () => {
    h.fire('wheel', { deltaY: 100, shiftKey: true, preventDefault() {} });
    expect(h.viewport.getZoom()).toBeCloseTo(1.1, 6);
  });

  it('clamps zoom at the minimum (0.8)', () => {
    h = makeViewport(0.9);
    h.fire('wheel', { deltaY: -100, preventDefault() {} }); // would be 0.6
    expect(h.viewport.getZoom()).toBe(0.8);
  });

  it('clamps zoom at the maximum (30)', () => {
    h = makeViewport(29.9);
    h.fire('wheel', { deltaY: 100, preventDefault() {} }); // would be 30.2
    expect(h.viewport.getZoom()).toBe(30);
  });
});

describe('Viewport wheel in touchpad mode', () => {
  it('plain two-finger scroll pans by -delta * zoom', () => {
    const h = makeViewport(2, new Point(0, 0));
    h.viewport.setMode('touchpad');
    h.fire('wheel', { deltaX: 10, deltaY: -5, preventDefault() {} });
    // offset += (-deltaX*zoom, -deltaY*zoom) = (-20, +10)
    expect(h.viewport.offset.x).toBe(-20);
    expect(h.viewport.offset.y).toBe(10);
  });

  it('Ctrl+scroll still zooms even in touchpad mode', () => {
    const h = makeViewport(1);
    h.viewport.setMode('touchpad');
    h.fire('wheel', { deltaY: 100, ctrlKey: true, preventDefault() {} });
    expect(h.viewport.getZoom()).toBeCloseTo(1.3, 6);
  });
});

describe('Viewport middle-button drag panning', () => {
  it('accumulates a drag offset during move and commits it on mouseup', () => {
    const h = makeViewport(1); // offset defaults to -center = (-400, -300)
    const before = h.viewport.getOffset();

    h.fire('mousedown', { button: 1, offsetX: 100, offsetY: 100 });
    h.fire('mousemove', { button: 1, offsetX: 150, offsetY: 120 });

    // Mid-drag: getOffset reflects the temporary drag offset (+50, +20).
    const during = h.viewport.getOffset();
    expect(during.x).toBe(before.x + 50);
    expect(during.y).toBe(before.y + 20);
    // The committed offset hasn't changed yet.
    expect(h.viewport.offset.x).toBe(before.x);

    h.fire('mouseup', { button: 1 });

    // After release the drag offset is folded into the permanent offset...
    expect(h.viewport.offset.x).toBe(before.x + 50);
    expect(h.viewport.offset.y).toBe(before.y + 20);
    // ...and the transient drag offset is reset (getOffset == committed offset).
    expect(h.viewport.getOffset().x).toBe(h.viewport.offset.x);
  });

  it('ignores non-middle buttons', () => {
    const h = makeViewport(1);
    const before = h.viewport.getOffset();
    h.fire('mousedown', { button: 0, offsetX: 100, offsetY: 100 });
    h.fire('mousemove', { button: 0, offsetX: 300, offsetY: 300 });
    // No active drag → offset unchanged.
    expect(h.viewport.getOffset().x).toBe(before.x);
    expect(h.viewport.getOffset().y).toBe(before.y);
  });

  it('does not commit on a non-middle mouseup', () => {
    const h = makeViewport(1);
    const before = h.viewport.offset.x;
    h.fire('mousedown', { button: 1, offsetX: 0, offsetY: 0 });
    h.fire('mousemove', { button: 1, offsetX: 40, offsetY: 0 });
    h.fire('mouseup', { button: 0 }); // wrong button → no commit
    expect(h.viewport.offset.x).toBe(before);
    // Drag is still active, so the transient offset persists.
    expect(h.viewport.getOffset().x).toBe(before + 40);
  });
});

describe('Viewport transform + derived getters', () => {
  it('reset() applies clear + translate + scale to the context', () => {
    const width = 800;
    const height = 600;
    const listeners: Record<string, Handler[]> = {};
    const mock = mockCanvas2D();
    const canvas = {
      width,
      height,
      getContext: () => mock.ctx,
      addEventListener: (t: string, h: Handler) =>
        (listeners[t] ??= []).push(h),
    } as unknown as HTMLCanvasElement;
    (globalThis as { window?: unknown }).window = {
      addEventListener: () => {},
    };
    const viewport = new Viewport(canvas, 2, new Point(-10, -20));
    mock.reset();

    viewport.reset();

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('clearRect');
    expect(methods).toContain('save');
    expect(methods).toContain('restore');
    // Zoom is applied as 1/zoom on both axes.
    const scaleCall = mock.calls.find((c) => c.method === 'scale');
    expect(scaleCall?.args).toEqual([0.5, 0.5]);
  });

  it('getPixelsPerMeter scales inversely with zoom', () => {
    const h = makeViewport(2);
    expect(h.viewport.getPixelsPerMeter()).toBeCloseTo(
      WORLD_PIXELS_PER_METER / 2,
      6,
    );
  });

  it('getMouse honors subtractDragOffset during an active drag', () => {
    const h = makeViewport(1);
    h.fire('mousedown', { button: 1, offsetX: 0, offsetY: 0 });
    h.fire('mousemove', { button: 1, offsetX: 30, offsetY: 40 });
    const raw = h.viewport.getMouse(
      { offsetX: 100, offsetY: 100 } as MouseEvent,
      false,
    );
    const adjusted = h.viewport.getMouse(
      { offsetX: 100, offsetY: 100 } as MouseEvent,
      true,
    );
    // subtractDragOffset removes the active (30, 40) drag delta.
    expect(raw.x - adjusted.x).toBe(30);
    expect(raw.y - adjusted.y).toBe(40);
  });
});

describe('Viewport touch gestures', () => {
  const touch = (id: number, x: number, y: number) => ({
    pointerId: id,
    pointerType: 'touch',
    offsetX: x,
    offsetY: y,
    preventDefault: () => {},
  });

  it('pans with a single finger drag in one-finger mode', () => {
    const h = makeViewport(2);
    const before = h.viewport.offset.x;
    h.fire('pointerdown', touch(1, 100, 100));
    h.fire('pointermove', touch(1, 150, 100)); // +50px → drag begins
    h.fire('pointerup', touch(1, 150, 100));
    // Content follows the finger: offset shifts by +dxWorld = +50 * zoom.
    expect(h.viewport.offset.x - before).toBeCloseTo(50 * 2, 5);
  });

  it('ignores single-finger drag in two-finger-only mode', () => {
    const h = makeViewport(2);
    h.viewport.setTouchPanMode('two-finger-only');
    const before = h.viewport.offset.x;
    h.fire('pointerdown', touch(1, 100, 100));
    h.fire('pointermove', touch(1, 150, 100));
    h.fire('pointerup', touch(1, 150, 100));
    expect(h.viewport.offset.x).toBe(before);
  });

  it('pinch zooms and keeps the focal world point under the fingers', () => {
    const h = makeViewport(4);
    const focal = { offsetX: 200, offsetY: 150 } as MouseEvent;
    const worldBefore = h.viewport.getMouse(focal);
    h.fire('pointerdown', touch(1, 150, 150));
    h.fire('pointerdown', touch(2, 250, 150)); // dist=100, mid=(200,150)
    h.fire('pointermove', touch(2, 350, 150)); // dist=200 → scale 2 → zoom in
    // Zoom decreases (more zoomed in) by the pinch scale.
    expect(h.viewport.zoom).toBeCloseTo(2, 5);
    const worldAfter = h.viewport.getMouse(focal);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 4);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 4);
  });

  it('recenterOn places a world point at the screen center', () => {
    const h = makeViewport(2);
    h.viewport.recenterOn(new Point(300, -120));
    // At the canvas center getMouse returns -offset = the recentered point.
    const centered = h.viewport.getMouse({
      offsetX: h.width / 2,
      offsetY: h.height / 2,
    } as MouseEvent);
    expect(centered.x).toBeCloseTo(300, 5);
    expect(centered.y).toBeCloseTo(-120, 5);
  });
});
