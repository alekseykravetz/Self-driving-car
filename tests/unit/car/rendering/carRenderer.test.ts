/**
 * CarRenderer tests.
 *
 * CarRenderer uses:
 *  - new Image()  → mock via setupImageMock
 *  - document.createElement('canvas') for sprites → mock via setupDocumentMock
 *
 * We test both paths: sprite mode (showMask=true) and polygon mode (showMask=false).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setupImageMock } from '../../../helpers/setupImageMock.js';
import { mockCanvas2D } from '../../../helpers/mockCanvas2D.js';
import { CarRenderer } from '../../../../ts/car/rendering/carRenderer.js';
import type { CarDrawData } from '../../../../ts/car/rendering/carRenderer.js';

// Mock Image before any CarRenderer code runs
setupImageMock();

// Mock document.createElement for canvas (used by #getSprite)
if (!globalThis.document) {
  (globalThis as Record<string, unknown>).document = {} as Document;
}
const doc = globalThis.document as Record<string, unknown>;
doc.createElement = ((tag: string) => {
  if (tag === 'canvas') {
    const mock = mockCanvas2D();
    return {
      width: 0,
      height: 0,
      getContext: () => mock.ctx,
    };
  }
  return {};
}) as unknown as Document['createElement'];

function makeDrawData(overrides: Partial<CarDrawData> = {}): CarDrawData {
  return {
    polygon: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    damaged: false,
    color: 'red',
    x: 50,
    y: 50,
    angle: 0,
    width: 30,
    height: 60,
    ...overrides,
  };
}

describe('CarRenderer', () => {
  let mock: ReturnType<typeof mockCanvas2D>;
  let renderer: CarRenderer;

  beforeEach(() => {
    mock = mockCanvas2D();
    mock.reset();
    renderer = new CarRenderer();
  });

  it('draw() in polygon mode (showMask=false) calls beginPath, moveTo, lineTo, and fill', () => {
    const data = makeDrawData();

    renderer.draw(mock.ctx, data, { showMask: false });

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('moveTo');
    expect(methods).toContain('lineTo');
    expect(methods).toContain('fill');
  });

  it('draw() sets fillStyle from data.color in polygon mode', () => {
    const data = makeDrawData({ color: 'blue' });

    renderer.draw(mock.ctx, data, { showMask: false });

    expect(mock.ctx.fillStyle).toBe('blue');
  });

  it('draw() with damaged car uses gray fillStyle in polygon mode', () => {
    const data = makeDrawData({ damaged: true, color: 'red' });

    renderer.draw(mock.ctx, data, { showMask: false });

    expect(mock.ctx.fillStyle).toBe('gray');
  });

  it('draw() with showMask=true (sprite mode) calls translate, rotate, drawImage', () => {
    const data = makeDrawData();

    renderer.draw(mock.ctx, data, { showMask: true });

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('translate');
    expect(methods).toContain('rotate');
    expect(methods).toContain('drawImage');
  });

  it('draw() temporarily changes globalAlpha when alpha option is set', () => {
    const data = makeDrawData();
    const prevAlpha = mock.ctx.globalAlpha;

    renderer.draw(mock.ctx, data, { showMask: false, alpha: 0.5 });

    // Alpha is restored to its previous value after draw completes
    expect(mock.ctx.globalAlpha).toBe(prevAlpha);
  });

  it('draw() with colorOverride uses override color instead of data.color', () => {
    const data = makeDrawData({ color: 'red' });

    renderer.draw(mock.ctx, data, { showMask: false, colorOverride: 'green' });

    expect(mock.ctx.fillStyle).toBe('green');
  });

  it('draw() with showName and name property calls fillText', () => {
    const data = makeDrawData({ name: 'TestCar' });

    renderer.draw(mock.ctx, data, { showMask: false, showName: true });

    const methods = mock.calls.map((c) => c.method);
    expect(methods).toContain('fillText');
  });

  it('draw() saves/restores when showSensor or showName is true', () => {
    const data = makeDrawData({ name: 'Car' });

    renderer.draw(mock.ctx, data, { showMask: false, showName: true });

    expect(mock.calls.filter((c) => c.method === 'save').length).toBe(1);
    expect(mock.calls.filter((c) => c.method === 'restore').length).toBe(1);
  });
});
