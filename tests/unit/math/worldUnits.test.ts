import { describe, it, expect } from 'vitest';
import {
  WORLD_PIXELS_PER_METER,
  SIMULATION_FPS,
  pxPerFrameToKmh,
  kmhToPxPerFrame,
  formatMetersFromWorldPixels,
  formatKmhFromPxPerFrame,
  framesToSeconds,
  formatElapsedTime,
} from '../../../ts/math/worldUnits.js';

describe('constants', () => {
  it('WORLD_PIXELS_PER_METER is 14', () => {
    expect(WORLD_PIXELS_PER_METER).toBe(14);
  });

  it('SIMULATION_FPS is 60', () => {
    expect(SIMULATION_FPS).toBe(60);
  });
});

describe('pxPerFrameToKmh', () => {
  it('converts 0 px/frame to 0 km/h', () => {
    expect(pxPerFrameToKmh(0)).toBe(0);
  });

  it('converts 1 px/frame to km/h', () => {
    const result = pxPerFrameToKmh(1);
    expect(result).toBeCloseTo((1 * 60 * 3.6) / 14);
  });

  it('handles negative values', () => {
    expect(pxPerFrameToKmh(-1)).toBeCloseTo((-1 * 60 * 3.6) / 14);
  });
});

describe('kmhToPxPerFrame', () => {
  it('converts 0 km/h to 0 px/frame', () => {
    expect(kmhToPxPerFrame(0)).toBe(0);
  });

  it('converts km/h to px/frame', () => {
    const result = kmhToPxPerFrame(36);
    expect(result).toBeCloseTo(((36 / 3.6) * 14) / 60);
  });

  it('is inverse of pxPerFrameToKmh', () => {
    const original = 50;
    const pxPerFrame = kmhToPxPerFrame(original);
    const back = pxPerFrameToKmh(pxPerFrame);
    expect(back).toBeCloseTo(original);
  });
});

describe('formatMetersFromWorldPixels', () => {
  it('formats pixels as meters with one decimal', () => {
    expect(formatMetersFromWorldPixels(14)).toBe('1.0 m');
  });

  it('formats 0 px as 0.0 m', () => {
    expect(formatMetersFromWorldPixels(0)).toBe('0.0 m');
  });

  it('formats 140 px as 10.0 m', () => {
    expect(formatMetersFromWorldPixels(140)).toBe('10.0 m');
  });
});

describe('formatKmhFromPxPerFrame', () => {
  it('formats 0 px/frame as 0.0 km/h', () => {
    expect(formatKmhFromPxPerFrame(0)).toBe('0.0 km/h');
  });

  it('formats px/frame as km/h with one decimal', () => {
    const result = formatKmhFromPxPerFrame(1);
    expect(result).toMatch(/^\d+\.\d+ km\/h$/);
  });
});

describe('framesToSeconds', () => {
  it('converts 0 frames to 0 seconds', () => {
    expect(framesToSeconds(0)).toBe(0);
  });

  it('converts 60 frames to 1 second', () => {
    expect(framesToSeconds(60)).toBe(1);
  });

  it('converts 150 frames to 2.5 seconds', () => {
    expect(framesToSeconds(150)).toBeCloseTo(2.5);
  });
});

describe('formatElapsedTime', () => {
  it('formats 0 frames as 00:00:00', () => {
    expect(formatElapsedTime(0)).toBe('00:00:00');
  });

  it('formats 60 frames as 00:00:01', () => {
    expect(formatElapsedTime(60)).toBe('00:00:01');
  });

  it('formats 3600 frames as 00:01:00', () => {
    expect(formatElapsedTime(3600)).toBe('00:01:00');
  });

  it('formats 216000 frames as 01:00:00', () => {
    expect(formatElapsedTime(216000)).toBe('01:00:00');
  });

  it('formats an arbitrary duration with padding', () => {
    expect(formatElapsedTime(3661)).toBe('00:01:01');
  });

  it('handles large values without overflow', () => {
    const result = formatElapsedTime(86400 * 60);
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
