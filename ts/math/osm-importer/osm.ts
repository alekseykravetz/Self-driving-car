import { Point } from '../primitives/point.js';
import { Segment } from '../primitives/segment.js';
import {
  METERS_PER_DEGREE_LATITUDE,
  WORLD_PIXELS_PER_METER,
  LANE_WIDTH_PX,
} from '../worldUnits.js';
import {
  invLerp,
  degToRad,
  subtract,
  normalize,
  dot,
  add,
  scale,
  distance,
} from '../utils.js';
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
  'name:he': string;
  'name:ar': string;
  'name:ru': string;
  [key: string]: string; // Allow for other unspecified tags
}

/** Signals within this world-pixel radius are treated as one intersection. */
const SIGNAL_CLUSTER_RADIUS_PX = 400;

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
  directionVector: Point; // Unit vector along the road at that point.
  width: number; // Strip width across the road.
  height?: number; // Strip length along the road (crossing/stop/yield only).
}

/** Node-marking kinds derived from OSM node `highway=*` tags. */
type MarkingKind = 'light' | 'crossing' | 'stop' | 'yield';

/** A road node adjacent to a tagged node, with its one-way approach flag. */
interface MarkNeighbor {
  point: Point; // Adjacent road node (on the centreline).
  approach: boolean; // True when oncoming traffic flows from here into node.
  degree: number; // Connectivity of the neighbour (higher = junction side).
}

/** Per-node accumulator gathered across every incident way. */
interface MarkAccumulator {
  center: Point;
  kind: MarkingKind;
  neighbors: MarkNeighbor[];
  lanes: number;
  directedApproach?: Point; // Upstream side from `traffic_signals:direction`.
  directedInterior: boolean; // Whether that assignment came from a through node.
}

// Interface for the return type of parseRoads
interface ParsedRoads {
  points: Point[]; // Array of created Point instances
  segments: Segment[]; // Array of created Segment instances
  lights: OsmMarkingPlacement[]; // highway=traffic_signals
  crossings: OsmMarkingPlacement[]; // highway=crossing (zebra)
  stops: OsmMarkingPlacement[]; // highway=stop
  yields: OsmMarkingPlacement[]; // highway=give_way
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
    // Filter out only node elements using a type guard
    const nodes = data.elements.filter(
      (element): element is OsmNodeElement => element.type === 'node',
    );

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
      };
    }

    // Geographic bounds. Compute in a single pass — spreading a huge coordinate
    // array into Math.min/Math.max (`Math.min(...latitudes)`) risks a call-stack
    // overflow on large imports, and allocating the arrays is wasteful.
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const node of nodes) {
      if (node.lat < minLat) minLat = node.lat;
      if (node.lat > maxLat) maxLat = node.lat;
      if (node.lon < minLon) minLon = node.lon;
      if (node.lon > maxLon) maxLon = node.lon;
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

    const points: Point[] = []; // To store created Point objects
    // Use a Map for efficient lookup of points by their original OSM ID
    const nodeMap = new Map<number | string, Point>();

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
      points.push(point);
      nodeMap.set(node.id, point); // Store in map for quick lookup
      // Node conversion is O(nodes); yield through the first ~30% of progress.
      if ((ni & 4095) === 0) yield (0.3 * ni) / nodes.length;
    }

    const segments: Segment[] = []; // To store created Segment objects
    // Filter out only way elements using a type guard
    const ways = data.elements.filter(
      (element): element is OsmWayElement => element.type === 'way',
    );

    // Collect tagged nodes that become road markings. All lie ON highway ways,
    // so `out body;` output carries their tags. Directional markings (lights,
    // stops, give-ways) may additionally carry `direction` /
    // `traffic_signals:direction` (forward|backward) telling which way traffic
    // flows past them — authoritative for the marking's facing.
    const nodeKind = new Map<number, MarkingKind>();
    const signalDir = new Map<number, 'forward' | 'backward'>();
    for (const node of nodes) {
      const hw = node.tags?.highway;
      let kind: MarkingKind | undefined;
      if (hw === 'traffic_signals') kind = 'light';
      else if (hw === 'crossing') kind = 'crossing';
      else if (hw === 'stop') kind = 'stop';
      else if (hw === 'give_way') kind = 'yield';
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
      for (const way of ways) {
        for (const nid of way.nodes) {
          nodeRefCount.set(nid, (nodeRefCount.get(nid) ?? 0) + 1);
        }
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
        // `approachFacingDir` points UPSTREAM (toward oncoming traffic); the
        // marking `draw()` (shared with the manual editor) expects the lane-
        // guide convention, which is the OPPOSITE orientation, so negate it to
        // match how a lane-placed Stop/Yield renders.
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
    return { points, segments, lights, crossings, stops, yields };
  }
}

/**
 * Places an approach-facing marking (a traffic light) so it sits on the correct
 * approach arm, centred on the road, at the stop line just before the junction.
 *
 * Facing is resolved in priority order:
 *   1. `directedApproach` — from the node's `traffic_signals:direction` tag
 *      (authoritative when present).
 *   2. Radial — the approach neighbour pointing most outward from the centroid
 *      of the other signals at the same junction (a nearby cluster).
 *   3. `throughAxis` — the straight-through road, drawn at the node (isolated
 *      signal, no cluster to give a radial).
 *
 * When an approach arm is chosen the light slides UPSTREAM along that road's
 * real centreline (`center + dir * min(width, span/2)`), which keeps it centred
 * on the road width. Returns `undefined` when no usable direction exists.
 */
