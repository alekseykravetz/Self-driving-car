import { describe, it, expect, beforeAll } from 'vitest';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

beforeAll(() => {
  setupImageMock();
});

import { SimpleWorld } from '../../../../ts/world/simple/simpleWorld.js';
import { Point } from '../../../../ts/math/primitives/point.js';

describe('SimpleWorld', () => {
  describe('constructor', () => {
    it('creates world with correct position and width', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.getCenter()).toBe(200);
      expect(w.getLaneCount()).toBe(3);
    });

    it('creates 2 road borders (left and right edges)', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.roadBorders).toHaveLength(2);
      expect(w.roadBorders[0].p1.x).toBe(110);
      expect(w.roadBorders[0].p2.x).toBe(110);
      expect(w.roadBorders[1].p1.x).toBe(290);
      expect(w.roadBorders[1].p2.x).toBe(290);
    });

    it('road borders span from -infinity to infinity', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.roadBorders[0].p1.y).toBe(-1000000);
      expect(w.roadBorders[0].p2.y).toBe(1000000);
    });

    it('graph has 2 points and 1 segment', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.graph.points).toHaveLength(2);
      expect(w.graph.segments).toHaveLength(1);
    });

    it('creates a Start marking at lane 1, y=100', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.markings).toHaveLength(1);
      expect(w.markings[0].type).toBe('start');
      expect(w.markings[0].center.x).toBe(200);
      expect(w.markings[0].center.y).toBe(100);
    });

    it('initializes empty decoration arrays', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.buildings).toEqual([]);
      expect(w.trees).toEqual([]);
      expect(w.corridors).toEqual([]);
      expect(w.separatorBorders).toEqual([]);
    });
  });

  describe('getLaneCenter', () => {
    it('returns center of lane 0 (leftmost)', () => {
      const w = new SimpleWorld(200, 180, 3);
      const laneWidth = 180 / 3;
      const expected = 110 + laneWidth / 2;
      expect(w.getLaneCenter(0)).toBe(expected);
    });

    it('returns center of middle lane', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.getLaneCenter(1)).toBe(200);
    });

    it('returns center of rightmost lane', () => {
      const w = new SimpleWorld(200, 180, 3);
      const laneWidth = 180 / 3;
      const expected = 290 - laneWidth / 2;
      expect(w.getLaneCenter(2)).toBe(expected);
    });

    it('clamps out-of-range index to last lane', () => {
      const w = new SimpleWorld(200, 180, 3);
      expect(w.getLaneCenter(5)).toBe(w.getLaneCenter(2));
    });

    it('handles single lane', () => {
      const w = new SimpleWorld(200, 180, 1);
      expect(w.getLaneCenter(0)).toBe(200);
    });

    it('handles 2 lanes', () => {
      const w = new SimpleWorld(200, 180, 2);
      const laneWidth = 180 / 2;
      expect(w.getLaneCenter(0)).toBe(110 + laneWidth / 2);
      expect(w.getLaneCenter(1)).toBe(290 - laneWidth / 2);
    });
  });

  describe('getLaneCount', () => {
    it('returns default 3 lanes', () => {
      const w = new SimpleWorld(200, 180);
      expect(w.getLaneCount()).toBe(3);
    });

    it('returns custom lane count', () => {
      const w = new SimpleWorld(200, 180, 5);
      expect(w.getLaneCount()).toBe(5);
    });
  });

  describe('getCenter', () => {
    it('returns the road center x-coordinate', () => {
      const w = new SimpleWorld(400, 180, 3);
      expect(w.getCenter()).toBe(400);
    });
  });

  describe('generateCorridor', () => {
    it('is a no-op that does not mutate corridors', () => {
      const w = new SimpleWorld(200, 180, 3);
      w.generateCorridor(new Point(0, 0), new Point(100, 0));
      expect(w.corridors).toEqual([]);
    });
  });
});
