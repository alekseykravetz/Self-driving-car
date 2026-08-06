/**
 * Minimal interface required to drive a {@link ScaleIndicator}. Implemented by
 * {@link Viewport}; the mini-map satisfies it with a small adapter over its
 * own zoom scaler instead of needing a real `Viewport` instance.
 */
export interface ZoomSource {
  getZoom(): number;
  getPixelsPerMeter(): number;
}

export interface ScaleIndicatorOptions {
  paddingX?: number;
  paddingY?: number;
  lineColor?: string;
  outlineColor?: string;
  fontSize?: number;
  lineWidth?: number;
  scaleInMeters?: number;
  pixelsPerMeterMultiplier?: number;
  zoomMultiplier?: number;
  inlineStats?: boolean;
  statSeparator?: string;
}

export class ScaleIndicator {
  #canvasHeight: number;
  #viewport: ZoomSource;
  #options: Required<ScaleIndicatorOptions>;

  public position = { x: 20, y: 20 };
  public barLength: number = 100;
  public scaleInMeters: number = 10;
  public pixelsPerMeter: number = 1;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    viewport: ZoomSource,
    options: ScaleIndicatorOptions = {},
  ) {
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

  update(viewportWidth?: number, viewportHeight?: number): void {
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

  draw(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    this.update(viewportWidth, viewportHeight);

    const x1 = this.position.x;
    const y = this.position.y;
    const font = `${this.#options.fontSize}px monospace`;
    const zoomValue = (
      this.#viewport.getZoom() * this.#options.zoomMultiplier
    ).toFixed(2);
    const scaleLabel = `${this.scaleInMeters} m`;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';

    // Draws the horizontal scale bar (outline + foreground) starting at `bx1`.
    const drawBar = (bx1: number): number => {
      const bx2 = bx1 + this.barLength;
      ctx.lineCap = 'round';
      ctx.strokeStyle = this.#options.outlineColor;
      ctx.lineWidth = this.#options.lineWidth + 2;
      ctx.beginPath();
      ctx.moveTo(bx1, y);
      ctx.lineTo(bx2, y);
      ctx.stroke();

      ctx.strokeStyle = this.#options.lineColor;
      ctx.lineWidth = this.#options.lineWidth;
      ctx.beginPath();
      ctx.moveTo(bx1, y);
      ctx.lineTo(bx2, y);
      ctx.stroke();
      return bx2;
    };

    if (this.#options.inlineStats) {
      // Compact inline mode: zoom value, a vertical divider, the scale label,
      // then the scale bar at the END.
      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.#options.outlineColor;
      ctx.fillStyle = this.#options.lineColor;

      const zoomText = `${zoomValue}x`;
      const gap = 8;
      let cursorX = x1;

      ctx.strokeText(zoomText, cursorX, y);
      ctx.fillText(zoomText, cursorX, y);
      cursorX += ctx.measureText(zoomText).width + gap;

      // Vertical divider line between the zoom value and the scale label.
      const dividerHalf = this.#options.fontSize / 2;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = this.#options.outlineColor;
      ctx.lineWidth = this.#options.lineWidth + 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, y - dividerHalf);
      ctx.lineTo(cursorX, y + dividerHalf);
      ctx.stroke();
      ctx.strokeStyle = this.#options.lineColor;
      ctx.lineWidth = this.#options.lineWidth;
      ctx.beginPath();
      ctx.moveTo(cursorX, y - dividerHalf);
      ctx.lineTo(cursorX, y + dividerHalf);
      ctx.stroke();
      cursorX += gap;

      // Scale label — restore the text stroke settings changed by the divider.
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.#options.outlineColor;
      ctx.fillStyle = this.#options.lineColor;
      ctx.strokeText(scaleLabel, cursorX, y);
      ctx.fillText(scaleLabel, cursorX, y);
      cursorX += ctx.measureText(scaleLabel).width + gap;

      // Scale bar at the end.
      drawBar(cursorX);
    } else {
      // Standard mode: bar first, zoom above bar, scale on same line as bar.
      const x2 = drawBar(x1);

      ctx.font = font;
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.#options.outlineColor;
      ctx.fillStyle = this.#options.lineColor;

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
