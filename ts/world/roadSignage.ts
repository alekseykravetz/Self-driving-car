import { Graph } from '../math/graph/graph.js';
import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { add, subtract, scale, normalize, lerp2D } from '../math/utils.js';

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

/** One oriented piece of a street walk (start → end along the street). */
interface WalkPiece {
  start: Point;
  end: Point;
  length: number;
}

function nodeKey(p: Point): string {
  return `${p.x},${p.y}`;
}

function sharesEndpoint(a: Segment, b: Segment): boolean {
  return (
    a.p1.equals(b.p1) ||
    a.p1.equals(b.p2) ||
    a.p2.equals(b.p1) ||
    a.p2.equals(b.p2)
  );
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

/** Connected components within one name group (shared endpoints link up). */
function buildStreetComponents(group: Segment[]): Segment[][] {
  const remaining = new Set(group);
  const components: Segment[][] = [];
  while (remaining.size > 0) {
    const seed = remaining.values().next().value!;
    remaining.delete(seed);
    const component = [seed];
    let grew = true;
    while (grew) {
      grew = false;
      for (const seg of [...remaining]) {
        if (component.some((c) => sharesEndpoint(c, seg))) {
          remaining.delete(seg);
          component.push(seg);
          grew = true;
        }
      }
    }
    components.push(component);
  }
  return components;
}

/**
 * Orders a street component into a walk: a list of oriented pieces chained
 * end-to-start. Starts from a segment with a free endpoint when one exists;
 * branched leftovers are appended as additional chains.
 */
function orderStreetWalk(component: Segment[]): WalkPiece[] {
  const unvisited = new Set(component);
  const isFreeEndpoint = (p: Point, self: Segment): boolean => {
    for (const s of component) {
      if (s !== self && s.includes(p)) return false;
    }
    return true;
  };

  const walk: WalkPiece[] = [];
  while (unvisited.size > 0) {
    // Pick a chain start: a segment with a free endpoint, else any segment.
    let startSeg: Segment | undefined;
    let startFrom: Point | undefined;
    for (const seg of unvisited) {
      if (isFreeEndpoint(seg.p1, seg)) {
        startSeg = seg;
        startFrom = seg.p1;
        break;
      }
      if (isFreeEndpoint(seg.p2, seg)) {
        startSeg = seg;
        startFrom = seg.p2;
        break;
      }
    }
    if (!startSeg || !startFrom) {
      startSeg = unvisited.values().next().value!;
      startFrom = startSeg.p1;
    }
    unvisited.delete(startSeg);

    let currentEnd = startSeg.p1.equals(startFrom) ? startSeg.p2 : startSeg.p1;
    walk.push({
      start: startFrom,
      end: currentEnd,
      length: startSeg.length(),
    });

    // Extend the chain with an unvisited segment sharing the current end.
    let extended = true;
    while (extended) {
      extended = false;
      for (const seg of [...unvisited]) {
        if (seg.p1.equals(currentEnd)) {
          unvisited.delete(seg);
          walk.push({ start: seg.p1, end: seg.p2, length: seg.length() });
          currentEnd = seg.p2;
          extended = true;
          break;
        }
        if (seg.p2.equals(currentEnd)) {
          unvisited.delete(seg);
          walk.push({ start: seg.p2, end: seg.p1, length: seg.length() });
          currentEnd = seg.p1;
          extended = true;
          break;
        }
      }
    }
  }
  return walk;
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

  const byName = new Map<string, Segment[]>();
  for (const seg of segments) {
    if (!seg.name) continue;
    const group = byName.get(seg.name) ?? [];
    group.push(seg);
    byName.set(seg.name, group);
  }

  const labels: StreetLabelPlacement[] = [];
  for (const [name, group] of byName) {
    for (const component of buildStreetComponents(group)) {
      const walk = orderStreetWalk(component);
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
