/**
 * A tree decoration item. Instead of baking a full canopy polygon per tree, a
 * Tree references a small reproducible {@link TreePrototype} (a per-vertex noise
 * profile generated once from a seed) plus a lightweight per-instance position,
 * variant (prototype index), render type and scale. This keeps saved worlds tiny
 * — a tree instance serializes to `{ x, y, p, s, t }` (see {@link Tree.toInstance}).
 */

/** Number of vertices in a canopy level / footprint polygon. */
const TREE_VERTEX_COUNT = 32;

/** Default seed + prototype count used when a world does not specify its own. */
const DEFAULT_TREE_SEED = 123456;
const DEFAULT_TREE_PROTOTYPE_COUNT = 8;

/**
 * Reproducible canopy shape. `noise` holds one radius multiplier in [0.5, 1]
 * per canopy vertex; the same profile is reused for every instance that
 * references this prototype so their silhouettes match.
 */
interface TreePrototype {
  noise: number[];
}

/** A compact, serialized tree instance stored in a world's decoration block. */
interface TreeInstance {
  x: number;
  y: number;
  /** Prototype/variant index into the world's prototype set. */
  p: number;
  /** Per-instance scale multiplier. */
  s: number;
  /** Render type: 0 = classic, 1 = conifer, 2 = broadleaf cluster. */
  t: number;
}

/**
 * Builds `count` reproducible canopy prototypes from `seed`. The same
 * (seed, count) pair always yields the same prototype set, so a world need only
 * persist those two numbers to recreate every canopy shape on load.
 */
function buildTreePrototypes(seed: number, count: number): TreePrototype[] {
  const rand = mulberry32(seed);
  const prototypes: TreePrototype[] = [];
  for (let i = 0; i < count; i++) {
    const noise: number[] = [];
    for (let v = 0; v < TREE_VERTEX_COUNT; v++) {
      noise.push(lerp(0.5, 1, rand()));
    }
    prototypes.push({ noise });
  }
  return prototypes;
}

/** A neutral fallback prototype used when none is supplied. */
const DEFAULT_TREE_PROTOTYPE: TreePrototype = buildTreePrototypes(
  DEFAULT_TREE_SEED,
  1,
)[0];

/** Builds one noisy canopy level polygon from a prototype's noise profile. */
function treeLevelPolygon(
  center: Point,
  size: number,
  noise: number[],
): Polygon {
  const points: Point[] = [];
  const radius = size / 2;
  const step = (Math.PI * 2) / TREE_VERTEX_COUNT;
  for (let i = 0; i < TREE_VERTEX_COUNT; i++) {
    const angle = i * step;
    const noisyRadius = radius * (noise[i % noise.length] ?? 0.75);
    points.push(translate(center, angle, noisyRadius));
  }
  return new Polygon(points);
}

class Tree {
  readonly center: Point;
  readonly size: number; // Effective base diameter (baseline * scale)
  readonly height: number;
  readonly type: number; // 0 classic, 1 conifer, 2 broadleaf cluster
  readonly scale: number;
  readonly prototypeIndex: number;
  readonly prototype: TreePrototype;
  readonly base: Polygon; // Ground-level footprint (collision + camera extrusion)

  /**
   * @param center Ground position of the tree base.
   * @param size Baseline diameter (the world's `treeSize`). Effective size is
   *   `size * scale`.
   * @param prototype Reproducible canopy shape (defaults to a neutral one).
   * @param prototypeIndex Index of `prototype` in the world's prototype set.
   * @param type Render style: 0 classic, 1 conifer, 2 broadleaf cluster.
   * @param scale Per-instance scale multiplier.
   * @param height Approximate tree height. Defaults to 200.
   */
  constructor(
    center: Point,
    size: number,
    prototype: TreePrototype = DEFAULT_TREE_PROTOTYPE,
    prototypeIndex: number = 0,
    type: number = 0,
    scale: number = 1,
    height: number = 200,
  ) {
    this.center = center;
    this.scale = scale;
    this.size = size * scale;
    this.height = height;
    this.type = type;
    this.prototypeIndex = prototypeIndex;
    this.prototype = prototype;

    this.base = treeLevelPolygon(this.center, this.size, this.prototype.noise);
  }

  /** Serializes to the compact instance form stored in world files. */
  toInstance(): TreeInstance {
    return {
      x: Math.round(this.center.x * 10) / 10,
      y: Math.round(this.center.y * 10) / 10,
      p: this.prototypeIndex,
      s: Math.round(this.scale * 100) / 100,
      t: this.type,
    };
  }

  draw(ctx: CanvasRenderingContext2D, options: TreeDrawOptions): void {
    const { viewPoint } = options;
    switch (this.type) {
      case 1:
        this.#drawConifer(ctx, viewPoint);
        break;
      case 2:
        this.#drawCluster(ctx, viewPoint);
        break;
      default:
        this.#drawClassic(ctx, viewPoint);
        break;
    }
  }

