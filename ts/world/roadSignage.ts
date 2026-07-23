import { Graph } from '../math/graph/graph.js';
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { add, subtract, scale, normalize, lerp2D } from '../math/utils.js';
import {
  WalkPiece,
  sharesEndpoint,
  buildConnectedComponents,
  orderSegmentWalk,
} from './streetWalk.js';
import { HIGHWAY_TIER_RANK } from './roadTiers.js';

/** Target spacing between street-name labels along a street, in px. */
export const STREET_LABEL_SPACING_PX = 1000;
/** Distance a speed sign is offset into a segment from a limit-change node. */
export const SPEED_SIGN_NODE_OFFSET_PX = 60;
/** A name label closer than this to a speed sign is shifted or skipped. */
export const LABEL_SIGN_AVOID_RADIUS_PX = 100;
/** Arc-distance a colliding label is retried at (± along the street). */
export const LABEL_SIGN_AVOID_SHIFT_PX = 150;
/** Below this zoom level, road signage (names + speed signs) is hidden. */
export const MIN_SIGNAGE_ZOOM = 0.4;
/** Target spacing between road shield badges along a named route, in px. */
export const ROAD_SHIELD_SPACING_PX = 2000;

export interface StreetLabelPlacement {
  x: number;
  y: number;
  angle: number; // normalized so text is never upside down
  name: string;
}

export interface SpeedSignPlacement {
  x: number;
  y: number;
  maxSpeed: number;
}

export interface RoadShieldPlacement {
  x: number;
  y: number;
  angle: number; // normalized so text is never upside down
  ref: string;
  highwayType?: string;
}

export interface ExitSignPlacement {
  x: number;
  y: number;
  angle: number; // perpendicular to the segment, facing oncoming traffic
  destination: string;
  destinationRef?: string;
}

function nodeKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * Speed-limit sign placement. Signs are drawn only where the limit changes:
 * at graph nodes whose incident segments carry differing `maxSpeed` values
 * (one sign per affected segment, offset into the segment from the node).
 * A speed zone that never meets a different limit gets exactly one fallback
 * sign at the midpoint of its longest segment.
 */
export function computeSpeedSignPlacements(graph: Graph): SpeedSignPlacement[] {
  const signs: SpeedSignPlacement[] = [];
  const changeNodeKeys = new Set<string>();

  // Steps 1-3: limit-change nodes.
  for (const point of graph.points) {
    const incident = graph.getSegmentsWithPoint(point);
    if (incident.length < 2) continue;

    // `undefined` (no limit tag) counts as a distinct value.
    const speeds = incident.map((s) => s.maxSpeed);
    if (new Set(speeds).size < 2) continue;

    changeNodeKeys.add(nodeKey(point));
    for (const seg of incident) {
      if (seg.maxSpeed === undefined) continue;
      // Only segments whose limit differs from a neighbor's get a sign.
      if (!speeds.some((v) => v !== seg.maxSpeed)) continue;

      const otherEnd = seg.p1.equals(point) ? seg.p2 : seg.p1;
      let center: Point;
      if (seg.length() < SPEED_SIGN_NODE_OFFSET_PX) {
        center = lerp2D(seg.p1, seg.p2, 0.5);
      } else {
        const dir = normalize(subtract(otherEnd, point));
        center = add(point, scale(dir, SPEED_SIGN_NODE_OFFSET_PX));
      }
      signs.push({ x: center.x, y: center.y, maxSpeed: seg.maxSpeed });
    }
  }

  // Step 4: isolated-zone fallback. Connected components of segments with a
  // defined `maxSpeed`; two segments union only when they share an endpoint
  // AND have equal `maxSpeed`.
  const speedSegs = graph.segments.filter((s) => s.maxSpeed !== undefined);
  const parent = new Map<Segment, Segment>();
  for (const s of speedSegs) parent.set(s, s);
  const find = (s: Segment): Segment => {
    let root = s;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = s;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: Segment, b: Segment): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (let i = 0; i < speedSegs.length; i++) {
    for (let j = i + 1; j < speedSegs.length; j++) {
      const a = speedSegs[i];
      const b = speedSegs[j];
      if (a.maxSpeed === b.maxSpeed && sharesEndpoint(a, b)) {
        union(a, b);
      }
    }
  }
  const components = new Map<Segment, Segment[]>();
  for (const s of speedSegs) {
    const root = find(s);
    const comp = components.get(root) ?? [];
    comp.push(s);
    components.set(root, comp);
  }

  for (const comp of components.values()) {
    // If any node the zone touches is a limit-change node, the zone
    // transitions there and needs no fallback sign.
    let touchesChangeNode = false;
    for (const seg of comp) {
      if (
        changeNodeKeys.has(nodeKey(seg.p1)) ||
        changeNodeKeys.has(nodeKey(seg.p2))
      ) {
        touchesChangeNode = true;
        break;
      }
    }
    if (touchesChangeNode) continue;

    let longest = comp[0];
    for (const seg of comp) {
      if (seg.length() > longest.length()) longest = seg;
    }
    const mid = lerp2D(longest.p1, longest.p2, 0.5);
    signs.push({ x: mid.x, y: mid.y, maxSpeed: longest.maxSpeed! });
  }

  return signs;
}

