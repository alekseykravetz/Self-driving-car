import { describe, it, expect, vi } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { CrossingEditor } from '../../../../ts/world/editors/crossingEditor.js';
import { Crossing } from '../../../../ts/world/markings/crossing.js';
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

describe('CrossingEditor', () => {
  it('constructor creates instance with graph.segments as targetSegments', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();

    const editor = new CrossingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );

    expect(editor).toBeInstanceOf(CrossingEditor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((editor as any).targetSegments).toBe(world.graph.segments);
  });

  it('createMarking creates a Crossing with roadWidth width and roadWidth/2 height', () => {
    const viewport = createMockViewport();
    const world = createMockWorld();
    const editor = new CrossingEditor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewport as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world as any,
    );
    const center = new Point(100, 100);
    const dir = new Point(1, 0);

    const marking = editor.createMarking(center, dir);

    expect(marking).toBeInstanceOf(Crossing);
    expect(marking.type).toBe('crossing');
    expect(marking.center.x).toBe(100);
    expect(marking.center.y).toBe(100);
    expect(marking.width).toBe(world.roadWidth);
    expect(marking.height).toBe(world.roadWidth / 2);
    expect(marking.borders).toHaveLength(2);
  });
});
