import { describe, it, expect } from 'vitest';
import { CameraFrustum } from '../../../ts/camera/cameraFrustum.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';

/**
 * All geometry here is exercised at the origin looking "up" (−y). With angle 0
 * the forward vector is (0, −1), so points with y < 0 are in front of the
 * camera and the view triangle opens toward −y.
 */
function frustumAtOrigin(range = 100): CameraFrustum {
  const f = new CameraFrustum();
  f.updateFrustumPoints(0, 0, 0, 0, range);
  return f;
}

describe('CameraFrustum.updateFrustumPoints', () => {
  it('places tip straight ahead and the wedge symmetric about it', () => {
    const f = new CameraFrustum();
    const { center, tip, left, right, polygon } = f.updateFrustumPoints(
      0,
      0,
      0,
      0,
      100,
    );
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(0, 6);
    // angle 0 → tip at (0, -range)
    expect(tip.x).toBeCloseTo(0, 6);
    expect(tip.y).toBeCloseTo(-100, 6);
    // left/right are mirror images across the view axis (x symmetric).
    expect(left.x).toBeCloseTo(-right.x, 6);
    expect(left.y).toBeCloseTo(right.y, 6);
    expect(polygon.points).toHaveLength(3);
  });
});

describe('CameraFrustum.forward / inFront', () => {
  it('forward points along -y for angle 0', () => {
    const f = frustumAtOrigin();
    const fwd = f.forward();
    expect(fwd.x).toBeCloseTo(0, 6);
    expect(fwd.y).toBeCloseTo(-1, 6);
  });

  it('classifies points ahead of vs behind the camera', () => {
    const f = frustumAtOrigin();
    expect(f.inFront(new Point(0, -50))).toBe(true);
    expect(f.inFront(new Point(0, 50))).toBe(false);
    // Points essentially at the camera are not "in front" (guard is > 1).
    expect(f.inFront(new Point(0, 0))).toBe(false);
  });
});

describe('CameraFrustum.nearPlaneClip', () => {
  it('keeps a polygon fully ahead of the near plane intact', () => {
    const f = frustumAtOrigin();
    const quad = new Polygon([
      new Point(-10, -10),
      new Point(10, -10),
      new Point(10, -30),
      new Point(-10, -30),
    ]);
    const clipped = f.nearPlaneClip(quad);
    expect(clipped).not.toBeNull();
    expect(clipped!.points).toHaveLength(4);
  });

  it('returns null for a polygon fully behind the near plane', () => {
    const f = frustumAtOrigin();
    const quad = new Polygon([
      new Point(-10, 10),
      new Point(10, 10),
      new Point(10, 30),
      new Point(-10, 30),
    ]);
    expect(f.nearPlaneClip(quad)).toBeNull();
  });

  it('clips a straddling polygon and interpolates edge crossings', () => {
    const f = frustumAtOrigin();
    const quad = new Polygon([
      new Point(-10, -10), // ahead
      new Point(10, -10), // ahead
      new Point(10, 10), // behind
      new Point(-10, 10), // behind
    ]);
    const clipped = f.nearPlaneClip(quad);
    expect(clipped).not.toBeNull();
    // The two front vertices survive plus two interpolated crossings on the
    // near plane (y = -2).
    const ys = clipped!.points.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(-2, 6);
  });
});

describe('CameraFrustum.visibleRange', () => {
  it('returns a sub-range for a segment inside the view wedge', () => {
    const f = frustumAtOrigin(200);
    const range = f.visibleRange(new Point(0, -10), new Point(0, -120));
    expect(range).not.toBeNull();
    expect(range!.tMin).toBeGreaterThanOrEqual(0);
    expect(range!.tMax).toBeGreaterThan(range!.tMin);
  });

  it('returns null for a degenerate (zero-length) segment', () => {
    const f = frustumAtOrigin();
    expect(f.visibleRange(new Point(5, 5), new Point(5, 5))).toBeNull();
  });

  it('returns null for a segment entirely behind the camera', () => {
    const f = frustumAtOrigin();
    expect(f.visibleRange(new Point(0, 50), new Point(0, 90))).toBeNull();
  });
});

describe('CameraFrustum.projectPoint', () => {
  it('projects an on-axis point to the canvas center', () => {
    const f = frustumAtOrigin(200);
    const ctx = mockCanvas2D().ctx; // canvas 800x600
    const projected = f.projectPoint(ctx, new Point(0, -50, 0));
    // On the view axis at the same z → maps to (width/2, height/2).
    expect(projected.x).toBeCloseTo(400, 4);
    expect(projected.y).toBeCloseTo(300, 4);
  });

  it('shifts the projected y upward for a raised point (higher z)', () => {
    const f = frustumAtOrigin(200);
    const ctx = mockCanvas2D().ctx;
    const ground = f.projectPoint(ctx, new Point(0, -50, 0));
    const raised = f.projectPoint(ctx, new Point(0, -50, 30));
    expect(raised.y).not.toBeCloseTo(ground.y, 2);
    expect(Number.isFinite(raised.x)).toBe(true);
  });
});

describe('CameraFrustum.filter', () => {
  it('returns a polygon fully inside the frustum whole', () => {
    const f = frustumAtOrigin(200);
    const inside = new Polygon([
      new Point(-5, -40),
      new Point(5, -40),
      new Point(5, -60),
      new Point(-5, -60),
    ]);
    const result = f.filter([inside]);
    expect(result).toHaveLength(1);
  });

  it('drops a polygon entirely outside the frustum', () => {
    const f = frustumAtOrigin(200);
    const outside = new Polygon([
      new Point(500, 500),
      new Point(520, 500),
      new Point(520, 520),
      new Point(500, 520),
    ]);
    expect(f.filter([outside])).toHaveLength(0);
  });

  it('with clip=false returns a straddling polygon uncut', () => {
    const f = frustumAtOrigin(100);
    // A wide quad spanning the frustum edge; base must stay intact for cars/trees.
    const straddling = new Polygon([
      new Point(-200, -40),
      new Point(200, -40),
      new Point(200, -60),
      new Point(-200, -60),
    ]);
    const clipped = f.filter([straddling], true);
    const whole = f.filter([straddling], false);
    expect(whole).toHaveLength(1);
    expect(whole[0].points).toHaveLength(4); // uncut
    // Clipping generally changes the point count (cut against the wedge).
    expect(clipped.length).toBeGreaterThan(0);
  });
});