/** Maps an arc-length position onto the walk → point + upright text angle. */
function pointAtArc(
  walk: WalkPiece[],
  arcPos: number,
): { point: Point; angle: number } {
  let remaining = arcPos;
  for (let i = 0; i < walk.length; i++) {
    const piece = walk[i];
    if (remaining <= piece.length || i === walk.length - 1) {
      const t = piece.length > 0 ? Math.min(1, remaining / piece.length) : 0;
      const point = lerp2D(piece.start, piece.end, t);
      let angle = Math.atan2(
        piece.end.y - piece.start.y,
        piece.end.x - piece.start.x,
      );
      // Normalize so text never reads upside down.
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
        angle += Math.PI;
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle <= -Math.PI) angle += 2 * Math.PI;
      }
      return { point, angle };
    }
    remaining -= piece.length;
  }
  const last = walk[walk.length - 1];
  return { point: last.end, angle: 0 };
}

function collidesWithAny(
  p: Point,
  avoid: { x: number; y: number }[],
  radius: number,
): boolean {
  return avoid.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < radius);
}

/**
 * Street-name label placement. Connected same-name segments are grouped into
 * street polylines and labels are distributed evenly along the total street
 * length (~`spacing` px apart, min 1 per street). When `opts.avoid` lists
 * sign centers, labels landing within `avoidRadius` of a sign are retried at
 * ±LABEL_SIGN_AVOID_SHIFT_PX along the street, then skipped.
 */
export function computeStreetLabelPlacements(
  segments: Segment[],
  opts?: {
    spacing?: number;
    avoid?: { x: number; y: number }[];
    avoidRadius?: number;
  },
): StreetLabelPlacement[] {
  const spacing = opts?.spacing ?? STREET_LABEL_SPACING_PX;
  const avoid = opts?.avoid;
  const avoidRadius = opts?.avoidRadius ?? LABEL_SIGN_AVOID_RADIUS_PX;

  // Group segments by a display name that falls back to `nameEn` when the
  // primary `name` contains non-Latin characters (e.g. Hebrew/Arabic), so
  // street labels render in a Latin script when an English name is
  // available.
  const isLatin = (s: string): boolean =>
    // eslint-disable-next-line no-control-regex
    /^[\x00-\x7F]*$/.test(s);
  const displayNameOf = (seg: Segment): string | undefined => {
    if (seg.name) {
      return isLatin(seg.name) ? seg.name : (seg.nameEn ?? seg.name);
    }
    return seg.nameEn;
  };

  const byName = new Map<string, Segment[]>();
  for (const seg of segments) {
    const displayName = displayNameOf(seg);
    if (!displayName) continue;
    const group = byName.get(displayName) ?? [];
    group.push(seg);
    byName.set(displayName, group);
  }

  const labels: StreetLabelPlacement[] = [];
  for (const [name, group] of byName) {
    for (const component of buildConnectedComponents(group)) {
      const walk = orderSegmentWalk(component);
      const totalLength = walk.reduce((sum, piece) => sum + piece.length, 0);
      const count = Math.max(1, Math.round(totalLength / spacing));

      for (let i = 0; i < count; i++) {
        const arcPos = ((i + 0.5) * totalLength) / count;
        const candidates = [arcPos];
        if (avoid) {
          candidates.push(
            Math.min(totalLength, arcPos + LABEL_SIGN_AVOID_SHIFT_PX),
          );
          candidates.push(Math.max(0, arcPos - LABEL_SIGN_AVOID_SHIFT_PX));
        }
        for (const candidate of candidates) {
          const { point, angle } = pointAtArc(walk, candidate);
          if (avoid && collidesWithAny(point, avoid, avoidRadius)) {
            continue; // try the shifted positions, then skip this label
          }
          labels.push({ x: point.x, y: point.y, angle, name });
          break;
        }
      }
    }
  }
  return labels;
}

