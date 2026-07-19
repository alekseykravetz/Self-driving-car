import { describe, it, expect, vi } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { StopEditor } from '../../../../ts/world/editors/stopEditor.js';
import { Stop } from '../../../../ts/world/markings/stop.js';
import { setupImageMock } from '../../../helpers/setupImageMock.js';

setupImageMock();

function createMockViewport() {
  return {
    canvas: {
      getContext: vi.fn(() => ({})),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    getMouse: vi.fn(() => new Point(0, 0)),
    zoom: 1,
  };
}

function createMockWorld() {
  return {
    graph: { segments: [] },
    roadWidth: 100,
    laneGuides: [],
    markings: [],
  };
}

describe('StopEditor', () => {
  it('constructor creates instance with laneGuides as targetSegments', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    world.laneGuides = [{ p1: new Point(0, 0), p2: new Point(100, 0) }];

    const editor = new StopEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    expect(editor).toBeInstanceOf(StopEditor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).targetSegments).toBe(world.laneGuides);
  });

  it('createMarking creates a Stop with roadWidth/2 width and height', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new StopEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const center = new Point(100, 100);
    const dir = new Point(1, 0);

    const marking = editor.createMarking(center, dir);

    expect(marking).toBeInstanceOf(Stop);
    expect(marking.type).toBe('stop');
    expect(marking.center.x).toBe(100);
    expect(marking.center.y).toBe(100);
    expect(marking.width).toBe(world.roadWidth / 2);
    expect(marking.height).toBe(world.roadWidth / 2);
    expect(marking.border).toBeDefined();
  });
});
