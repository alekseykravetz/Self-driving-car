import { Point } from '../primitives/point.js';
import { Segment } from '../primitives/segment.js';
import {
  METERS_PER_DEGREE_LATITUDE,
  WORLD_PIXELS_PER_METER,
} from '../worldUnits.js';
import { invLerp, degToRad } from '../utils.js';

// --- Interfaces for OSM Data Structure ---
interface OsmNodeElement {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
}

interface OsmWayTags {
  oneway: string; // e.g., "yes", "no", "-1"
  lanes: string;
  highway: string;
  name: string;
  surface: string;
  maxspeed: string;
  junction: string;
  [key: string]: string; // Allow for other unspecified tags
}

interface OsmWayElement {
  type: 'way';
  id: number;
  nodes: number[]; // Array of node IDs forming the way
  tags: OsmWayTags;
}

// Union type for elements in the OSM data
type OsmElement = OsmNodeElement | OsmWayElement;

// Main interface for the input data to parseRoads
export interface OsmData {
  elements: OsmElement[];
}

// Interface for the return type of parseRoads
interface ParsedRoads {
  points: Point[]; // Array of created Point instances
  segments: Segment[]; // Array of created Segment instances
}

// --- Converted Osm Object ---

type OsmPoint = Point & {
  id: number;
};

export class Osm {
  /**
   * Parses raw OSM data (typically from Overpass API JSON) to extract nodes and ways,
   * converting them into Point and Segment objects scaled to a canvas coordinate system.
   * @param data - The parsed JSON data from an OSM source.
   * @returns An object containing arrays of Point and Segment instances.
   */
  static parseRoads(data: OsmData): ParsedRoads {
    // Filter out only node elements using a type guard
    const nodes = data.elements.filter(
      (element): element is OsmNodeElement => element.type === 'node',
    );

    // Early exit if no nodes are found
    if (nodes.length === 0) {
      console.warn('No nodes found in OSM data.');
      return { points: [], segments: [] };
    }

    const defaultLaneCount = (
      highwayType: string | undefined,
      oneWay: boolean,
    ): number => {
      switch (highwayType) {
        case 'motorway':
          return 4;
        case 'trunk':
          return 4;
        case 'primary':
          return 2;
        case 'secondary':
          return 2;
        case 'tertiary':
          return 2;
        case 'residential':
          return 2;
        case 'service':
          return 1;
        case 'living_street':
          return 1;
        case 'track':
          return 1;
        default:
          return oneWay ? 1 : 2;
      }
    };

    // Extract latitudes and longitudes for bounding box calculation
    const latitudes = nodes.map((node) => node.lat);
    const longitudes = nodes.map((node) => node.lon);

    // Calculate geographic bounds
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    // Calculate scaling factors for coordinate conversion
    const deltaLat = maxLat - minLat;
    const deltaLon = maxLon - minLon;

    // Calculate aspect ratio, handle deltaLat being zero
    const ar = deltaLat === 0 ? 1 : deltaLon / deltaLat;

    // Calculate target canvas dimensions based on geographic range.
    // At 14px/m, a 100px two-lane road maps to ~7.1m, close to real roads.
    const height =
      deltaLat * METERS_PER_DEGREE_LATITUDE * WORLD_PIXELS_PER_METER;
    // Adjust width based on aspect ratio and latitude (cosine correction for longitude distance)
    // Using average latitude might be slightly better than maxLat for large areas
    const avgLat = (minLat + maxLat) / 2;
    const width = height * ar * Math.cos(degToRad(avgLat));

    const points: Point[] = []; // To store created Point objects
    // Use a Map for efficient lookup of points by their original OSM ID
    const nodeMap = new Map<number | string, Point>();

    // Convert nodes to Point objects
    for (const node of nodes) {
      // Calculate canvas coordinates using inverse linear interpolation
      // Handle zero delta cases to avoid NaN/Infinity
      const y =
        deltaLat === 0
          ? height / 2
          : invLerp(maxLat, minLat, node.lat) * height;
      const x =
        deltaLon === 0 ? width / 2 : invLerp(minLon, maxLon, node.lon) * width;

      const point = new Point(x, y) as OsmPoint;
      point.id = node.id; // Attach OSM ID to the Point object (requires Point class modification)
      points.push(point);
      nodeMap.set(node.id, point); // Store in map for quick lookup
    }

    const segments: Segment[] = []; // To store created Segment objects
    // Filter out only way elements using a type guard
    const ways = data.elements.filter(
      (element): element is OsmWayElement => element.type === 'way',
    );

    // Convert ways to Segment objects
    for (const way of ways) {
      const nodeIds = way.nodes;
      // Iterate through pairs of node IDs in the way
      for (let i = 1; i < nodeIds.length; i++) {
        // Find the corresponding Point objects using the map
        const prevPoint = nodeMap.get(nodeIds[i - 1]);
        const currentPoint = nodeMap.get(nodeIds[i]);

        // Only create a segment if both points were found in the data
        if (prevPoint && currentPoint) {
          // Determine if the way is one-way based on tags
          const oneWayTag = String(way.tags.oneway ?? 'no').toLowerCase(); // Default to 'no' if undefined
          const isRoundabout = way.tags.junction === 'roundabout';
          const lanesTag = way.tags.lanes;
          const isOneWay =
            oneWayTag === 'yes' || lanesTag === '1' || isRoundabout;

          const highwayType = way.tags.highway;
          const name = way.tags.name;
          const surface = way.tags.surface;
          const speedStr = way.tags.maxspeed;
          let maxSpeed: number | undefined;
          if (speedStr) {
            const num = parseFloat(speedStr);
            if (!isNaN(num)) maxSpeed = num;
          }
          const lanesParsed = lanesTag ? parseInt(lanesTag, 10) : undefined;
          const laneCount =
            lanesParsed && lanesParsed > 0
              ? lanesParsed
              : defaultLaneCount(highwayType, isOneWay);

          // Create and add the new Segment
          segments.push(
            new Segment(prevPoint, currentPoint, isOneWay, false, {
              highwayType,
              name,
              lanes: laneCount,
              surface,
              maxSpeed,
            }),
          );
        } else {
          // Log a warning if points referenced by a way were not found (e.g., filtered out or missing)
          console.warn(
            `Points for segment in way ${way.id} not found (nodes ${nodeIds[i - 1]} -> ${nodeIds[i]})`,
          );
        }
      }
    }

    // Return the processed points and segments
    return { points, segments };
  }
}
