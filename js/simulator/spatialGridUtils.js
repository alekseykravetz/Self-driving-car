import { BODY_MARGIN_RATIO } from '../car/config.js';
/**
 * Shared spatial-grid utilities used by TrainingSimulator, TrafficSimulator,
 * and RaceSimulator.
 *
 * Encapsulates the repeated "query nearby borders within sensor range"
 * pattern so each simulator only manages its own grid instance and delegates
 * the math to these functions.
 *
 * Simple mode does NOT use the grid — it has only 2 borders spanning
 * ±1,000,000 px which would rasterize into millions of grid cells. It passes
 * roadBorders directly.
 */
/**
 * Extracts all road-border segments from an IWorld as GridSegment pairs.
 * Aggregates roadBorders, separatorBorders, and corridor borders.
 */
export function buildRoadBorders(world) {
    return [
        ...world.roadBorders,
        ...world.separatorBorders,
        ...world.corridors.flatMap((c) => c.borders),
    ].map((s) => [s.p1, s.p2]);
}
/**
 * Queries the spatial grid for border segments within the car's sensor reach
 * plus body margin, returning only those that pass both a broad-phase (cell)
 * and narrow-phase (exact squared-distance) filter.
 *
 * @param grid   The populated SpatialHashGrid to query.
 * @param car    The car whose position and sensor range define the query.
 * @returns      An array of segment polygons (Point[][]) close enough that
 *               the car could collide with them or sense them.
 */
export function queryBordersNearCar(grid, car) {
    const MIN_RANGE = 100;
    const rayLength = car.sensor?.rayLength ?? MIN_RANGE;
    const reach = Math.max(rayLength, MIN_RANGE);
    const bodyMargin = Math.hypot(car.width, car.height) * BODY_MARGIN_RATIO;
    const broadRadius = reach + bodyMargin + grid.cellSize;
    const candidates = grid.query(car.x, car.y, broadRadius);
    const narrowRadiusSq = (reach + bodyMargin) * (reach + bodyMargin);
    const result = [];
    for (let j = 0; j < candidates.length; j++) {
        const seg = candidates[j];
        const distSq = pointToSegmentDistanceSq(car.x, car.y, seg[0].x, seg[0].y, seg[1].x, seg[1].y);
        if (distSq <= narrowRadiusSq) {
            result.push(seg);
        }
    }
    return result;
}
/**
 * Squared distance from point (px, py) to the line segment (ax, ay)-(bx, by).
 * Allocation-free and sqrt-free, for hot per-car/per-segment filtering.
 */
export function pointToSegmentDistanceSq(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const lenSq = abx * abx + aby * aby;
    let t = lenSq > 0 ? (apx * abx + apy * aby) / lenSq : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t * abx;
    const cy = ay + t * aby;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy;
}
