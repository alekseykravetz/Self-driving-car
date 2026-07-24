import { describe, it, expect, vi } from 'vitest';
import { InspectEditor } from '../../../../ts/world/editors/inspectEditor.js';

function makeViewport() {
  return {
    canvas: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getContext: vi.fn(() => ({
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        closePath: vi.fn(),
      })),
    } as unknown as HTMLCanvasElement,
    zoom: 1,
    getMouse: vi.fn(() => ({ x: 100, y: 100 })),
    getOffset: vi.fn(() => ({ x: 0, y: 0 })),
  };
}

function makeWorld() {
  return {
    graph: {
      segments: [],
    },
  };
}

describe('InspectEditor', () => {
  it('construction does not throw', () => {
    const viewport = makeViewport();
    const world = makeWorld();
    expect(
      () => new InspectEditor(viewport as never, world as never),
    ).not.toThrow();
  });

  it('enable adds event listeners and pushes bindings', () => {
    const viewport = makeViewport();
    const world = makeWorld();
    const editor = new InspectEditor(viewport as never, world as never);

    const km = { pushBindings: vi.fn(), popBindings: vi.fn() };
    editor.bindKeyboard(km as never);
    editor.enable();

    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );
    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'contextmenu',
      expect.any(Function),
    );
    expect(km.pushBindings).toHaveBeenCalled();
  });

  it('disable removes event listeners and pops bindings', () => {
    const viewport = makeViewport();
    const world = makeWorld();
    const editor = new InspectEditor(viewport as never, world as never);

    const km = { pushBindings: vi.fn(), popBindings: vi.fn() };
    editor.bindKeyboard(km as never);
    editor.enable();

    editor.disable();

    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function),
    );
    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );
    expect(viewport.canvas.removeEventListener).toHaveBeenCalledWith(
      'contextmenu',
      expect.any(Function),
    );
    expect(km.popBindings).toHaveBeenCalled();
  });

  it('setOnSegmentSelected callback fires with null on disable', () => {
    const viewport = makeViewport();
    const world = makeWorld();
    const editor = new InspectEditor(viewport as never, world as never);

    const km = { pushBindings: vi.fn(), popBindings: vi.fn() };
    editor.bindKeyboard(km as never);
    editor.enable();

    const callback = vi.fn();
    editor.setOnSegmentSelected(callback);

    editor.disable();

    expect(callback).toHaveBeenCalledWith(null);
  });
});
