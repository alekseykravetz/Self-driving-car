/**
 * Building placement, extracted from world generation. Places buildings along
 * road-frontage guides derived from a chunked polygon union, then de-overlaps
 * footprints using a spatial grid so large maps stay responsive.
 */
import { Graph } from '../../math/graph/graph.js';
import { Envelope } from '../../math/primitives/envelope.js';
import { Polygon } from '../../math/primitives/polygon.js';
import { Segment } from '../../math/primitives/segment.js';
import { Building } from '../items/building.js';
import { add, scale } from '../../math/utils.js';
import { drainGenerator } from './generationProgress.js';
import { OwnerGrid } from './ownerGrid.js';
import { polygonAABB, remapGen, unionGen } from './chunkedUnion.js';
import { getSegmentEnvelopeGeometry } from './worldGenerator.js';

interface BuildingGeneratable {
  graph: Graph;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
}

/**
 * Building placement as a generator that yields a local `[0, 1]` progress
 * fraction during the expensive O(n²) footprint-collision filter, so the async
 * generator can time-slice it. Drained synchronously by {@link wgGenerateBuildings}.
 */
export function* wgGenerateBuildingsGen(
  world: BuildingGeneratable,
): Generator<number, Building[]> {
  yield 0;
  const tempEnvelopes: Envelope[] = [];
  for (const seg of world.graph.segments) {
    const segWidth = getSegmentEnvelopeGeometry(seg).width;
    tempEnvelopes.push(
      new Envelope(
        seg,
        segWidth + world.buildingWidth + world.spacing * 2,
        world.roadRoundness,
      ),
    );
  }

  // The union is the heavy "finding places" step; delegate to the chunked,
  // grid-accelerated union so it stays responsive and reports progress.
  const guides = yield* remapGen(
    unionGen(tempEnvelopes.map((e) => e.polygon)),
    0,
    0.35,
  );

  for (let i = 0; i < guides.length; i++) {
    const seg = guides[i];
    if (seg.length() < world.buildingMinLength) {
      guides.splice(i, 1);
      i--;
    }
  }

  const supports: Segment[] = [];
  for (const seg of guides) {
    const length = seg.length() + world.spacing;
    const buildingCount = Math.floor(
      length / (world.buildingMinLength + world.spacing),
    );
    const buildingLength = length / buildingCount - world.spacing;

    const direction = seg.directionVector();

    let q1 = seg.p1;
    let q2 = add(q1, scale(direction, buildingLength));
    supports.push(new Segment(q1, q2));

    for (let i = 2; i <= buildingCount; i++) {
      q1 = add(q2, scale(direction, world.spacing));
      q2 = add(q1, scale(direction, buildingLength));
      supports.push(new Segment(q1, q2));
    }
  }

  const bases: Polygon[] = [];
  for (const seg of supports) {
    bases.push(new Envelope(seg, world.buildingWidth).polygon);
  }

  // Footprint de-overlap. The original algorithm keeps a base iff no EARLIER
  // kept base overlaps it (or sits within `spacing`) — an O(n²) all-pairs scan
  // that dominated large-map generation (the "placing buildings" step). This
  // keeps the identical survivor set and order (forward greedy in original
  // index order) but uses a spatial grid so each candidate only tests nearby
  // keepers, turning O(n²) into near-linear work.
  const epsilon = 0.001;
  const total = Math.max(bases.length, 1);
  const baseBounds = bases.map(polygonAABB);
  let maxExtent = 0;
  for (const b of baseBounds) {
    maxExtent = Math.max(maxExtent, b.maxX - b.minX, b.maxY - b.minY);
  }
  const keepGrid = new OwnerGrid(Math.max(maxExtent, 1));
  // A colliding keeper's AABB lies within (candidate half-extent + spacing +
  // keeper extent) of the candidate centre; this square covers that bound.
  const queryRadius = maxExtent * 2 + world.spacing;
  const kept: Polygon[] = [];
  for (let i = 0; i < bases.length; i++) {
    const c = bases[i];
    const cb = baseBounds[i];
    const cx = (cb.minX + cb.maxX) / 2;
    const cy = (cb.minY + cb.maxY) / 2;
    let collides = false;
    for (const k of keepGrid.query(cx, cy, queryRadius)) {
      const kp = kept[k];
      if (
        kp.intersectsPolygon(c) ||
        kp.distanceToPolygon(c) < world.spacing - epsilon
      ) {
        collides = true;
        break;
      }
    }
    if (!collides) {
      keepGrid.insertBounds(cb.minX, cb.minY, cb.maxX, cb.maxY, kept.length);
      kept.push(c);
    }
    if ((i & 63) === 0) yield 0.35 + (0.65 * i) / total;
  }
  yield 1;
  return kept.map((b) => new Building(b));
}

/** Building placement (O(n²) footprint collision filter). */
export function wgGenerateBuildings(world: BuildingGeneratable): Building[] {
  return drainGenerator(wgGenerateBuildingsGen(world));
}
