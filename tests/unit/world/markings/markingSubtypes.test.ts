import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Stop } from '../../../../ts/world/markings/stop.js';
import { Target } from '../../../../ts/world/markings/target.js';
import { Crossing } from '../../../../ts/world/markings/crossing.js';
import { Parking } from '../../../../ts/world/markings/parking.js';
import { Yield } from '../../../../ts/world/markings/yield.js';
import { setupImageMock } from '../../../helpers/setupImageMock.js';
import { mockCanvas2D } from '../../../helpers/mockCanvas2D.js';
setupImageMock();

import { Start } from '../../../../ts/world/markings/start.js';

function makeCenter(): Point {
  return new Point(100, 100);
}
function makeDirection(): Point {
  return new Point(1, 0);
}

describe('Stop', () => {
  it('constructor sets correct type', () => {
    const s = new Stop(makeCenter(), makeDirection(), 50, 30);
    expect(s.type).toBe('stop');
  });

  it('constructor creates valid polygon', () => {
    const s = new Stop(makeCenter(), makeDirection(), 50, 30);
    expect(s.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('border is polygon.segments[2]', () => {
    const s = new Stop(makeCenter(), makeDirection(), 50, 30);
    expect(s.border).toBe(s.polygon.segments[2]);
  });

  it('rebuildGeometry() works', () => {
    const s = new Stop(makeCenter(), makeDirection(), 50, 30);
    s.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).rebuildGeometry();
    expect(s.border).toBe(s.polygon.segments[2]);
  });
});

describe('Target', () => {
  it('constructor sets correct type', () => {
    const t = new Target(makeCenter(), makeDirection(), 50, 30);
    expect(t.type).toBe('target');
  });

  it('constructor creates valid polygon', () => {
    const t = new Target(makeCenter(), makeDirection(), 50, 30);
    expect(t.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('has no extra border property beyond base Marking', () => {
    const t = new Target(makeCenter(), makeDirection(), 50, 30);
    expect(t.polygon).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((t as any).border).toBeUndefined();
  });

  it('rebuildGeometry() works', () => {
    const t = new Target(makeCenter(), makeDirection(), 50, 30);
    t.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t as any).rebuildGeometry();
    expect(t.polygon.points.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Start', () => {
  it('constructor sets correct type', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    expect(s.type).toBe('start');
  });

  it('constructor creates valid polygon', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    expect(s.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('constructor creates image reference', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    expect(s.image).toBeDefined();
    expect(s.image.src).toContain('/assets/car.png');
  });

  it('rebuildGeometry() works', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    s.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).rebuildGeometry();
    expect(s.polygon.points.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Crossing', () => {
  it('constructor sets correct type', () => {
    const c = new Crossing(makeCenter(), makeDirection(), 50, 30);
    expect(c.type).toBe('crossing');
  });

  it('constructor creates valid polygon', () => {
    const c = new Crossing(makeCenter(), makeDirection(), 50, 30);
    expect(c.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('borders are [segments[0], segments[2]]', () => {
    const c = new Crossing(makeCenter(), makeDirection(), 50, 30);
    expect(c.borders).toHaveLength(2);
    expect(c.borders[0]).toBe(c.polygon.segments[0]);
    expect(c.borders[1]).toBe(c.polygon.segments[2]);
  });

  it('rebuildGeometry() works', () => {
    const c = new Crossing(makeCenter(), makeDirection(), 50, 30);
    c.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (c as any).rebuildGeometry();
    expect(c.borders[0]).toBe(c.polygon.segments[0]);
  });
});

describe('Parking', () => {
  it('constructor sets correct type', () => {
    const p = new Parking(makeCenter(), makeDirection(), 50, 30);
    expect(p.type).toBe('parking');
  });

  it('constructor creates valid polygon', () => {
    const p = new Parking(makeCenter(), makeDirection(), 50, 30);
    expect(p.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('borders are [segments[0], segments[2]]', () => {
    const p = new Parking(makeCenter(), makeDirection(), 50, 30);
    expect(p.borders).toHaveLength(2);
    expect(p.borders[0]).toBe(p.polygon.segments[0]);
    expect(p.borders[1]).toBe(p.polygon.segments[2]);
  });

  it('rebuildGeometry() works', () => {
    const p = new Parking(makeCenter(), makeDirection(), 50, 30);
    p.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p as any).rebuildGeometry();
    expect(p.borders[0]).toBe(p.polygon.segments[0]);
  });
});

describe('Yield', () => {
  it('constructor sets correct type', () => {
    const y = new Yield(makeCenter(), makeDirection(), 50, 30);
    expect(y.type).toBe('yield');
  });

  it('constructor creates valid polygon', () => {
    const y = new Yield(makeCenter(), makeDirection(), 50, 30);
    expect(y.polygon.points.length).toBeGreaterThanOrEqual(4);
  });

  it('border is polygon.segments[2]', () => {
    const y = new Yield(makeCenter(), makeDirection(), 50, 30);
    expect(y.border).toBe(y.polygon.segments[2]);
  });

  it('rebuildGeometry() works', () => {
    const y = new Yield(makeCenter(), makeDirection(), 50, 30);
    y.center = new Point(200, 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (y as any).rebuildGeometry();
    expect(y.border).toBe(y.polygon.segments[2]);
  });
});

describe('marking draw()', () => {
  it('Stop draws its border stroke and the STOP label', () => {
    const s = new Stop(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    s.draw(ctx);
    const texts = calls.filter((c) => c.method === 'fillText');
    expect(texts).toHaveLength(1);
    expect(texts[0].args[0]).toBe('STOP');
    expect(calls.some((c) => c.method === 'save')).toBe(true);
    expect(calls.some((c) => c.method === 'restore')).toBe(true);
  });

  it('Yield draws the YIELD label', () => {
    const y = new Yield(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    y.draw(ctx);
    const texts = calls.filter((c) => c.method === 'fillText');
    expect(texts).toHaveLength(1);
    expect(texts[0].args[0]).toBe('YIELD');
  });

  it('Parking draws the P label and two border strokes', () => {
    const p = new Parking(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    p.draw(ctx);
    const texts = calls.filter((c) => c.method === 'fillText');
    expect(texts).toHaveLength(1);
    expect(texts[0].args[0]).toBe('P');
    // two borders => at least two stroke calls
    expect(
      calls.filter((c) => c.method === 'stroke').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('Target draws three concentric points (arc calls)', () => {
    const t = new Target(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    t.draw(ctx);
    expect(
      calls.filter((c) => c.method === 'arc').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('Crossing draws a dashed segment across the road', () => {
    const c = new Crossing(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    c.draw(ctx);
    const dashed = calls.filter(
      (call) =>
        call.method === 'setLineDash' &&
        Array.isArray(call.args[0]) &&
        (call.args[0] as number[]).length === 2,
    );
    expect(dashed.length).toBeGreaterThanOrEqual(1);
    expect(calls.some((call) => call.method === 'stroke')).toBe(true);
  });

  it('Start draws the car image when the image has loaded', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    const { ctx, calls } = mockCanvas2D();
    s.draw(ctx);
    expect(calls.some((c) => c.method === 'drawImage')).toBe(true);
    expect(calls.some((c) => c.method === 'translate')).toBe(true);
    expect(calls.some((c) => c.method === 'rotate')).toBe(true);
  });

  it('Start skips drawImage when the image has not loaded', () => {
    const s = new Start(makeCenter(), makeDirection(), 50, 30);
    // Simulate an unloaded image (naturalWidth 0)
    Object.defineProperty(s.image, 'naturalWidth', { value: 0 });
    const { ctx, calls } = mockCanvas2D();
    s.draw(ctx);
    expect(calls.some((c) => c.method === 'drawImage')).toBe(false);
  });
});
