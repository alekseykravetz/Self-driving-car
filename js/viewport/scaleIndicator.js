'use strict';
class ScaleIndicator {
  #canvasHeight;
  #viewport;
  #options;
  position = { x: 20, y: 20 };
  barLength = 100;
  scaleInMeters = 10;
  pixelsPerMeter = 1;
  constructor(canvasWidth, canvasHeight, viewport, options = {}) {
    this.#canvasHeight = canvasHeight;
    this.#viewport = viewport;
    this.#options = {
      paddingX: options.paddingX ?? 20,
      paddingY: options.paddingY ?? 20,
      lineColor: options.lineColor ?? '#f5f5f5',
      outlineColor: options.outlineColor ?? 'rgba(0, 0, 0, 0.8)',
      fontSize: options.fontSize ?? 12,
      lineWidth: options.lineWidth ?? 2,
      scaleInMeters: options.scaleInMeters ?? 10,
      pixelsPerMeterMultiplier: options.pixelsPerMeterMultiplier ?? 1,
      zoomMultiplier: options.zoomMultiplier ?? 1,
      inlineStats: options.inlineStats ?? false,
      statSeparator: options.statSeparator ?? ' • ',
    };
    this.scaleInMeters = this.#options.scaleInMeters;
    this.update(canvasWidth, canvasHeight);
  }

  update(viewportWidth, viewportHeight) {
    if (viewportHeight !== undefined) {
      this.#canvasHeight = viewportHeight;
    }
    this.pixelsPerMeter =
      this.#viewport.getPixelsPerMeter() *
      this.#options.pixelsPerMeterMultiplier;
    this.barLength = this.pixelsPerMeter * this.scaleInMeters;
    this.position.x = this.#options.paddingX;
    this.position.y = this.#canvasHeight - this.#options.paddingY;
  }

  draw(ctx, viewportWidth, viewportHeight) {
    this.update(viewportWidth, viewportHeight);
    const x1 = this.position.x;
    const y = this.position.y;
    const x2 = x1 + this.barLength;
    const font = `${this.#options.fontSize}px monospace`;
    const zoomValue = (
      this.#viewport.getZoom() * this.#options.zoomMultiplier
    ).toFixed(2);
    const scaleLabel = `${this.scaleInMeters} m`;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';
    // Horizontal bar outline
    ctx.strokeStyle = this.#options.outlineColor;
    ctx.lineWidth = this.#options.lineWidth + 2;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    // Horizontal bar foreground
    ctx.strokeStyle = this.#options.lineColor;
    ctx.lineWidth = this.#options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.#options.outlineColor;
    ctx.fillStyle = this.#options.lineColor;
    if (this.#options.inlineStats) {
      // Compact inline mode: zoom and scale on same line after bar
      ctx.textBaseline = 'middle';
      const statsText = `${zoomValue}x${this.#options.statSeparator}${scaleLabel}`;
      ctx.strokeText(statsText, x2 + 8, y);
      ctx.fillText(statsText, x2 + 8, y);
    } else {
      // Standard mode: zoom above bar, scale on same line as bar
      ctx.textBaseline = 'bottom';
      const zoomLabel = `Zoom: ${zoomValue}x`;
      ctx.strokeText(zoomLabel, x1, y - 8);
      ctx.fillText(zoomLabel, x1, y - 8);
      ctx.textBaseline = 'middle';
      ctx.strokeText(scaleLabel, x2 + 8, y);
      ctx.fillText(scaleLabel, x2 + 8, y);
    }
    ctx.restore();
  }
}
