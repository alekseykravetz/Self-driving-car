import { Point } from '../primitives/point.js';
import { Segment } from '../primitives/segment.js';
import {
  METERS_PER_DEGREE_LATITUDE,
  WORLD_PIXELS_PER_METER,
  LANE_WIDTH_PX,
  metersToWorldPixels,
} from '../worldUnits.js';
import { invLerp, degToRad, normalize } from '../utils.js';
import { defaultLaneCount } from '../roadTypes.js';
import {
  placeApproachMarking,
  approachFacingDir,
  throughAxis,
} from './osmMarkingPlacement.js';
import type { MarkingKind, MarkAccumulator } from './osmMarkingPlacement.js';

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
  'name:he': string;
  'name:ar': string;
  'name:ru': string;
  // Building footprint tags (imported as decorative building outlines).
  building: string;
  height: string;
  'building:levels': string;
  'addr:housenumber': string;
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
 * Placement data for a road marking derived from a tagged OSM node
 * (`highway=traffic_signals` / `crossing` / `stop` / `give_way`). Kept as plain
 * math primitives so this (math-layer) module never imports the world-layer
 * marking classes. Consumers construct the actual `Light`/`Crossing`/`Stop`/
 * `Yield`. `height` is omitted for lights (their constructor takes none).
 */
export interface OsmMarkingPlacement {
  center: Point; // Placed position (approach stop line, or the node).
  directionVector: Point; // Canonical travel direction at that point.
  width: number; // Strip width across the road.
  height?: number; // Strip length along the road (crossing/stop/yield only).
}

/**
 * A real building outline imported from an OSM `building=*` closed way. Kept as
 * plain math primitives (points + optional height) so this math-layer module
 * never imports the world-layer `Building` class — the caller constructs it.
 * `height` is in world pixels (matching `Building.height`); `undefined` when
 * the way carries no `height`/`building:levels` tags (caller uses its default).
 * `houseNumber` is the `addr:housenumber` tag (rendered on the roof), if any.
 */
export interface OsmBuildingFootprint {
  points: Point[];
  height?: number;
  houseNumber?: string;
}

// Interface for the return type of parseRoads
interface ParsedRoads {
  points: Point[]; // Array of created Point instances
  segments: Segment[]; // Array of created Segment instances
  lights: OsmMarkingPlacement[]; // highway=traffic_signals
  crossings: OsmMarkingPlacement[]; // highway=crossing (zebra)
  stops: OsmMarkingPlacement[]; // highway=stop
  yields: OsmMarkingPlacement[]; // highway=give_way
  buildings: OsmBuildingFootprint[]; // building=* closed ways
}

/** Assumed storey height (metres) when deriving building height from levels. */
const METRES_PER_BUILDING_LEVEL = 3;

/**
 * Derives a building height in WORLD PIXELS from OSM tags, in priority order:
 * explicit `height` (metres) → `building:levels` × storey height → `undefined`
 * (caller falls back to the `Building` default). Ignores non-positive/NaN tags.
 */
function osmBuildingHeightPx(tags: Record<string, string>): number | undefined {
  const heightM = parseFloat(tags.height);
  if (!isNaN(heightM) && heightM > 0) return metersToWorldPixels(heightM);
  const levels = parseFloat(tags['building:levels']);
  if (!isNaN(levels) && levels > 0) {
    return metersToWorldPixels(levels * METRES_PER_BUILDING_LEVEL);
  }
  return undefined;
}

/**
 * Builds a closed-ring footprint polygon from a building way's node ids. Drops
 * the duplicate closing node (OSM rings repeat the first node last), needs ≥3
 * distinct points, and returns `null` for degenerate/open rings.
 */
function buildOsmBuildingFootprint(
  nodeIds: number[],
  nodeMap: Map<number | string, Point>,
  tags: Record<string, string>,
): OsmBuildingFootprint | null {
  const n = nodeIds.length;
  const closed = n >= 2 && nodeIds[0] === nodeIds[n - 1];
  const limit = closed ? n - 1 : n;
  const points: Point[] = [];
  for (let i = 0; i < limit; i++) {
    const p = nodeMap.get(nodeIds[i]);
    if (p) points.push(new Point(p.x, p.y));
  }
  if (points.length < 3) return null;
  const houseNumber = tags['addr:housenumber']?.trim() || undefined;
  return { points, height: osmBuildingHeightPx(tags), houseNumber };
}

