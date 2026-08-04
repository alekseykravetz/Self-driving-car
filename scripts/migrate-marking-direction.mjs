#!/usr/bin/env node
/**
 * migrate-marking-direction.mjs — migrates `.world` files to the canonical
 * marking-direction convention (save version 2 -> 3) in place, backing up
 * each original alongside.
 *
 * Canonical rule: `Marking.directionVector` is the real travel/facing
 * direction (see tasks/marking-direction-canonical.md). Legacy (< v3) saves
 * stored the opposite direction, so for every marking in `markings[]`:
 *   1. negate `directionVector`
 *   2. if `anchor` is present, recompute `anchor.flipped` from the negated
 *      direction vs. the anchored segment (p1 -> p2)
 *   3. set the file's `version` to 3
 *
 * Idempotent: files already at version 3 are skipped.
 *
 * Usage:
 *   node scripts/migrate-marking-direction.mjs [--dir <dir>] [--dry]
 * Defaults to `saves` and `store/world`. Originals are backed up to
 * <dir>/_predir_backup/. `saves/*-osm-data.json` files are raw OSM (not
 * `.world`) and are skipped — they re-import through the fixed pipeline.
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

function normalize(v) {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function migrateMarking(m) {
  const negated = {
    x: -m.directionVector.x,
    y: -m.directionVector.y,
    z: m.directionVector.z ?? 0,
  };
  m.directionVector = negated;
  if (m.anchor) {
    const segDir = normalize({
      x: m.anchor.p2.x - m.anchor.p1.x,
      y: m.anchor.p2.y - m.anchor.p1.y,
    });
    m.anchor.flipped = dot(negated, segDir) < 0;
  }
}

function migrate(world) {
  let migratedCount = 0;
  for (const m of world.markings ?? []) {
    migrateMarking(m);
    migratedCount++;
  }
  world.version = 3;
  return migratedCount;
}

function migrateDir(dir, dry) {
  if (!existsSync(dir)) {
    console.log(`  (skip, not found): ${dir}`);
    return { migrated: 0, skipped: 0 };
  }

  const backupDir = join(dir, '_predir_backup');
  const files = readdirSync(dir).filter((f) => f.endsWith('.world'));

  let migrated = 0;
  let skipped = 0;

  console.log(`\n${dir}:`);
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

    if (world.version === 3) {
      skipped++;
      console.log(`  skip (already v3): ${file}`);
      continue;
    }

    const markingCount = migrate(world);
    const out = JSON.stringify(world);

    console.log(`  ${file}: ${markingCount} markings migrated`);

    if (!dry) {
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
      const backupPath = join(backupDir, basename(file) + '.predir.bak');
      if (!existsSync(backupPath)) writeFileSync(backupPath, raw);
      writeFileSync(path, out);
    }
    migrated++;
  }

  return { migrated, skipped };
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const dirIdx = args.indexOf('--dir');
  const relDirs = dirIdx >= 0 ? [args[dirIdx + 1]] : ['saves', 'store/world'];

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const relDir of relDirs) {
    const dir = join(repoRoot, relDir);
    const { migrated, skipped } = migrateDir(dir, dry);
    totalMigrated += migrated;
    totalSkipped += skipped;
  }

  console.log(
    `\n${dry ? '[dry run] ' : ''}Done. Migrated ${totalMigrated} file(s), skipped ${totalSkipped}.`,
  );
}

main();
