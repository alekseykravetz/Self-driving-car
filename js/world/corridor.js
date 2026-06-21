'use strict';
/**
 * Removes the rounded end-cap border segments around `point`. The cap of a
 * corridor envelope is an arc whose points all sit at `radius` from the
 * skeleton endpoint, so a cap segment is one whose BOTH endpoints fall within
 * `radius` of that point. Side borders keep one endpoint further along the
 * path and are therefore preserved.
 */
function removeCorridorCap(borders, point, radius) {
  const threshold = radius + 1;
  return borders.filter((seg) => {
    const d1 = distance(seg.p1, point);
    const d2 = distance(seg.p2, point);
    return !(d1 <= threshold && d2 <= threshold);
  });
}

/**
 * A drivable path through the road network. Holds the collision `borders`
 * (outer walls) and the `skeleton` (center-line used for progress tracking and
 * mini-maps). Corridors can be authored in the world editor (saved with the
 * world) or built on the fly by the race game and training simulator.
 *
 * Open edges let several corridors join into a longer path on big maps.
 */
class Corridor {
  borders;
  skeleton;
  openStart;
  openEnd;
  constructor(skeleton, borders, openStart = false, openEnd = false) {
    this.skeleton = skeleton;
    this.borders = borders;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }

  /**
   * Builds a corridor's borders from a center-line `skeleton` by unioning road
   * envelopes along it, then optionally opening the start/end caps.
   */
  static fromPath(skeleton, roadWidth, roadRoundness, options = {}) {
    const { openStart = false, openEnd = false, extendEnd = false } = options;
    const envSegments = [...skeleton];
    if (extendEnd && envSegments.length > 0) {
      const lastSeg = envSegments[envSegments.length - 1];
      const lastSegDir = lastSeg.directionVector();
      envSegments.push(
        new Segment(
          lastSeg.p2,
          add(lastSeg.p2, scale(lastSegDir, roadWidth * 2)),
        ),
      );
    }
    const tempEnvelopes = envSegments.map(
      (s) => new Envelope(s, roadWidth, roadRoundness),
    );
    let borders = Polygon.union(tempEnvelopes.map((e) => e.polygon));
    if (skeleton.length > 0) {
      const radius = roadWidth / 2;
      if (openStart) {
        borders = removeCorridorCap(borders, skeleton[0].p1, radius);
      }
      if (openEnd) {
        borders = removeCorridorCap(
          borders,
          skeleton[skeleton.length - 1].p2,
          radius,
        );
      }
    }
    return new Corridor([...skeleton], borders, openStart, openEnd);
  }

  /** Reconstructs a corridor from its saved (plain-object) form. */
  static load(info) {
    const skeleton = info.skeleton.map(
      (s) => new Segment(new Point(s.p1.x, s.p1.y), new Point(s.p2.x, s.p2.y)),
    );
    const borders = info.borders.map(
      (s) => new Segment(new Point(s.p1.x, s.p1.y), new Point(s.p2.x, s.p2.y)),
    );
    return new Corridor(
      skeleton,
      borders,
      info.openStart ?? false,
      info.openEnd ?? false,
    );
  }

  /** Draws the corridor walls. Single source of truth for corridor styling. */
  draw(ctx, options = {}) {
    const { color = 'red', width = 4 } = options;
    for (const seg of this.borders) {
      seg.draw(ctx, { color, width });
    }
  }
}
