import { describe, it, expect } from 'vitest';
import {
  worldPixelsToMeters,
  metersToWorldPixels,
  METERS_PER_DEGREE_LATITUDE,
  WORLD_PIXELS_PER_METER,
} from '../../../ts/math/worldUnits.js';

describe('worldUnits gap coverage', () => {
  describe('metersToWorldPixels', () => {
    it('converts 0 meters to 0 pixels', () => {
      expect(metersToWorldPixels(0)).toBe(0);
    });

    it('converts 1 meter to WORLD_PIXELS_PER_METER pixels', () => {
      expect(metersToWorldPixels(1)).toBe(WORLD_PIXELS_PER_METER);
    });

    it('converts 10 meters to 140 pixels', () => {
      expect(metersToWorldPixels(10)).toBe(WORLD_PIXELS_PER_METER * 10);
    });

    it('handles negative values', () => {
      expect(metersToWorldPixels(-5)).toBe(WORLD_PIXELS_PER_METER * -5);
    });
  });

  describe('worldPixelsToMeters', () => {
    it('converts 0 pixels to 0 meters', () => {
      expect(worldPixelsToMeters(0)).toBe(0);
    });

    it('converts WORLD_PIXELS_PER_METER pixels to 1 meter', () => {
      expect(worldPixelsToMeters(WORLD_PIXELS_PER_METER)).toBe(1);
    });

    it('converts 140 pixels to 10 meters', () => {
      expect(worldPixelsToMeters(140)).toBe(10);
    });

    it('is inverse of metersToWorldPixels', () => {
      const meters = 7.5;
      const px = metersToWorldPixels(meters);
      expect(worldPixelsToMeters(px)).toBeCloseTo(meters);
    });
  });

  describe('METERS_PER_DEGREE_LATITUDE constant', () => {
    it('is defined and positive', () => {
      expect(METERS_PER_DEGREE_LATITUDE).toBeGreaterThan(0);
      expect(METERS_PER_DEGREE_LATITUDE).toBe(111000);
    });
  });
});
