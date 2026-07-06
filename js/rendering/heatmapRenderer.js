/**
 * Renders a {@link HeatmapGrid} as a translucent colour overlay on the game
 * canvas.
 *
 * Cells are painted directly onto the supplied context (which already has the
 * viewport transform applied), so world-space `fillRect` calls land in the
 * right place. Only cells intersecting the visible world rect are drawn — for a
 * 2000×2000px viewport at 150px cells that is ~196 cells per frame, cheap
 * enough to run every render pass without an offscreen cache.
 *
 * Occupancy ratio (`occupancyFrames / totalFrames`) is mapped through a
 * four-stop gradient: blue → cyan → yellow → red.
 */
export class HeatmapRenderer {
    #grid;
    /** Translucency of the overlay (kept low so cars stay visible). */
    #alpha = 0.35;
    constructor(grid) {
        this.#grid = grid;
    }
    /** Override the overlay alpha (0–1). */
    setAlpha(alpha) {
        this.#alpha = Math.max(0, Math.min(1, alpha));
    }
    /**
     * Paint the heatmap. Call after the world + cars have been drawn, while the
     * viewport transform is still applied to `ctx`.
     */
    draw(ctx, rect) {
        const total = this.#grid.totalFrames;
        if (total <= 0)
            return;
        const cellSize = this.#grid.cellSize;
        const minCol = Math.floor(rect.minX / cellSize);
        const maxCol = Math.floor(rect.maxX / cellSize);
        const minRow = Math.floor(rect.minY / cellSize);
        const maxRow = Math.floor(rect.maxY / cellSize);
        const cells = this.#grid.getHeatmapData();
        const alpha = this.#alpha;
        ctx.save();
        ctx.globalAlpha = alpha;
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.col < minCol ||
                cell.col > maxCol ||
                cell.row < minRow ||
                cell.row > maxRow) {
                continue;
            }
            const ratio = cell.occupancyFrames / total;
            ctx.fillStyle = occupancyColor(ratio);
            ctx.fillRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
        }
        ctx.restore();
    }
}
/**
 * Occupancy ratio (0–1) → RGBA colour string, lerped through
 * blue → cyan → yellow → red.
 */
export function occupancyColor(ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    const stops = [
        [0, 0, 255], // blue
        [0, 255, 255], // cyan
        [255, 255, 0], // yellow
        [255, 0, 0], // red
    ];
    const seg = r * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const t = seg - i;
    const [r0, g0, b0] = stops[i];
    const [r1, g1, b1] = stops[i + 1];
    const R = Math.round(r0 + (r1 - r0) * t);
    const G = Math.round(g0 + (g1 - g0) * t);
    const B = Math.round(b0 + (b1 - b0) * t);
    return `rgb(${R}, ${G}, ${B})`;
}
