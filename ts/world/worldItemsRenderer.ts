import { Point } from '../math/primitives/point.js';
import { drawPolygon } from '../rendering/polygonRenderer.js';
import type { Building } from './items/building.js';
import type { Tree } from './items/tree.js';

/** Options for a single {@link WorldItemsRenderer.draw} pass. */
export interface WorldItemsDrawOptions {
  buildings: Building[];
  trees: Tree[];
  viewPoint: Point;
  renderRadius: number;
  /** Draw cheap flat outlines (inspection on big maps) instead of/around 3D. */
  showItemBases: boolean;
  showBuildings: boolean;
  showTrees: boolean;
}

/**
 * Renders a {@link World}'s decorative items — flat placeholder outlines and
 * the distance-sorted pseudo-3D buildings/trees. Extracted from `World.draw()`
 * following the `WorldSignageRenderer`/`WorldBridgeRenderer` collaborator
 * pattern (constructed once by `World`, receives explicit params, never calls
 * back into `World`).
 */
export class WorldItemsRenderer {
  draw(ctx: CanvasRenderingContext2D, opts: WorldItemsDrawOptions): void {
    const {
      buildings,
      trees,
      viewPoint,
      renderRadius,
      showItemBases,
      showBuildings,
      showTrees,
    } = opts;

    // Flat item placeholders (cheap outlines) for inspection on big maps.
    if (showItemBases) {
      for (const building of buildings) {
        drawPolygon(ctx, building.base, {
          fill: 'rgba(150,150,150,0.25)',
          stroke: 'rgba(0,0,0,0.35)',
          lineWidth: 2,
        });
      }
      for (const tree of trees) {
        drawPolygon(ctx, tree.base, {
          fill: 'rgba(30,150,70,0.2)',
          stroke: 'rgba(0,90,40,0.5)',
          lineWidth: 2,
        });
      }
    }

    // Rendered pseudo-3D buildings and trees (distance-sorted, painter's order).
    // Culls/sorts by the cached footprint centroid (O(1) per item) instead of
    // `Polygon.distanceToPoint` (O(edges) — up to 32 per tree canopy), which
    // dominated frame time when scanning every building/tree in a big OSM city.
    const renderBuildings = showBuildings ? buildings : [];
    const renderTrees = showTrees ? trees : [];
    if (!renderBuildings.length && !renderTrees.length) return;

    const renderRadiusSq = renderRadius * renderRadius;
    const distSq = (center: Point): number => {
      const dx = center.x - viewPoint.x;
      const dy = center.y - viewPoint.y;
      return dx * dx + dy * dy;
    };
    const items = [...renderBuildings, ...renderTrees].filter(
      (i) => distSq(i.center) < renderRadiusSq,
    );
    items.sort((a, b) => distSq(b.center) - distSq(a.center));
    for (const item of items) {
      item.draw(ctx, { viewPoint });
    }
  }
}
