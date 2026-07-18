/**
 * Lightweight CanvasRenderingContext2D mock that records draw calls.
 * No real canvas needed — uses a Proxy/spy approach.
 */

export interface DrawCall {
  method: string;
  args: unknown[];
}

export interface CanvasMockContext {
  ctx: CanvasRenderingContext2D;
  calls: DrawCall[];
  reset(): void;
}

export function mockCanvas2D(): CanvasMockContext {
  const calls: DrawCall[] = [];

  const dummyCtx: Record<string, unknown> = {
    canvas: { width: 800, height: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    beginPath: (...a: unknown[]) =>
      calls.push({ method: 'beginPath', args: a }),
    closePath: (...a: unknown[]) =>
      calls.push({ method: 'closePath', args: a }),
    moveTo: (...a: unknown[]) => calls.push({ method: 'moveTo', args: a }),
    lineTo: (...a: unknown[]) => calls.push({ method: 'lineTo', args: a }),
    fill: (...a: unknown[]) => calls.push({ method: 'fill', args: a }),
    stroke: (...a: unknown[]) => calls.push({ method: 'stroke', args: a }),
    arc: (...a: unknown[]) => calls.push({ method: 'arc', args: a }),
    save: (...a: unknown[]) => calls.push({ method: 'save', args: a }),
    restore: (...a: unknown[]) => calls.push({ method: 'restore', args: a }),
    translate: (...a: unknown[]) =>
      calls.push({ method: 'translate', args: a }),
    rotate: (...a: unknown[]) => calls.push({ method: 'rotate', args: a }),
    scale: (...a: unknown[]) => calls.push({ method: 'scale', args: a }),
    setTransform: (...a: unknown[]) =>
      calls.push({ method: 'setTransform', args: a }),
    fillRect: (...a: unknown[]) => calls.push({ method: 'fillRect', args: a }),
    strokeRect: (...a: unknown[]) =>
      calls.push({ method: 'strokeRect', args: a }),
    clearRect: (...a: unknown[]) =>
      calls.push({ method: 'clearRect', args: a }),
    measureText: () => ({ width: 0 }),
    fillText: (...a: unknown[]) => calls.push({ method: 'fillText', args: a }),
    drawImage: (...a: unknown[]) =>
      calls.push({ method: 'drawImage', args: a }),
    rect: (...a: unknown[]) => calls.push({ method: 'rect', args: a }),
    setLineDash: (...a: unknown[]) =>
      calls.push({ method: 'setLineDash', args: a }),
    getContext: () => dummyCtx,
  };

  const reset = () => {
    calls.length = 0;
  };

  return {
    ctx: dummyCtx as unknown as CanvasRenderingContext2D,
    calls,
    reset,
  };
}