  /** Type 0 — classic stacked noisy round canopy. */
  #drawClassic(ctx: CanvasRenderingContext2D, viewPoint: Point): void {
    const top = getFake3dPoint(this.center, viewPoint, this.height);
    const levelCount: number = 7;
    const noise = this.prototype.noise;

    for (let level = 0; level < levelCount; level++) {
      const t = levelCount === 1 ? 1 : level / (levelCount - 1);
      const levelCenter = lerp2D(this.center, top, t);
      const greenComponent = Math.round(lerp(50, 200, t));
      const color = `rgb(30, ${greenComponent}, 70)`;
      const levelSize = lerp(this.size, 40, t);
      const polygon = treeLevelPolygon(levelCenter, levelSize, noise);
      drawPolygon(ctx, polygon, { fill: color, stroke: 'rgba(0,0,0,0)' });
    }
  }

  /** Type 1 — tall conifer/pine: a trunk under stacked narrowing tiers. */
  #drawConifer(ctx: CanvasRenderingContext2D, viewPoint: Point): void {
    // Trunk.
    const trunkTop = getFake3dPoint(this.center, viewPoint, this.height * 0.4);
    const trunkWidth = this.size * 0.22;
    const trunk = new Polygon([
      translate(this.center, Math.PI / 2, trunkWidth),
      translate(this.center, -Math.PI / 2, trunkWidth),
      translate(trunkTop, -Math.PI / 2, trunkWidth * 0.6),
      translate(trunkTop, Math.PI / 2, trunkWidth * 0.6),
    ]);
    drawPolygon(ctx, trunk, {
      fill: 'rgb(90, 60, 30)',
      stroke: 'rgba(0,0,0,0)',
    });

    // Stacked triangular tiers, darkest at the bottom.
    const tiers = 4;
    const noise = this.prototype.noise;
    for (let tier = 0; tier < tiers; tier++) {
      const baseT = 0.15 + (tier / tiers) * 0.75;
      const tipT = 0.15 + ((tier + 1.4) / tiers) * 0.75;
      const baseCenter = getFake3dPoint(
        this.center,
        viewPoint,
        this.height * baseT,
      );
      const tip = getFake3dPoint(this.center, viewPoint, this.height * tipT);
      const halfWidth = (this.size / 2) * (1 - tier / (tiers + 1)) * 1.3;
      const jitter = 1 + (noise[tier % noise.length] - 0.75) * 0.35;
      const green = Math.round(lerp(70, 130, tier / tiers));
      ctx.fillStyle = `rgb(20, ${green}, 45)`;
      ctx.beginPath();
      ctx.moveTo(baseCenter.x - halfWidth * jitter, baseCenter.y);
      ctx.lineTo(baseCenter.x + halfWidth * jitter, baseCenter.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Type 2 — broadleaf cluster: trunk with overlapping lobes forming a bushy crown. */
  #drawCluster(ctx: CanvasRenderingContext2D, viewPoint: Point): void {
    const noise = this.prototype.noise;

    // Trunk.
    const trunkTop = getFake3dPoint(this.center, viewPoint, this.height * 0.55);
    const trunkWidth = this.size * 0.2;
    const trunk = new Polygon([
      translate(this.center, Math.PI / 2, trunkWidth),
      translate(this.center, -Math.PI / 2, trunkWidth),
      translate(trunkTop, -Math.PI / 2, trunkWidth * 0.6),
      translate(trunkTop, Math.PI / 2, trunkWidth * 0.6),
    ]);
    drawPolygon(ctx, trunk, {
      fill: 'rgb(90, 60, 30)',
      stroke: 'rgba(0,0,0,0)',
    });

    // Canopy lobes.
    const top = getFake3dPoint(this.center, viewPoint, this.height * 0.85);
    const lobeCount = 4;
    const lobeRadius = this.size * 0.32;

    const lobes: { center: Point; radius: number; t: number }[] = [];
    for (let i = 0; i < lobeCount; i++) {
      const angle = (i / lobeCount) * Math.PI * 2;
      const spread = this.size * 0.18 * noise[i % noise.length];
      const lobeCenter = translate(top, angle, spread);
      lobes.push({
        center: lobeCenter,
        radius: lobeRadius * (0.8 + 0.4 * noise[(i + 3) % noise.length]),
        t: i / lobeCount,
      });
    }
    // Central lobe on top.
    lobes.push({ center: top, radius: lobeRadius * 1.1, t: 1 });

    for (const lobe of lobes) {
      const olive = Math.round(lerp(120, 170, lobe.t));
      const polygon = treeLevelPolygon(lobe.center, lobe.radius * 2, noise);
      drawPolygon(ctx, polygon, {
        fill: `rgb(70, ${olive}, 40)`,
        stroke: 'rgba(0,0,0,0)',
      });
    }
  }
}
