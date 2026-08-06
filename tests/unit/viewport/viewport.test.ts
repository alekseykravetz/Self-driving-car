import { describe, it, expect } from 'vitest';
import { Viewport } from '../../../ts/viewport/viewport.js';
import { Point } from '../../../ts/math/primitives/point.js';

/**
 * `getVisibleBounds()` is pure math over `this.canvas`, `this.zoom`, and
 * `this.getOffset()`, so we exercise it via `.call()` on a lightweight stand-in
 * to avoid constructing a real DOM-bound Viewport (which registers window/canvas
 * event listeners unavailable in the node test env).
 */
function callGetVisibleBounds(
  fake: {
    canvas: { width: number; height: number };
    zoom: number;
    offset: { x: number; y: number };
  },
  margin?: number,
) {
  const self = {
    canvas: fake.canvas,
    zoom: fake.zoom,
    getOffset: () => fake.offset,
  };
  return Viewport.prototype.getVisibleBounds.call(self as never, margin);
}

describe('Viewport.getVisibleBounds', () => {
  it('maps screen center to -offset and spans halfCanvas*zoom', () => {
    const bounds = callGetVisibleBounds({
      canvas: { width: 800, height: 600 },
      zoom: 2,
      offset: { x: -100, y: -50 },
    });
    // centerX = -offset.x = 100, halfW = 400 * 2 = 800
    expect(bounds.minX).toBe(-700);
    expect(bounds.maxX).toBe(900);
    // centerY = -offset.y = 50, halfH = 300 * 2 = 600
    expect(bounds.minY).toBe(-550);
    expect(bounds.maxY).toBe(650);
  });

  it('expands the rect by the given margin on every side', () => {
    const bounds = callGetVisibleBounds(
      {
        canvas: { width: 800, height: 600 },
        zoom: 1,
        offset: { x: 0, y: 0 },
      },
      100,
    );
    expect(bounds.minX).toBe(-500); // -400 - 100
    expect(bounds.maxX).toBe(500);
    expect(bounds.minY).toBe(-400); // -300 - 100
    expect(bounds.maxY).toBe(400);
  });

  it('shifts bounds with the viewport offset (panning)', () => {
    const bounds = callGetVisibleBounds({
      canvas: { width: 1000, height: 1000 },
      zoom: 1,
      offset: { x: -200, y: 300 },
    });
    // center = (200, -300); half = 500
    expect(bounds.minX).toBe(-300);
    expect(bounds.maxX).toBe(700);
    expect(bounds.minY).toBe(-800);
    expect(bounds.maxY).toBe(200);
  });
});

describe('Viewport.getZoom', () => {
  it('returns the current zoom level', () => {
    const self = { zoom: 3.5 };
    expect(Viewport.prototype.getZoom.call(self as never)).toBe(3.5);
  });
});

/**
 * `getMouse()` doesn't touch the private `#drag` field unless
 * `subtractDragOffset` is true, so the default-arg call path is safely
 * exercised on a fake `this` without constructing a real Viewport.
 */
describe('Viewport.getMouse', () => {
  it('converts a MouseEvent screen position to world coordinates', () => {
    const self = {
      center: new Point(400, 300),
      zoom: 2,
      offset: new Point(-50, 25),
    };
    const fakeEvent = { offsetX: 500, offsetY: 350 } as MouseEvent;
    const p = Viewport.prototype.getMouse.call(self as never, fakeEvent);
    // ((500 - 400) * 2) - (-50) = 200 + 50 = 250
    expect(p.x).toBe(250);
    // ((350 - 300) * 2) - 25 = 100 - 25 = 75
    expect(p.y).toBe(75);
  });
});

describe('Viewport.setMode', () => {
  it('sets the mode field', () => {
    const self: { mode: string } = { mode: 'mouse' };
    Viewport.prototype.setMode.call(self as never, 'touchpad');
    expect(self.mode).toBe('touchpad');
  });
});
