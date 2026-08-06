import { describe, it, expect } from 'vitest';
import {
  defaultLaneCount,
  getRoadFillColor,
  applyRoadTypeDefaults,
  ROAD_TYPES,
  ROAD_TYPE_LABELS,
} from '../../../ts/math/roadTypes.js';

describe('roadTypes', () => {
  describe('defaultLaneCount', () => {
    it('returns 4 for motorway', () => {
      expect(defaultLaneCount('motorway', false)).toBe(4);
    });
    it('returns 2 for motorway_link', () => {
      expect(defaultLaneCount('motorway_link', false)).toBe(2);
    });
    it('returns 4 for trunk', () => {
      expect(defaultLaneCount('trunk', false)).toBe(4);
    });
    it('returns 2 for primary', () => {
      expect(defaultLaneCount('primary', false)).toBe(2);
    });
    it('returns 2 for tertiary', () => {
      expect(defaultLaneCount('tertiary', false)).toBe(2);
    });
    it('returns 1 for service', () => {
      expect(defaultLaneCount('service', false)).toBe(1);
    });
    it('returns 1 for living_street', () => {
      expect(defaultLaneCount('living_street', false)).toBe(1);
    });
    it('returns 1 for track', () => {
      expect(defaultLaneCount('track', false)).toBe(1);
    });
    it('returns 2 for undefined with oneWay=false', () => {
      expect(defaultLaneCount(undefined, false)).toBe(2);
    });
    it('returns 1 for undefined with oneWay=true', () => {
      expect(defaultLaneCount(undefined, true)).toBe(1);
    });
  });

  describe('getRoadFillColor', () => {
    it('returns #888 for motorway', () => {
      expect(getRoadFillColor('motorway')).toBe('#888');
    });
    it('returns #888 for motorway_link', () => {
      expect(getRoadFillColor('motorway_link')).toBe('#888');
    });
    it('returns #998877 for trunk', () => {
      expect(getRoadFillColor('trunk')).toBe('#998877');
    });
    it('returns #B5774A for primary', () => {
      expect(getRoadFillColor('primary')).toBe('#B5774A');
    });
    it('returns #B0A060 for secondary', () => {
      expect(getRoadFillColor('secondary')).toBe('#B0A060');
    });
    it('returns #CCC for tertiary', () => {
      expect(getRoadFillColor('tertiary')).toBe('#CCC');
    });
    it('returns #AAA for service', () => {
      expect(getRoadFillColor('service')).toBe('#AAA');
    });
    it('returns #AAA for living_street', () => {
      expect(getRoadFillColor('living_street')).toBe('#AAA');
    });
    it('returns #BBB for unclassified', () => {
      expect(getRoadFillColor('unclassified')).toBe('#BBB');
    });
    it('returns #BBB for unknown type', () => {
      expect(getRoadFillColor('unknown')).toBe('#BBB');
    });
  });

  describe('applyRoadTypeDefaults', () => {
    it('motorway → 4 lanes, one-way', () => {
      expect(applyRoadTypeDefaults('motorway')).toEqual({
        lanes: 4,
        oneWay: true,
      });
    });
    it('trunk → 4 lanes, not one-way', () => {
      expect(applyRoadTypeDefaults('trunk')).toEqual({
        lanes: 4,
        oneWay: false,
      });
    });
    it('service → 1 lane, not one-way', () => {
      expect(applyRoadTypeDefaults('service')).toEqual({
        lanes: 1,
        oneWay: false,
      });
    });
    it('living_street → 1 lane, not one-way', () => {
      expect(applyRoadTypeDefaults('living_street')).toEqual({
        lanes: 1,
        oneWay: false,
      });
    });
    it('track → 1 lane, not one-way', () => {
      expect(applyRoadTypeDefaults('track')).toEqual({
        lanes: 1,
        oneWay: false,
      });
    });
    it('undefined → 2 lanes, not one-way', () => {
      expect(applyRoadTypeDefaults(undefined)).toEqual({
        lanes: 2,
        oneWay: false,
      });
    });
    it('primary → 2 lanes, not one-way (default fallback)', () => {
      expect(applyRoadTypeDefaults('primary')).toEqual({
        lanes: 2,
        oneWay: false,
      });
    });
  });

  describe('ROAD_TYPES', () => {
    it('contains all expected types', () => {
      const expected = [
        'motorway',
        'trunk',
        'primary',
        'secondary',
        'tertiary',
        'residential',
        'service',
        'living_street',
        'unclassified',
        'track',
      ];
      for (const t of expected) {
        expect(ROAD_TYPES).toContain(t);
      }
    });

    it('does not contain _link variants', () => {
      for (const t of ROAD_TYPES) {
        expect(t).not.toMatch(/_link$/);
      }
    });

    it('has the expected number of entries', () => {
      expect(ROAD_TYPES.length).toBe(10);
    });
  });

  describe('ROAD_TYPE_LABELS', () => {
    it('has a label for every type in ROAD_TYPES', () => {
      for (const t of ROAD_TYPES) {
        expect(ROAD_TYPE_LABELS[t]).toBeDefined();
        expect(typeof ROAD_TYPE_LABELS[t]).toBe('string');
      }
    });

    it('has correct labels for sample types', () => {
      expect(ROAD_TYPE_LABELS.motorway).toBe('Motorway');
      expect(ROAD_TYPE_LABELS.living_street).toBe('Living Street');
      expect(ROAD_TYPE_LABELS.unclassified).toBe('Unclassified');
    });
  });
});
