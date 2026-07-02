'use strict';
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
 * Builds `count` reproducible canopy prototypes from `seed`. The same
 * (seed, count) pair always yields the same prototype set, so a world need only
 * persist those two numbers to recreate every canopy shape on load.
 */
function buildTreePrototypes(seed, count) {
  const rand = mulberry32(seed);
  const prototypes = [];
  for (let i = 0; i < count; i++) {
    const noise = [];
    for (let v = 0; v < TREE_VERTEX_COUNT; v++) {
      noise.push(lerp(0.5, 1, rand()));
    }
    prototypes.push({ noise });
  }
  return prototypes;
}

/** A neutral fallback prototype used when none is supplied. */
const DEFAULT_TREE_PROTOTYPE = buildTreePrototypes(DEFAULT_TREE_SEED, 1)[0];
/** Builds one noisy canopy level polygon from a prototype's noise profile. */
function treeLevelPolygon(center, size, noise) {
  const points = [];
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
  center;
  size; // Effective base diameter (baseline * scale)
  height;
  type; // 0 classic, 1 conifer, 2 broadleaf cluster
  scale;
  prototypeIndex;
  prototype;
  base; // Ground-level footprint (collision + camera extrusion)
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
    center,
    size,
    prototype = DEFAULT_TREE_PROTOTYPE,
    prototypeIndex = 0,
    type = 0,
    scale = 1,
    height = 200,
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
  toInstance() {
    return {
      x: Math.round(this.center.x * 10) / 10,
      y: Math.round(this.center.y * 10) / 10,
      p: this.prototypeIndex,
      s: Math.round(this.scale * 100) / 100,
      t: this.type,
    };
  }

  draw(ctx, options) {
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
  #drawClassic(ctx, viewPoint) {
    const top = getFake3dPoint(this.center, viewPoint, this.height);
    const levelCount = 7;
    const noise = this.prototype.noise;
    for (let level = 0; level < levelCount; level++) {
      const t = levelCount === 1 ? 1 : level / (levelCount - 1);
      const levelCenter = lerp2D(this.center, top, t);
      const greenComponent = Math.round(lerp(50, 200, t));
      const color = `rgb(30, ${greenComponent}, 70)`;
      const levelSize = lerp(this.size, 40, t);
      const polygon = treeLevelPolygon(levelCenter, levelSize, noise);
      polygon.draw(ctx, { fill: color, stroke: 'rgba(0,0,0,0)' });
    }
  }

  /** Type 1 — tall conifer/pine: a small trunk under stacked narrowing tiers. */
  #drawConifer(ctx, viewPoint) {
    // Trunk.
    const trunkTop = getFake3dPoint(this.center, viewPoint, this.height * 0.25);
    const trunkWidth = this.size * 0.12;
    const trunk = new Polygon([
      translate(this.center, Math.PI / 2, trunkWidth),
      translate(this.center, -Math.PI / 2, trunkWidth),
      translate(trunkTop, -Math.PI / 2, trunkWidth * 0.7),
      translate(trunkTop, Math.PI / 2, trunkWidth * 0.7),
    ]);
    trunk.draw(ctx, { fill: 'rgb(90, 60, 30)', stroke: 'rgba(0,0,0,0)' });
    // Stacked triangular tiers, darkest at the bottom.
    const tiers = 4;
    const noise = this.prototype.noise;
    for (let tier = 0; tier < tiers; tier++) {
      const baseT = 0.2 + (tier / tiers) * 0.7;
      const tipT = 0.2 + ((tier + 1.4) / tiers) * 0.7;
      const baseCenter = getFake3dPoint(
        this.center,
        viewPoint,
        this.height * baseT,
      );
      const tip = getFake3dPoint(this.center, viewPoint, this.height * tipT);
      const halfWidth = (this.size / 2) * (1 - tier / (tiers + 1));
      const jitter = 1 + (noise[tier % noise.length] - 0.75) * 0.3;
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

  /** Type 2 — broadleaf cluster: overlapping lobes forming a bushy crown. */
  #drawCluster(ctx, viewPoint) {
    const top = getFake3dPoint(this.center, viewPoint, this.height * 0.85);
    const noise = this.prototype.noise;
    const lobeCount = 4;
    const lobeRadius = this.size * 0.32;
    const lobes = [];
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
      polygon.draw(ctx, {
        fill: `rgb(70, ${olive}, 40)`,
        stroke: 'rgba(0,0,0,0)',
      });
    }
  }
}
