export function drawPoint(ctx, point, options = {}) {
    const { size = 18, color = 'black', outline = false, fill = false } = options;
    const rad = size / 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(point.x, point.y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (outline) {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'yellow';
        ctx.arc(point.x, point.y, rad * 0.6, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (fill) {
        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.arc(point.x, point.y, rad * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}