/**
 * True when a way has parking on `side` (`'right'` | `'left'`). OSM marks
 * parking as a way-side attribute under the modern `parking:right*` /
 * `parking:left*` / `parking:both*` scheme (and the legacy `parking:lane:*`).
 * Any such key means that side has parking unless its value is `no`/`none`.
 * Parking is recorded on the segment metadata (`parkingLeft`/`parkingRight`)
 * and baked into the road envelope during generation — NOT emitted as markings.
 */
function hasParkingSide(
  tags: Record<string, string>,
  side: 'right' | 'left',
): boolean {
  for (const key of Object.keys(tags)) {
    if (!key.startsWith('parking:')) continue;
    // Legacy `parking:lane:right` / modern `parking:right:zone` etc.
    const isSide =
      key.startsWith(`parking:${side}`) ||
      key.startsWith('parking:both') ||
      key === `parking:lane:${side}` ||
      key === 'parking:lane:both';
    if (!isSide) continue;
    const value = String(tags[key] ?? '').toLowerCase();
    if (value === 'no' || value === 'none') continue;
    return true;
  }
  return false;
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
    const gen = Osm.parseRoadsChunked(data);
    let step = gen.next();
    while (!step.done) step = gen.next();
    return step.value;
  }

  /**
   * Time-sliceable version of {@link parseRoads}: a generator that yields a
   * local `[0, 1]` progress fraction at loop boundaries so a large OSM import
   * doesn't block the main thread (and trip the browser's "unresponsive tab"
   * dialog) while parsing. Produces exactly the same result as `parseRoads`;
   * drive it with a chunked runner to keep the UI responsive.
   */
  static *parseRoadsChunked(data: OsmData): Generator<number, ParsedRoads> {
    // Partition elements into nodes/ways in a SINGLE chunked pass and compute
    // the geographic bounds inline. Previously this was two `.filter()` passes
    // plus a `Math.min(...latitudes)` spread — an unchunked O(elements) block
    // (and a call-stack-overflow risk on huge imports) that ran before the
    // first yield, so it could still freeze the tab.
    const elements = data.elements;
    const nodes: OsmNodeElement[] = [];
    const ways: OsmWayElement[] = [];
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (let ei = 0; ei < elements.length; ei++) {
      const el = elements[ei];
      if (el.type === 'node') {
        nodes.push(el);
        if (el.lat < minLat) minLat = el.lat;
        if (el.lat > maxLat) maxLat = el.lat;
        if (el.lon < minLon) minLon = el.lon;
        if (el.lon > maxLon) maxLon = el.lon;
      } else if (el.type === 'way') {
        ways.push(el);
      }
      if ((ei & 8191) === 0) yield (0.15 * ei) / Math.max(elements.length, 1);
    }

    // Early exit if no nodes are found
    if (nodes.length === 0) {
      console.warn('No nodes found in OSM data.');
      return {
        points: [],
        segments: [],
        lights: [],
        crossings: [],
        stops: [],
        yields: [],
        buildings: [],
      };
    }

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

    const points: Point[] = []; // Road/marking graph points (see below)
    // Use a Map for efficient lookup of points by their original OSM ID
    const nodeMap = new Map<number | string, Point>();
    // Node ids referenced by highway ways (or their markings). Only these
    // become graph points; building-outline nodes stay out of the graph so
    // they don't render as editor dots.
    const roadNodeIds = new Set<number>();

    // Convert nodes to Point objects
    for (let ni = 0; ni < nodes.length; ni++) {
      const node = nodes[ni];
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
      nodeMap.set(node.id, point); // Store in map for quick lookup
      // Node conversion is O(nodes); yield through the ~0.15→0.3 progress band.
      if ((ni & 4095) === 0) {
        yield 0.15 + (0.15 * ni) / nodes.length;
      }
    }

    const segments: Segment[] = []; // To store created Segment objects
    // Real building outlines (building=* closed ways), extracted in the ways
    // loop below alongside road segments.
    const buildings: OsmBuildingFootprint[] = [];

    // Collect tagged nodes that become road markings. All lie ON highway ways,
    // so `out body;` output carries their tags. Directional markings (lights,
    // stops, give-ways) may additionally carry `direction` /
    // `traffic_signals:direction` (forward|backward) telling which way traffic
    // flows past them — authoritative for the marking's facing.
    const nodeKind = new Map<number, MarkingKind>();
    const signalDir = new Map<number, 'forward' | 'backward'>();
    for (let ni = 0; ni < nodes.length; ni++) {
      const node = nodes[ni];
      const hw = node.tags?.highway;
      let kind: MarkingKind | undefined;
      if (hw === 'traffic_signals') kind = 'light';
      else if (hw === 'crossing') kind = 'crossing';
      else if (hw === 'stop') kind = 'stop';
      else if (hw === 'give_way') kind = 'yield';
      if ((ni & 8191) === 0) yield 0.3;
      if (!kind) continue;
      nodeKind.set(node.id, kind);
      // Directional kinds (light/stop/yield) honour the node's `direction` tag;
      // crossings are symmetric and ignore it.
      if (kind === 'light' || kind === 'stop' || kind === 'yield') {
        const dir =
          node.tags?.direction ?? node.tags?.['traffic_signals:direction'];
        if (dir === 'forward' || dir === 'backward')
          signalDir.set(node.id, dir);
      }
    }
    // How many way-endpoints reference each node id (its "connectivity"). A node
    // shared by several ways is a junction; a mid-way node scores 1. Used to
    // orient directional markings on two-way roads (face away from the junction).
    const nodeRefCount = new Map<number, number>();
    if (nodeKind.size > 0) {
      for (let wi = 0; wi < ways.length; wi++) {
        const way = ways[wi];
        for (const nid of way.nodes) {
          nodeRefCount.set(nid, (nodeRefCount.get(nid) ?? 0) + 1);
        }
        if ((wi & 8191) === 0) yield 0.3;
      }
    }
    // Per tagged node, gather every neighbouring road node (across all ways)
    // with its one-way approach flag, so placement can pick the approach arm
    // and orientation after all ways are processed.
    const markAccum = new Map<number, MarkAccumulator>();

    // Convert ways to Segment objects
    for (let wi = 0; wi < ways.length; wi++) {
      const way = ways[wi];
      // The ways loop (segment creation + marking accumulation) is the bulk of
      // parsing; yield across ~0.3→0.9 of the progress bar.
      if ((wi & 127) === 0) {
        yield 0.3 + (0.6 * wi) / Math.max(ways.length, 1);
      }
      const nodeIds = way.nodes;

      // Building footprint ways (`building=*`, excluding `no`): extract a
      // closed-ring polygon and skip road processing. Any remaining non-highway
      // way is ignored (only highways become road segments).
      const buildingTag = way.tags.building;
      if (buildingTag && buildingTag.toLowerCase() !== 'no') {
        const footprint = buildOsmBuildingFootprint(nodeIds, nodeMap, way.tags);
        if (footprint) buildings.push(footprint);
        continue;
      }
      if (!way.tags.highway) continue;
      // This is a road way — its nodes become graph points.
      for (const nid of nodeIds) roadNodeIds.add(nid);

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
      const nameHe = way.tags['name:he'];
      const nameAr = way.tags['name:ar'];
      const nameRu = way.tags['name:ru'];
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

      // On-street parking side flags (way-level attribute). Relative to the
      // way's node order; reverse one-ways swap the sides so "right" stays the
      // right of the segment's stored direction. Recorded on the segment so the
      // road generator bakes a parking lane into the collision envelope.
      const rawParkRight = hasParkingSide(way.tags, 'right');
      const rawParkLeft = hasParkingSide(way.tags, 'left');
      const parkingRight = isReverseOneWay ? rawParkLeft : rawParkRight;
      const parkingLeft = isReverseOneWay ? rawParkRight : rawParkLeft;

      // Record any tagged marking nodes on this way, gathering their road
      // neighbours (prev/next) and one-way approach sides. Orientation and
      // placement are resolved after all ways are processed.
      if (nodeKind.size > 0) {
        for (let idx = 0; idx < nodeIds.length; idx++) {
          const nid = nodeIds[idx];
          const kind = nodeKind.get(nid);
          if (!kind) continue;

          const center = nodeMap.get(nid);
          if (!center) continue;

          let entry = markAccum.get(nid);
          if (!entry) {
            entry = {
              center,
              kind,
              neighbors: [],
              lanes: laneCount,
              directedInterior: false,
            };
            markAccum.set(nid, entry);
          }
          // The controlled road is usually the widest one at the junction.
          entry.lanes = Math.max(entry.lanes, laneCount);

          const prev = idx > 0 ? nodeMap.get(nodeIds[idx - 1]) : undefined;
          const next =
            idx < nodeIds.length - 1
              ? nodeMap.get(nodeIds[idx + 1])
              : undefined;
          const interior = !!(prev && next);
          // A neighbour is a valid APPROACH side when oncoming traffic can
          // reach the node from it. Two-way roads qualify on both sides; a
          // one-way qualifies only on its upstream side (reverse one-ways flow
          // in the opposite node order, swapping which side is upstream).
          if (prev) {
            entry.neighbors.push({
              point: prev,
              approach: !isOneWay || !isReverseOneWay,
              degree: nodeRefCount.get(nodeIds[idx - 1]) ?? 1,
            });
          }
          if (next) {
            entry.neighbors.push({
              point: next,
              approach: !isOneWay || isReverseOneWay,
              degree: nodeRefCount.get(nodeIds[idx + 1]) ?? 1,
            });
          }

          // Authoritative facing from the node's direction tag: `forward`
          // controls traffic travelling in way-node order (approaching from
          // `prev`); `backward` is the opposite (approaching from `next`).
          // Applies to lights, stops and give-ways. Prefer an assignment from a
          // through (interior) node.
          const sd = signalDir.get(nid);
          if (
            sd &&
            (!entry.directedApproach || (interior && !entry.directedInterior))
          ) {
            const upstream = sd === 'forward' ? prev : next;
            if (upstream) {
              entry.directedApproach = upstream;
              entry.directedInterior = interior;
            }
          }
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
              nameHe,
              nameAr,
              nameRu,
              maxspeedType,
              parkingLeft: parkingLeft || undefined,
              parkingRight: parkingRight || undefined,
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

    // Build the graph point set from road nodes only, preserving node order.
    // Building-outline nodes are intentionally excluded (they live in the
    // `buildings` footprints, not the graph, so they don't render as dots).
    for (let ni = 0; ni < nodes.length; ni++) {
      const node = nodes[ni];
      if (roadNodeIds.has(node.id)) {
        const p = nodeMap.get(node.id);
        if (p) points.push(p);
      }
    }

    // --- Assemble markings from tagged nodes ---
    // Lights are signal HEADS facing oncoming traffic on one approach, so they
    // use approach placement (`placeApproachMarking`): pick the approach arm and
    // slide upstream to the stop line. Stops and give-ways are DIRECTIONAL too
    // (the painted "STOP"/"YIELD" text must read for the approaching driver), so
    // they orient along the approach travel direction (`approachFacingDir`).
    // Crossings are symmetric zebra lines, so they are simply oriented across
    // the road at the node (straight-through axis).
    const markEntries = [...markAccum.values()];
    const lights: OsmMarkingPlacement[] = [];
    const crossings: OsmMarkingPlacement[] = [];
    const stops: OsmMarkingPlacement[] = [];
    const yields: OsmMarkingPlacement[] = [];

    for (let mi = 0; mi < markEntries.length; mi++) {
      const entry = markEntries[mi];
      // Marking assembly can be O(markings²) for signal clusters; yield across
      // the last ~10% of progress.
      if ((mi & 63) === 0) {
        yield 0.9 + (0.1 * mi) / Math.max(markEntries.length, 1);
      }
      const { center, neighbors, lanes, kind } = entry;
      const roadWidth = lanes * LANE_WIDTH_PX;

      if (kind === 'light') {
        const placement = placeApproachMarking(
          entry,
          markEntries,
          roadWidth / 2,
        );
        if (placement) lights.push(placement);
        continue;
      }

      if (kind === 'stop' || kind === 'yield') {
        // Directional: the painted text must read for the approaching driver.
        // `approachFacingDir` points UPSTREAM (toward oncoming traffic);
        // negating it gives the canonical travel direction (into the
        // junction), which is what Stop/Yield draw() expects.
        const facing = approachFacingDir(entry);
        if (!facing) continue;
        const placement: OsmMarkingPlacement = {
          center,
          directionVector: new Point(-facing.x, -facing.y),
          width: roadWidth / 2,
          height: roadWidth / 2,
        };
        if (kind === 'stop') stops.push(placement);
        else yields.push(placement);
        continue;
      }

      // Crossing: symmetric zebra spanning the full road; orient across it at
      // the node (straight-through axis), ~half-road depth along travel.
      const axis = throughAxis(
        center,
        neighbors.map((n) => n.point),
      );
      if (!axis) continue;
      crossings.push({
        center,
        directionVector: normalize(axis),
        width: roadWidth,
        height: roadWidth / 2,
      });
    }

    // Return the processed points, segments and node markings.
    return { points, segments, lights, crossings, stops, yields, buildings };
  }
}
