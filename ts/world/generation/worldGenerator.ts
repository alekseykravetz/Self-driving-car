/**
 * Procedural world geometry generation, extracted from the World class so the
 * World stays a data + draw + load container. All heavy generation lives here.
 *
 * Split-generation policy: road borders, lane guides and separator borders are
 * always (re)generated because they are cheap and needed for marking placement
 * and collisions even on big maps. Buildings and trees are gated behind the
 * `generateBuildings` flag (the editor's "Generate" checkbox) since they are
 * the expensive part to compute and draw.
 */

interface WorldGeneratable {
  graph: Graph;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;
  envelopes: Envelope[];
  roadBorders: Segment[];
  separatorBorders: Segment[];
  laneGuides: Segment[];
  buildings: Building[];
  trees: Tree[];
  markings: Marking[];
}

/** Center-lane guidance lines (half-width envelope union) for marking placement. */
function wgGenerateLaneGuides(
  graph: Graph,
  roadWidth: number,
  roadRoundness: number,
): Segment[] {
  const tempEnvelopes: Envelope[] = [];
  for (const segment of graph.segments) {
    tempEnvelopes.push(new Envelope(segment, roadWidth / 2, roadRoundness));
  }
  return Polygon.union(tempEnvelopes.map((envelope) => envelope.polygon));
}

/**
 * Collision lines for two-way roads flagged as hard-separated. Each separated
 * (non-one-way) segment contributes its center line as a wall so cars cannot
 * cross to the opposing side.
 */
function wgGenerateSeparatorBorders(graph: Graph): Segment[] {
  const borders: Segment[] = [];
  for (const segment of graph.segments) {
    if (segment.separated && !segment.oneWay) {
      borders.push(
        new Segment(
          new Point(segment.p1.x, segment.p1.y),
          new Point(segment.p2.x, segment.p2.y),
        ),
      );
    }
  }
  return borders;
}

function wgGenerateBuildings(world: WorldGeneratable): Building[] {
  const tempEnvelopes: Envelope[] = [];
  for (const seg of world.graph.segments) {
    tempEnvelopes.push(
      new Envelope(
        seg,
        world.roadWidth + world.buildingWidth + world.spacing * 2,
        world.roadRoundness,
      ),
    );
  }

  const guides = Polygon.union(tempEnvelopes.map((e) => e.polygon));

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

  const epsilon = 0.001;
  for (let i = 0; i < bases.length - 1; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      if (
        bases[i].intersectsPolygon(bases[j]) ||
        bases[i].distanceToPolygon(bases[j]) < world.spacing - epsilon
      ) {
        bases.splice(j, 1);
        j--;
      }
    }
  }
  return bases.map((b) => new Building(b));
}

function wgGenerateTrees(world: WorldGeneratable): Tree[] {
  const points = [
    ...world.roadBorders.map((s) => [s.p1, s.p2]).flat(),
    ...world.buildings.map((b) => b.base.points).flat(),
  ];
  const left = Math.min(...points.map((p) => p.x));
  const right = Math.max(...points.map((p) => p.x));
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));

  const illegalPolygons = [
    ...world.buildings.map((b) => b.base),
    ...world.envelopes.map((e) => e.polygon),
  ];

  const trees: Tree[] = [];
  let tryCount = 0;
  while (tryCount < 100) {
    const p = new Point(
      lerp(left, right, Math.random()),
      lerp(bottom, top, Math.random()),
    );

    // check if tree inside or nearby building / road
    let keep = true;
    for (const poly of illegalPolygons) {
      if (
        poly.containsPoint(p) ||
        poly.distanceToPoint(p) < world.treeSize / 2
      ) {
        keep = false;
        break;
      }
    }

    // check if tree too close to other trees
    if (keep) {
      for (const tree of trees) {
        if (distance(tree.center, p) < world.treeSize) {
          keep = false;
          break;
        }
      }
    }

    // avoiding trees in the middle of nowhere
    if (keep) {
      let closeToSomething = false;
      for (const poly of illegalPolygons) {
        if (poly.distanceToPoint(p) < world.treeSize * 2) {
          closeToSomething = true;
          break;
        }
      }
      keep = closeToSomething;
    }

    if (keep) {
      trees.push(new Tree(p, world.treeSize));
      tryCount = 0;
    }
    tryCount++;
  }
  return trees;
}

class WorldGenerator {
  /**
   * (Re)generates world geometry in place. Always rebuilds envelopes, road
   * borders, lane guides and separator borders; rebuilds buildings and trees
   * only when `generateBuildings` is true. Markings are re-anchored to the
   * (possibly edited) graph afterwards.
   */
  static generate(
    world: WorldGeneratable,
    generateBuildings: boolean = true,
  ): void {
    world.envelopes.length = 0;
    world.laneGuides.length = 0;
    world.roadBorders.length = 0;
    world.separatorBorders.length = 0;
    world.buildings = [];
    world.trees = [];

    for (const segment of world.graph.segments) {
      world.envelopes.push(
        new Envelope(segment, world.roadWidth, world.roadRoundness),
      );
    }

    // Cheap geometry — always generated (needed for markings + collisions).
    const roadPolygons = world.envelopes.map((envelope) => envelope.polygon);
    world.roadBorders.push(...Polygon.union(roadPolygons));
    world.laneGuides.push(
      ...wgGenerateLaneGuides(
        world.graph,
        world.roadWidth,
        world.roadRoundness,
      ),
    );
    world.separatorBorders.push(...wgGenerateSeparatorBorders(world.graph));

    // Expensive geometry — gated behind the generation flag.
    if (generateBuildings) {
      world.buildings = wgGenerateBuildings(world);
      world.trees = wgGenerateTrees(world);
    }

    // Keep markings attached to the roads after graph edits.
    for (const marking of world.markings) {
      marking.reanchor(world.graph);
    }
  }
}
