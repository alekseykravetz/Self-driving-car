#!/usr/bin/env node
/**
 * migrate-worlds.mjs — converts legacy (v1) `.world` files to the lean v2
 * schema in place, backing up each original alongside.
 *
 * v1 → v2:
 *   - drops derived geometry: envelopes, roadBorders, laneGuides,
 *     separatorBorders, trafficManager, cars, bestCar
 *   - converts each baked tree (center + full canopy polygon) into a compact
 *     instance `{ x, y, p, s, t }` referencing a reproducible prototype set
 *   - converts each building (polygon + redundant segments) into a footprint
 *     `{ poly, h }`
 *   - keeps must-have data: graph, params, markings, corridors, viewport
 *
 * Tree canopy shapes become prototype-based, so exact silhouettes differ
 * slightly from the baked originals; positions and counts are preserved.
 *
 * Usage:
 *   node scripts/migrate-worlds.mjs [--dir <dir>] [--dry]
 * Defaults to store/world. Originals are backed up to <dir>/_v1_backup/.
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const TREE_SEED = 123456;
const TREE_PROTOTYPE_COUNT = 8;

/** Deterministic seeded PRNG (mirrors ts/math/utils.ts mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

function isV2(world) {
  return world.version === 2 || !!world.decoration;
}

function toCorridors(world) {
  if (Array.isArray(world.corridors)) return world.corridors;
  if (world.corridor) return [world.corridor];
  return [];
}

function migrate(world) {
  const rand = mulberry32((TREE_SEED ^ 0x9e3779b9) >>> 0);

  const trees = (world.trees ?? []).map((t) => {
    const p = Math.floor(rand() * TREE_PROTOTYPE_COUNT);
    const type = rand() < 0.6 ? 0 : rand() < 0.5 ? 1 : 2;
    const scale = lerp(0.8, 1.2, rand());
    return { x: r1(t.center.x), y: r1(t.center.y), p, s: r2(scale), t: type };
  });

  const buildings = (world.buildings ?? []).map((b) => ({
    poly: b.base.points.map((pt) => [r1(pt.x), r1(pt.y)]),
    h: b.height ?? 200,
  }));

  return {
    version: 2,
    graph: world.graph,
    roadWidth: world.roadWidth,
    roadRoundness: world.roadRoundness,
    buildingWidth: world.buildingWidth,
    buildingMinLength: world.buildingMinLength,
    spacing: world.spacing,
    treeSize: world.treeSize,
    markings: world.markings ?? [],
    corridors: toCorridors(world),
    zoom: world.zoom,
    offset: world.offset,
    decoration: {
      treeSeed: TREE_SEED,
      treePrototypeCount: TREE_PROTOTYPE_COUNT,
      trees,
      buildings,
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const dirIdx = args.indexOf('--dir');
  const relDir = dirIdx >= 0 ? args[dirIdx + 1] : 'store/world';
  const dir = join(repoRoot, relDir);

  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const backupDir = join(dir, '_v1_backup');
  const files = readdirSync(dir).filter((f) => f.endsWith('.world'));

  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const path = join(dir, file);
    const raw = readFileSync(path, 'utf8');
    let world;
    try {
      world = JSON.parse(raw);
    } catch {
      console.warn(`  skip (invalid JSON): ${file}`);
      continue;
    }

    if (isV2(world)) {
      skipped++;
      console.log(`  skip (already v2): ${file}`);
      continue;
    }

    const v2 = migrate(world);
    const before = Buffer.byteLength(raw, 'utf8');
    const out = JSON.stringify(v2);
    const after = Buffer.byteLength(out, 'utf8');
    const pct = ((1 - after / before) * 100).toFixed(1);

    console.log(
      `  ${file}: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB (-${pct}%), ` +
        `${v2.decoration.trees.length} trees, ${v2.decoration.buildings.length} buildings`,
    );

    if (!dry) {
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
      const backupPath = join(backupDir, basename(file) + '.v1.bak');
      if (!existsSync(backupPath)) writeFileSync(backupPath, raw);
      writeFileSync(path, out);
    }
    migrated++;
  }

  console.log(
    `\n${dry ? '[dry run] ' : ''}Done. Migrated ${migrated}, skipped ${skipped}.` +
      (dry ? '' : `\nBackups in ${join(relDir, '_v1_backup')}.`),
  );
}

main();
