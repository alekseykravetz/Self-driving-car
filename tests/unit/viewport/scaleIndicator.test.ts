import { describe, it, expect } from 'vitest';
import { ScaleIndicator } from '../../../ts/viewport/scaleIndicator.js';
import type { Viewport } from '../../../ts/viewport/viewport.js';

function makeMockViewport(
  pixelsPerMeter: number = 1,
  zoom: number = 1,
): Viewport {
  return {
    getPixelsPerMeter: () => pixelsPerMeter,
    getZoom: () => zoom,
  } as Viewport;
}

describe('ScaleIndicator', () => {
  it('constructor sets default options correctly', () => {
    const vp = makeMockViewport(10, 1);
    const si = new ScaleIndicator(800, 600, vp);
    expect(si.position.x).toBe(20);
    expect(si.position.y).toBe(580); // 600 - 20
    expect(si.scaleInMeters).toBe(10);
    expect(si.pixelsPerMeter).toBe(10);
    expect(si.barLength).toBe(100); // 10 * 10
  });

  it('update with basic params computes correct barLength', () => {
    const vp = makeMockViewport(5, 1);
    const si = new ScaleIndicator(800, 600, vp, { scaleInMeters: 10 });
    si.update(800, 600);
    expect(si.pixelsPerMeter).toBe(5);
    expect(si.barLength).toBe(50); // 5 * 10
  });

  it('update with canvasHeight change updates position.y', () => {
    const vp = makeMockViewport(1, 1);
    const si = new ScaleIndicator(800, 600, vp);
    si.update(800, 400);
    expect(si.position.y).toBe(380); // 400 - 20
  });

  it('update with larger scaleInMeters doubles bar length', () => {
    const vp = makeMockViewport(5, 1);
    const si = new ScaleIndicator(800, 600, vp, { scaleInMeters: 20 });
    expect(si.barLength).toBe(100); // 5 * 20
  });

  it('update with zoom multiplier adjusts pixelsPerMeter', () => {
    const vp = makeMockViewport(10, 2);
    const si = new ScaleIndicator(800, 600, vp, {
      pixelsPerMeterMultiplier: 2,
    });
    si.update(800, 600);
    expect(si.pixelsPerMeter).toBe(20); // 10 * 2
    expect(si.barLength).toBe(200); // 20 * 10
  });
});
