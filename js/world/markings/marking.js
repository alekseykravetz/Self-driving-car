import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { Envelope } from '../../math/primitives/envelope.js';
import {
  translate,
  angle,
  lerp2D,
  perpendicular,
  dot,
  subtract,
  scale,
  add,
  getNearestSegment,
} from '../../math/utils.js';
import { drawPolygon } from '../../rendering/polygonRenderer.js';
/** Finds the graph segment matching a saved anchor (same endpoint order). */
function findAnchorSegment(graph, anchor) {
  return graph.segments.find(
    (s) => s.p1.equals(anchor.p1) && s.p2.equals(anchor.p2),
  );
}
export class Marking {
  // Core properties defining the marking
  center;
  directionVector;
  width;
  height; // Height used for the support segment length
  // Generated geometry
  support; // The centerline segment
  polygon; // The bounding polygon
  // Graph-relative anchor (serialized). Absent on legacy saves.
  anchor;
  // Live reference to the anchored graph segment (NOT serialized: # private).
  #anchorSegment;
  // Type identifier - subclasses should override this
  type = 'marking'; // Allow known types or other strings
  /**
   * Base class for road markings.
   * @param center The center point of the marking.
   * @param directionVector A vector indicating the marking's orientation along the road.
   * @param width The width of the marking (usually related to road width).
   * @param height The length of the marking along the road direction.
   */
  constructor(center, directionVector, width, height) {
    this.center = center;
    this.directionVector = directionVector;
    this.width = width;
    this.height = height;
    this.support = new Segment(
      translate(this.center, angle(this.directionVector), this.height / 2),
      translate(this.center, angle(this.directionVector), -this.height / 2),
    );
    this.polygon = new Envelope(this.support, this.width, 0).polygon;
  }
  /**
   * Computes and stores a graph-relative anchor from the marking's current
   * position, binding it to the nearest graph segment. Called when a marking is
   * placed in the editor so it can later follow road edits.
   */
  setAnchor(graph) {
    const seg = getNearestSegment(this.center, graph.segments);
    if (!seg) return;
    this.#anchorSegment = seg;
    const proj = seg.projectPoint(this.center);
    const offset = Math.max(0, Math.min(1, proj.offset));
    const along = lerp2D(seg.p1, seg.p2, offset);
    const normal = perpendicular(seg.directionVector());
    const lateral = dot(subtract(this.center, along), normal);
    this.anchor = {
      p1: new Point(seg.p1.x, seg.p1.y),
      p2: new Point(seg.p2.x, seg.p2.y),
      offset,
      lateral,
    };
  }
  /**
   * Recomputes the marking's absolute position from its anchor against the
   * current graph. No-op when there is no anchor (legacy markings keep their
   * absolute position) or the anchored segment was deleted.
   */
  reanchor(graph) {
    if (!this.anchor) return;
    let seg = this.#anchorSegment;
    if (!seg || !graph.segments.includes(seg)) {
      seg = findAnchorSegment(graph, this.anchor);
      if (!seg) return; // anchored road gone — keep last absolute position
      this.#anchorSegment = seg;
    }
    const along = lerp2D(seg.p1, seg.p2, this.anchor.offset);
    const normal = perpendicular(seg.directionVector());
    this.center = add(along, scale(normal, this.anchor.lateral));
    this.directionVector = seg.directionVector();
    this.anchor.p1 = new Point(seg.p1.x, seg.p1.y);
    this.anchor.p2 = new Point(seg.p2.x, seg.p2.y);
    this.rebuildGeometry();
  }
  /**
   * Rebuilds the support segment and bounding polygon from the current
   * center/direction. Subclasses override to also refresh their derived
   * geometry (e.g. border segments).
   */
  rebuildGeometry() {
    this.support = new Segment(
      translate(this.center, angle(this.directionVector), this.height / 2),
      translate(this.center, angle(this.directionVector), -this.height / 2),
    );
    this.polygon = new Envelope(this.support, this.width, 0).polygon;
  }
  /**
   * Draws the base representation of the marking (its bounding polygon).
   * Subclasses should override this method to draw their specific visuals.
   * @param ctx The canvas rendering context.
   */
  draw(ctx) {
    drawPolygon(ctx, this.polygon);
  }
}
