import { Point } from '../primitives/point.js';
import { subtract, normalize, dot, add, scale, distance } from '../utils.js';
import type { OsmMarkingPlacement } from './osm.js';

/** Signals within this world-pixel radius are treated as one intersection. */
export const SIGNAL_CLUSTER_RADIUS_PX = 400;

/** Node-marking kinds derived from OSM node `highway=*` tags. */
export type MarkingKind = 'light' | 'crossing' | 'stop' | 'yield';

/** A road node adjacent to a tagged node, with its one-way approach flag. */
export interface MarkNeighbor {
  point: Point; // Adjacent road node (on the centreline).
  approach: boolean; // True when oncoming traffic flows from here into node.
  degree: number; // Connectivity of the neighbour (higher = junction side).
}

/** Per-node accumulator gathered across every incident way. */
export interface MarkAccumulator {
  center: Point;
  kind: MarkingKind;
  neighbors: MarkNeighbor[];
  lanes: number;
  directedApproach?: Point; // Upstream side from `traffic_signals:direction`.
  directedInterior: boolean; // Whether that assignment came from a through node.
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
export function placeApproachMarking(
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
  // Store the canonical travel direction (into the junction) — bestUnit itself
  // points upstream, which is only used for the stop-line slide above.
  return {
    center: placed,
    directionVector: normalize(new Point(-bestUnit.x, -bestUnit.y)),
    width,
  };
}

/**
 * Resolves the facing for a DIRECTIONAL painted marking (stop / give-way) whose
 * text must read for the approaching driver. Returns a unit vector pointing
 * back toward the oncoming traffic (the caller negates this to get the
 * canonical travel direction, into the junction). Priority:
 *   1. `directedApproach` — the node's `direction` tag.
 *   2. The single one-way approach neighbour (the upstream side) when the road
 *      is one-way (exactly one approach side, at least one non-approach side).
 *   3. Two-way road: face AWAY from the junction — the driver approaches the
 *      more-connected node, so orient toward the neighbour most opposite to the
 *      highest-`degree` (junction) neighbour.
 *   4. `throughAxis` — no junction cue (e.g. mid-block); sign not resolvable.
 * Returns `undefined` when no usable direction exists.
 */
export function approachFacingDir(entry: MarkAccumulator): Point | undefined {
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
export function throughAxis(
  center: Point,
  neighbors: Point[],
): Point | undefined {
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
