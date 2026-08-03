/**
 * A tiny stroke font for painting road words (STOP / YIELD) flat on the ground
 * in the 3D camera view. Each glyph is a set of polylines defined in a unit
 * cell — x runs 0..1 across the road, y runs 0..1 along the road (travel
 * direction). Strokes are rendered as thin flat quads via {@link segmentToFlatQuad}.
 */
import { Point } from '../math/primitives/point.js';
import { Polygon } from '../math/primitives/polygon.js';
import { normalize, perpendicular, add, scale } from '../math/utils.js';
import { segmentToFlatQuad } from './extrusion.js';

type Glyph = number[][][]; // array of polylines; each polyline is [x, y] pairs

const GLYPHS: Record<string, Glyph> = {
  S: [
    [
      [1, 1],
      [0, 1],
      [0, 0.5],
      [1, 0.5],
      [1, 0],
      [0, 0],
    ],
  ],
  T: [
    [
      [0, 1],
      [1, 1],
    ],
    [
      [0.5, 1],
      [0.5, 0],
    ],
  ],
  O: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
  P: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0.5],
      [0, 0.5],
    ],
  ],
  Y: [
    [
      [0, 1],
      [0.5, 0.5],
      [1, 1],
    ],
    [
      [0.5, 0.5],
      [0.5, 0],
    ],
  ],
  I: [
    [
      [0.5, 1],
      [0.5, 0],
    ],
  ],
  E: [
    [
      [1, 1],
      [0, 1],
      [0, 0],
      [1, 0],
    ],
    [
      [0, 0.5],
      [0.7, 0.5],
    ],
  ],
  L: [
    [
      [0, 1],
      [0, 0],
      [1, 0],
    ],
  ],
  D: [
    [
      [0, 0],
      [0, 1],
      [0.6, 1],
      [1, 0.65],
      [1, 0.35],
      [0.6, 0],
      [0, 0],
    ],
  ],
};

/**
 * Builds the flat stroke quads for `text`, centred on `center` and running
 * ACROSS the road so it reads horizontally for the approaching driver. Letters
 * advance along the across-road axis (perpendicular to `alongDir`) and stand
 * upright along `alongDir`. `totalWidth` is the full word width across the road,
 * `letterHeight` the glyph height along the road. Unknown characters are skipped.
 */
export function textStrokeQuads(
  text: string,
  center: Point,
  alongDir: Point,
  totalWidth: number,
  letterHeight: number,
  strokeWidth: number,
  z: number = -1,
): Polygon[] {
  const up = normalize(alongDir); // letter vertical (along the road)
  const across = perpendicular(up); // letters advance across the road
  const n = text.length;
  if (n === 0) return [];
  const gapRatio = 0.3;
  const letterW = totalWidth / (n + gapRatio * (n - 1));
  const gap = gapRatio * letterW;
  const quads: Polygon[] = [];

  for (let j = 0; j < n; j++) {
    const glyph = GLYPHS[text[j].toUpperCase()];
    if (!glyph) continue;
    const startAcross = -totalWidth / 2 + j * (letterW + gap);
    const place = (gx: number, gy: number): Point => {
      const a = startAcross + gx * letterW; // across the road
      const u = (gy - 0.5) * letterHeight; // along the road (centred)
      return add(add(center, scale(across, a)), scale(up, u));
    };
    for (const polyline of glyph) {
      for (let i = 0; i + 1 < polyline.length; i++) {
        const p1 = place(polyline[i][0], polyline[i][1]);
        const p2 = place(polyline[i + 1][0], polyline[i + 1][1]);
        const quad = segmentToFlatQuad(p1, p2, strokeWidth, z);
        if (quad) quads.push(quad);
      }
    }
  }
  return quads;
}
