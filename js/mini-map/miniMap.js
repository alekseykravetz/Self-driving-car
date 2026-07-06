import { Point } from '../math/primitives/point.js';
import { ScaleIndicator } from '../viewport/scaleIndicator.js';
import { scale } from '../math/utils.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import { drawPoint } from '../rendering/pointRenderer.js';
export class MiniMap {
  #canvas;
  #graph;
  #size;
  #scaler;
  #ctx;
  #scaleIndicator = null;
  constructor(canvas, graph, size, scaler = 0.05) {
    this.#canvas = canvas;
    this.#graph = graph;
    this.#size = size;
    this.#scaler = scaler;
    this.#canvas.width = size;
    this.#canvas.height = size;
    this.#ctx = canvas.getContext('2d');
  }
  draw(options) {
    const {
      viewPoint,
      cars,
      roadColor = 'white',
      carColor = 'blue',
      backgroundColor,
      viewport,
      compactScaleIndicator = true,
    } = options;
    // When a backgroundColor is given, paint it onto the canvas itself rather
    // than leaving the pixels transparent and relying on the CSS background.
    // The floating mini-map is a `position: fixed` canvas, and Chrome keeps a
    // stale (black) CSS background painted on its compositing layer after the
    // class toggles. Filling the bitmap (which repaints every frame) sidesteps
    // that bug entirely.
    if (backgroundColor) {
      this.#ctx.fillStyle = backgroundColor;
      this.#ctx.fillRect(0, 0, this.#size, this.#size);
    } else {
      this.#ctx.clearRect(0, 0, this.#size, this.#size);
    }
    const scaledViewPoint = scale(viewPoint, -this.#scaler);
    this.#ctx.save();
    this.#ctx.translate(
      scaledViewPoint.x + this.#size / 2,
      scaledViewPoint.y + this.#size / 2,
    );
    this.#ctx.scale(this.#scaler, this.#scaler);
    for (const segment of this.#graph.segments) {
      drawSegment(this.#ctx, segment, {
        width: 3 / this.#scaler,
        color: roadColor,
        cap: 'round',
      });
    }
    for (const car of cars) {
      this.#ctx.beginPath();
      this.#ctx.fillStyle = car.damaged ? 'gray' : car.color || 'red';
      this.#ctx.strokeStyle = 'white';
      this.#ctx.lineWidth = (car.damaged ? 1 : 2) / this.#scaler;
      this.#ctx.arc(
        car.x,
        car.y,
        (car.damaged ? 2 : 3) / this.#scaler,
        0,
        Math.PI * 2,
      );
      this.#ctx.fill();
      this.#ctx.stroke();
      // new Point(car.x, car.y).draw(this.#ctx, {
      //   color: car.damaged ? 'gray' : 'red',
      //   size: 5 / this.#scaler,
      // });
    }
    this.#ctx.restore();
    drawPoint(this.#ctx, new Point(this.#size / 2, this.#size / 2), {
      size: 12,
      color: carColor,
      outline: true,
    });
    if (viewport) {
      if (!this.#scaleIndicator) {
        this.#scaleIndicator = new ScaleIndicator(
          this.#size,
          this.#size,
          viewport,
          {
            paddingX: compactScaleIndicator ? 6 : 20,
            paddingY: compactScaleIndicator ? 6 : 20,
            fontSize: compactScaleIndicator ? 9 : 12,
            lineWidth: compactScaleIndicator ? 1 : 2,
            scaleInMeters: 10,
            pixelsPerMeterMultiplier: this.#scaler,
            zoomMultiplier: this.#scaler,
            inlineStats: compactScaleIndicator,
            statSeparator: ' • ',
          },
        );
      }
      this.#scaleIndicator.draw(
        this.#ctx,
        this.#canvas.width,
        this.#canvas.height,
      );
    }
  }
}
