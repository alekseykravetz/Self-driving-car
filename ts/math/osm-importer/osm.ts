import { Point } from '../primitives/point.js';
import { Segment } from '../primitives/segment.js';
import {
  METERS_PER_DEGREE_LATITUDE,
  WORLD_PIXELS_PER_METER,
  LANE_WIDTH_PX,
} from '../worldUnits.js';
import { invLerp, degToRad, subtract, normalize, dot } from '../utils.js';
import { defaultLaneCount } from '../roadTypes.js';

// --- Interfaces for OSM Data Structure ---
interface OsmNodeElement {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  // Present only when the Overpass query outputs node bodies (`out body;`).
  // Skeleton output (`out skel;`) omits tags entirely.
  tags?: Record<string, string>;
}

interface OsmWayTags {
  oneway: string; // e.g., "yes", "no", "-1"
  lanes: string;
  highway: string;
  name: string;
  surface: string;
  maxspeed: string;
  junction: string;
  // P1/P2 features — explicit entries for clarity (index signature covers
  // the colon-bearing keys `name:en`, `destination:ref`, `maxspeed:type`).
  ref: string;
  destination: string;
  bridge: string;
  layer: string;
  lane_markings: string;
  'destination:ref': string;
  'maxspeed:type': string;
  'name:en': string;
  [key: string]: string; // Allow for other unspecified tags
}

/** Country-specific default speeds (km/h) inferred from `maxspeed:type`. */
const MAXSPEED_TYPE_DEFAULTS: Record<string, number> = {
  'IL:motorway': 110,
  'IL:trunk': 90,
  'IL:primary': 90,
  'IL:secondary': 80,
  'IL:tertiary': 80,
  'IL:urban': 50,
  'IL:rural': 80,
};

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

/**
 * Placement data for a traffic light derived from an OSM `highway=traffic_signals`
 * node. Kept as plain math primitives so this (math-layer) module never imports
 * the world-layer `Light` marking. Consumers construct the actual marking.
 */
export interface OsmLightPlacement {
  center: Point; // Position of the signal (a road node).
  directionVector: Point; // Unit vector along the road at that node.
  width: number; // Light strip width (spans the road).
}