function placeApproachMarking(
  entry: MarkAccumulator,
  allEntries: MarkAccumulator[],
  width: number,
): OsmMarkingPlacement | undefined {
  const { center, neighbors, directedApproach } = entry;
  let bestUnit: Point | undefined;
  let bestPoint: Point | undefined;

  // 1. Authoritative direction tag.
  if (directedApproach) {
    const d = subtract(directedApproach, center);
    if (d.x !== 0 || d.y !== 0) {
      bestUnit = normalize(d);
      bestPoint = directedApproach;
    }
  }

  // 2. Radial from the junction centroid (other signals within the cluster).
  if (!bestUnit) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const other of allEntries) {
      if (other === entry || other.kind !== 'light') continue;
      if (distance(center, other.center) <= SIGNAL_CLUSTER_RADIUS_PX) {
        sumX += other.center.x;
        sumY += other.center.y;
        count++;
      }
    }
    if (count > 0) {
      const centroid = new Point(sumX / count, sumY / count);
      const radial = subtract(center, centroid); // outward = approach side
      const radialUnit =
        radial.x !== 0 || radial.y !== 0 ? normalize(radial) : undefined;
      const approachable = neighbors.filter((n) => n.approach);
      const pool = approachable.length > 0 ? approachable : neighbors;
      let bestScore = -Infinity;
      for (const n of pool) {
        const d = subtract(n.point, center);
        if (d.x === 0 && d.y === 0) continue;
        const unit = normalize(d);
        const score = radialUnit ? dot(unit, radialUnit) : 0;
        if (score > bestScore) {
          bestScore = score;
          bestUnit = unit;
          bestPoint = n.point;
        }
      }
    }
  }

  // 3. Isolated signal: straight-through road axis, drawn at the node.
  if (!bestUnit || !bestPoint) {
    const axis = throughAxis(
      center,
      neighbors.map((n) => n.point),
    );
    if (!axis) return undefined;
    return { center, directionVector: normalize(axis), width };
  }

  // Slide upstream to the stop line, clamped so it stays on this edge.
  const span = distance(center, bestPoint);
  const placed = add(center, scale(bestUnit, Math.min(width, span * 0.5)));
  return { center: placed, directionVector: bestUnit, width };
}

/**
 * Resolves the facing for a DIRECTIONAL painted marking (stop / give-way) whose
 * text must read for the approaching driver. Returns a unit vector pointing
 * back toward the oncoming traffic (matching the editor's lane-guide
 * convention: `directionVector` points opposite to travel). Priority:
 *   1. `directedApproach` — the node's `direction` tag.
 *   2. The single one-way approach neighbour (the upstream side) when the road
 *      is one-way (exactly one approach side, at least one non-approach side).
 *   3. Two-way road: face AWAY from the junction — the driver approaches the
 *      more-connected node, so orient toward the neighbour most opposite to the
 *      highest-`degree` (junction) neighbour.
 *   4. `throughAxis` — no junction cue (e.g. mid-block); sign not resolvable.
 * Returns `undefined` when no usable direction exists.
 */
function approachFacingDir(entry: MarkAccumulator): Point | undefined {
  const { center, neighbors, directedApproach } = entry;

  // 1. Authoritative direction tag: face the upstream (approach) side.
  if (directedApproach) {
    const d = subtract(directedApproach, center);
    if (d.x !== 0 || d.y !== 0) return normalize(d);
  }

  // 2. One-way road: the upstream side is the sole approach-flagged neighbour.
  const approaches = neighbors.filter((n) => n.approach);
  const others = neighbors.filter((n) => !n.approach);
  if (approaches.length === 1 && others.length >= 1) {
    const d = subtract(approaches[0].point, center);
    if (d.x !== 0 || d.y !== 0) return normalize(d);
  }

  // 3. Two-way road: face away from the junction. The junction is the
  // highest-connectivity neighbour; the driver travels toward it, so the sign
  // (opposite to travel) faces the neighbour most opposite to the junction.
  const dirs = neighbors
    .map((n) => ({ n, d: subtract(n.point, center) }))
    .filter((x) => x.d.x !== 0 || x.d.y !== 0);
  if (dirs.length >= 2) {
    let junction = dirs[0];
    let minDegree = dirs[0].n.degree;
    for (const x of dirs) {
      if (x.n.degree > junction.n.degree) junction = x;
      if (x.n.degree < minDegree) minDegree = x.n.degree;
    }
    if (junction.n.degree > minDegree) {
      const jUnit = normalize(junction.d);
      let upstream = dirs[0];
      let bestDot = Infinity;
      for (const x of dirs) {
        if (x === junction) continue;
        const dp = dot(normalize(x.d), jUnit);
        if (dp < bestDot) {
          bestDot = dp;
          upstream = x;
        }
      }
      return normalize(upstream.d);
    }
  }

  // 4. No junction cue (e.g. mid-block): straight-through axis (arbitrary sign).
  const axis = throughAxis(
    center,
    neighbors.map((n) => n.point),
  );
  return axis ? normalize(axis) : undefined;
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
