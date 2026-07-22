import { describe, it, expect } from 'vitest';
import { Osm } from '../../../../ts/math/osm-importer/osm.js';
import type { OsmData } from '../../../../ts/math/osm-importer/osm.js';

const simpleOsmData: OsmData = {
  elements: [
    { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
    { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
    { type: 'way', id: 101, nodes: [1, 2], tags: { highway: 'residential' } },
  ],
};

describe('Osm', () => {
  describe('parseRoads', () => {
    it('returns correct point and segment counts for valid data', () => {
      const result = Osm.parseRoads(simpleOsmData);
      expect(result.points.length).toBe(2);
      expect(result.segments.length).toBe(1);
    });

    it('produced points have x and y as numbers', () => {
      const result = Osm.parseRoads(simpleOsmData);
      for (const p of result.points) {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    });

    it('segment connects the two points', () => {
      const result = Osm.parseRoads(simpleOsmData);
      const seg = result.segments[0];
      expect(seg.p1.x).toBe(result.points[0].x);
      expect(seg.p1.y).toBe(result.points[0].y);
      expect(seg.p2.x).toBe(result.points[1].x);
      expect(seg.p2.y).toBe(result.points[1].y);
    });

    it('default way is not one-way', () => {
      const result = Osm.parseRoads(simpleOsmData);
      expect(result.segments[0].oneWay).toBe(false);
    });

    it('oneway=yes tag sets oneWay flag', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', oneway: 'yes' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].oneWay).toBe(true);
    });

    it('lanes=1 implies one-way', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', lanes: '1' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].oneWay).toBe(true);
    });

    it('junction=roundabout implies one-way', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', junction: 'roundabout' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].oneWay).toBe(true);
    });

    it('no nodes returns empty result', () => {
      const warn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: string) => warnings.push(msg);
      try {
        const data = {
          elements: [{ type: 'way' as const, id: 1, nodes: [1, 2], tags: {} }],
        };
        const result = Osm.parseRoads(data as OsmData);
        expect(result.points).toEqual([]);
        expect(result.segments).toEqual([]);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0]).toContain('No nodes');
      } finally {
        console.warn = warn;
      }
    });

    it('missing node reference logs warning and skips segment', () => {
      const warn = console.warn;
      const warnings: string[] = [];
      console.warn = (msg: string) => warnings.push(msg);
      try {
        const data: OsmData = {
          elements: [
            { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
            {
              type: 'way',
              id: 101,
              nodes: [1, 999],
              tags: { highway: 'residential' },
            },
          ],
        };
        const result = Osm.parseRoads(data);
        expect(result.points.length).toBe(1);
        expect(result.segments.length).toBe(0);
        expect(warnings.length).toBeGreaterThan(0);
        expect(warnings[0]).toContain('not found');
      } finally {
        console.warn = warn;
      }
    });

    it('multiple ways produce correct segments', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          { type: 'node', id: 3, lat: 48.857, lon: 2.353 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential' },
          },
          {
            type: 'way',
            id: 102,
            nodes: [2, 3],
            tags: { highway: 'residential' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.points.length).toBe(3);
      expect(result.segments.length).toBe(2);
    });

    it('stores highway type on segment', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          { type: 'way', id: 101, nodes: [1, 2], tags: { highway: 'primary' } },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].highwayType).toBe('primary');
    });

    it('stores road name on segment', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', name: 'Main St' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].name).toBe('Main St');
    });

    it('uses explicit lanes tag', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', lanes: '3' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].lanes).toBe(3);
    });

    it('defaults motorway to 4 lanes', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'motorway' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].lanes).toBe(4);
    });

    it('defaults residential to 2 lanes', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].lanes).toBe(2);
    });

    it('stores surface type on segment', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', surface: 'paving_stones' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].surface).toBe('paving_stones');
    });

    it('parses maxspeed as number', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', maxspeed: '50' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].maxSpeed).toBe(50);
    });

    it('oneway with lanes tag still sets oneWay flag', () => {
      const data: OsmData = {
        elements: [
          { type: 'node', id: 1, lat: 48.8566, lon: 2.3522 },
          { type: 'node', id: 2, lat: 48.857, lon: 2.3525 },
          {
            type: 'way',
            id: 101,
            nodes: [1, 2],
            tags: { highway: 'residential', oneway: 'yes', lanes: '2' },
          },
        ],
      };
      const result = Osm.parseRoads(data);
      expect(result.segments[0].oneWay).toBe(true);
      expect(result.segments[0].lanes).toBe(2);
    });
  });
});