// Interface for the return type of parseRoads
interface ParsedRoads {
  points: Point[]; // Array of created Point instances
  segments: Segment[]; // Array of created Segment instances
  lights: OsmLightPlacement[]; // Traffic-signal placements from tagged nodes
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
      return { points: [], segments: [], lights: [] };
    }

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

    // Collect the ids of nodes tagged as traffic signals so we can turn them
    // into Light markings, oriented along the road they actually sit on.
    const signalNodeIds = new Set<number>();
    for (const node of nodes) {
      if (node.tags?.highway === 'traffic_signals') signalNodeIds.add(node.id);
    }
    // Per signal node, gather every neighbouring road node (across all ways) so
    // we can pick the road that runs STRAIGHT THROUGH the signal. Way naming is
    // unreliable at junctions (a node can be interior to several overlapping
    // ways), so orientation is derived from geometry rather than membership.
    interface SignalAccumulator {
      center: Point;
      neighbors: Point[];
      lanes: number;
    }
    const signalAccum = new Map<number, SignalAccumulator>();

    // Convert ways to Segment objects
    for (const way of ways) {
      const nodeIds = way.nodes;

      // Way-level metadata (constant across all sub-segments of this way).
      const oneWayTag = String(way.tags.oneway ?? 'no').toLowerCase(); // Default to 'no' if undefined
      const isRoundabout = way.tags.junction === 'roundabout';
      const lanesTag = way.tags.lanes;
      // `oneway: "-1"` means the way is one-way flowing in REVERSE node
      // order (p2 → p1). We treat that as one-way AND swap each segment's
      // endpoints so the segment direction matches the traffic flow.
      const isReverseOneWay = oneWayTag === '-1';
      const isOneWay =
        oneWayTag === 'yes' ||
        isReverseOneWay ||
        lanesTag === '1' ||
        isRoundabout;

      const highwayType = way.tags.highway;
      const name = way.tags.name;
      const surface = way.tags.surface;
      const ref = way.tags.ref;
      const destination = way.tags.destination;
      const destinationRef = way.tags['destination:ref'];
      const bridge = way.tags.bridge === 'yes';
      const layerStr = way.tags.layer;
      const layer = layerStr ? parseInt(layerStr, 10) : undefined;
      const laneMarkings = way.tags.lane_markings === 'no' ? false : undefined;
      const nameEn = way.tags['name:en'];
      const maxspeedType = way.tags['maxspeed:type'];

      const speedStr = way.tags.maxspeed;
      let maxSpeed: number | undefined;
      if (speedStr) {
        const num = parseFloat(speedStr);
        if (!isNaN(num)) maxSpeed = num;
      }
      // Infer `maxSpeed` from `maxspeed:type` when the explicit tag is absent.
      if (maxSpeed === undefined && maxspeedType) {
        maxSpeed = MAXSPEED_TYPE_DEFAULTS[maxspeedType];
      }

      const lanesParsed = lanesTag ? parseInt(lanesTag, 10) : undefined;
      const laneCount =
        lanesParsed && lanesParsed > 0
          ? lanesParsed
          : defaultLaneCount(highwayType, isOneWay);

      // Record any traffic-signal nodes on this way, gathering their immediate
      // road neighbours (prev/next along this way). Orientation is resolved
      // later from the full set of neighbours across every incident way.
      if (signalNodeIds.size > 0) {
        for (let idx = 0; idx < nodeIds.length; idx++) {
          const nid = nodeIds[idx];
          if (!signalNodeIds.has(nid)) continue;

          const center = nodeMap.get(nid);
          if (!center) continue;

          let entry = signalAccum.get(nid);
          if (!entry) {
            entry = { center, neighbors: [], lanes: laneCount };
            signalAccum.set(nid, entry);
          }
          // The controlled road is usually the widest one at the junction.
          entry.lanes = Math.max(entry.lanes, laneCount);

          const prev = idx > 0 ? nodeMap.get(nodeIds[idx - 1]) : undefined;
          const next =
            idx < nodeIds.length - 1
              ? nodeMap.get(nodeIds[idx + 1])
              : undefined;
          if (prev) entry.neighbors.push(prev);
          if (next) entry.neighbors.push(next);
        }
      }

      // Iterate through pairs of node IDs in the way
      for (let i = 1; i < nodeIds.length; i++) {
        // Find the corresponding Point objects using the map
        const prevPoint = nodeMap.get(nodeIds[i - 1]);
        const currentPoint = nodeMap.get(nodeIds[i]);

        // Only create a segment if both points were found in the data
        if (prevPoint && currentPoint) {
          // For reverse one-ways, swap endpoints so the segment's direction
          // (p1 → p2) matches the oncoming traffic flow.
          const p1 = isReverseOneWay ? currentPoint : prevPoint;
          const p2 = isReverseOneWay ? prevPoint : currentPoint;

          // Create and add the new Segment
          segments.push(
            new Segment(p1, p2, isOneWay, false, {
              highwayType,
              name,
              lanes: laneCount,
              surface,
              maxSpeed,
              ref,
              destination,
              destinationRef,
              bridge,
              layer,
              laneMarkings,
              roundabout: isRoundabout,
              nameEn,
              maxspeedType,
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

    // --- Assemble traffic lights collected from tagged nodes ---
    // OSM marks signalised junctions with `highway=traffic_signals` on a node.
    // Orient each light across the road that runs straight through the signal,
    // resolved from all incident road neighbours (see `throughAxis`).
    const lights: OsmLightPlacement[] = [];
    for (const { center, neighbors, lanes } of signalAccum.values()) {
      const axis = throughAxis(center, neighbors);
      if (!axis) continue;
      lights.push({
        center,
        directionVector: normalize(axis),
        width: (lanes * LANE_WIDTH_PX) / 2,
      });
    }

    // Return the processed points and segments
    return { points, segments, lights };
  }
}

/**
 * Determines the axis of the road passing straight through a signalised node.
 * Given the node and the road nodes adjacent to it (across every incident way),
 * returns a vector along the two most-opposite (straightest) neighbours — the
 * "through" road the signal controls. Falls back to the single neighbour for a
 * dead-end. Returns `undefined` when no usable direction exists.
 */
function throughAxis(center: Point, neighbors: Point[]): Point | undefined {
  // Keep only neighbours that give a non-degenerate direction.
  const dirs: { point: Point; unit: Point }[] = [];
  for (const point of neighbors) {
    const d = subtract(point, center);
    if (d.x === 0 && d.y === 0) continue;
    dirs.push({ point, unit: normalize(d) });
  }
  if (dirs.length === 0) return undefined;
  if (dirs.length === 1) return subtract(dirs[0].point, center);

  // Pick the pair whose unit directions are most opposite (dot most negative).
  let bestDot = Infinity;
  let a = dirs[0].point;
  let b = dirs[1].point;
  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const d = dot(dirs[i].unit, dirs[j].unit);
      if (d < bestDot) {
        bestDot = d;
        a = dirs[i].point;
        b = dirs[j].point;
      }
    }
  }
  return subtract(a, b);
}
