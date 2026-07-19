import { describe, it, expect, vi } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Light, type LightState } from '../../../../ts/world/markings/light.js';
import { LightEditor } from '../../../../ts/world/editors/lightEditor.js';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

setupImageMock();

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    arc: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };
}

function createMockCanvas() {
  return {
    getContext: vi.fn(() => createMockCtx()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createMockViewport() {
  return {
    canvas: createMockCanvas(),
    getMouse: vi.fn(() => new Point(0, 0)),
    zoom: 1,
  };
}

function createMockWorld() {
  const overrideLight = vi.fn((light: Light, state: LightState) =>
    light.override(state),
  );
  const releaseOverride = vi.fn((light: Light) => light.releaseOverride());
  return {
    graph: { segments: [] },
    roadWidth: 100,
    laneGuides: [],
    markings: [] as Light[],
    trafficManager: { overrideLight, releaseOverride },
  };
}

function collectMousedownListeners(
  addEventListener: ReturnType<typeof vi.fn>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Array<(e: any) => void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = addEventListener.mock.calls as any[][];
  return calls.filter((c) => c[0] === 'mousedown').map((c) => c[1]);
}

describe('LightEditor', () => {
  it('constructor creates instance with laneGuides as targetSegments', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    world.laneGuides = [{ p1: new Point(0, 0), p2: new Point(100, 0) }];

    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    expect(editor).toBeInstanceOf(LightEditor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).targetSegments).toBe(world.laneGuides);
  });

  it('createMarking creates a Light with roadWidth/2 width', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const center = new Point(100, 100);
    const dir = new Point(1, 0);

    const light = editor.createMarking(center, dir);

    expect(light).toBeInstanceOf(Light);
    expect(light.type).toBe('light');
    expect(light.center.x).toBe(100);
    expect(light.center.y).toBe(100);
    expect(light.width).toBe(world.roadWidth / 2);
  });

  it('enable() adds light mousedown listener then calls super.enable()', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    editor.enable();

    const mousedownCalls = viewport.canvas.addEventListener.mock.calls.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any[]) => c[0] === 'mousedown',
    );
    expect(mousedownCalls.length).toBe(2);
    expect(viewport.canvas.addEventListener).toHaveBeenCalledWith(
      'mousemove',
      expect.any(Function),
    );
  });

  it('disable() removes light mousedown listener and calls super.disable()', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    editor.enable();
    editor.disable();

    const removeCalls = viewport.canvas.removeEventListener.mock.calls.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any[]) => c[0] === 'mousedown',
    );
    expect(removeCalls.length).toBe(2);
  });

  it('left click on a light overrides it (off→green→yellow→red→release)', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const light = new Light(new Point(100, 100), new Point(1, 0), 50);
    world.markings.push(light);

    editor.enable();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).mouse = new Point(100, 100);

    const listeners = collectMousedownListeners(
      viewport.canvas.addEventListener,
    );

    function dispatchLeftClick() {
      const event = { button: 0, stopImmediatePropagation: vi.fn() };
      for (const listener of listeners) {
        listener(event);
      }
    }

    dispatchLeftClick();
    expect(world.trafficManager.overrideLight).toHaveBeenCalledWith(
      light,
      'off',
    );
    expect(light.overridden).toBe(true);
    expect(light.state).toBe('off');

    dispatchLeftClick();
    expect(world.trafficManager.overrideLight).toHaveBeenCalledWith(
      light,
      'green',
    );
    expect(light.state).toBe('green');

    dispatchLeftClick();
    expect(light.state).toBe('yellow');

    dispatchLeftClick();
    expect(light.state).toBe('red');

    dispatchLeftClick();
    expect(world.trafficManager.releaseOverride).toHaveBeenCalledWith(light);
    expect(light.overridden).toBe(false);
  });

  it('right click on a light does not cycle (non-zero button is ignored)', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const light = new Light(new Point(100, 100), new Point(1, 0), 50);
    world.markings.push(light);

    editor.enable();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).mouse = new Point(100, 100);

    const listeners = collectMousedownListeners(
      viewport.canvas.addEventListener,
    );

    function dispatchRightClick() {
      const event = { button: 2, stopImmediatePropagation: vi.fn() };
      for (const listener of listeners) {
        listener(event);
      }
    }

    dispatchRightClick();
    expect(world.trafficManager.overrideLight).not.toHaveBeenCalled();
  });

  it('click outside any light polygon is ignored', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new LightEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const light = new Light(new Point(100, 100), new Point(1, 0), 50);
    world.markings.push(light);

    editor.enable();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor as any).mouse = new Point(9999, 9999);

    const listeners = collectMousedownListeners(
      viewport.canvas.addEventListener,
    );

    function dispatchLeftClick() {
      const event = { button: 0, stopImmediatePropagation: vi.fn() };
      for (const listener of listeners) {
        listener(event);
      }
    }

    dispatchLeftClick();
    expect(world.trafficManager.overrideLight).not.toHaveBeenCalled();
  });
});