/**
 * Road-shield placement. Segments sharing a `ref` value are grouped into
 * connected walks (same helpers as street labels) and one shield badge is
 * placed per walk at the midpoint; longer routes get additional badges
 * spaced ~`ROAD_SHIELD_SPACING_PX` apart. Angle is upright-normalized.
 */
export function computeRoadShieldPlacements(
  graph: Graph,
): RoadShieldPlacement[] {
  const byRef = new Map<string, Segment[]>();
  for (const seg of graph.segments) {
    if (!seg.ref) continue;
    const group = byRef.get(seg.ref) ?? [];
    group.push(seg);
    byRef.set(seg.ref, group);
  }

  const shields: RoadShieldPlacement[] = [];
  for (const [ref, group] of byRef) {
    for (const component of buildConnectedComponents(group)) {
      const walk = orderSegmentWalk(component);
      const totalLength = walk.reduce((sum, p) => sum + p.length, 0);
      if (totalLength <= 0) continue;
      const count = Math.max(
        1,
        Math.round(totalLength / ROAD_SHIELD_SPACING_PX),
      );
      for (let i = 0; i < count; i++) {
        const arcPos = ((i + 0.5) * totalLength) / count;
        const { point, angle } = pointAtArc(walk, arcPos);
        shields.push({
          x: point.x,
          y: point.y,
          angle,
          ref,
          highwayType: component[0]?.highwayType,
        });
      }
    }
  }
  return shields;
}

/**
 * Exit-sign placement: green gantry signs on `_link` roads that carry a
 * `destination` tag. Exactly one sign per qualifying link, positioned at the
 * endpoint of the link that connects to a higher-tier road (so it faces
 * oncoming traffic entering the link). Angle is perpendicular to the
 * segment direction.
 */
export function computeExitSignPlacements(graph: Graph): ExitSignPlacement[] {
  const signs: ExitSignPlacement[] = [];

  // Helper: count of incident segments at `point` whose tier is higher than
  // `ownRank`. Higher-tier roads at one end identify the link's start (where
  // traffic enters coming off the higher road).
  const higherTierNeighbors = (point: Point, ownRank: number): Segment[] => {
    const higher: Segment[] = [];
    for (const seg of graph.getSegmentsWithPoint(point)) {
      const rank = HIGHWAY_TIER_RANK[seg.highwayType ?? ''] ?? 0;
      if (rank > ownRank) higher.push(seg);
    }
    return higher;
  };

  for (const seg of graph.segments) {
    const type = seg.highwayType ?? '';
    if (!type.endsWith('_link')) continue;
    if (!seg.destination) continue;

    const ownRank = HIGHWAY_TIER_RANK[type] ?? 0;
    const higherAtP1 = higherTierNeighbors(seg.p1, ownRank);
    const higherAtP2 = higherTierNeighbors(seg.p2, ownRank);
    // The link "starts" at the end touching the higher-tier road.
    const anchor = higherAtP1.length >= higherAtP2.length ? seg.p1 : seg.p2;

    // Segment direction; rotate +90deg so the sign faces oncoming traffic.
    const dirAngle = Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x);
    const angle = dirAngle + Math.PI / 2;

    signs.push({
      x: anchor.x,
      y: anchor.y,
      angle,
      destination: seg.destination,
      destinationRef: seg.destinationRef,
    });
  }
  return signs;
}
