import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { TrafficManager } from '../../../ts/world/trafficManager.js';
import { Light } from '../../../ts/world/markings/light.js';

function makeCrossroadGraph(): Graph {
  const center = new Point(0, 0);
  const north = new Point(0, 100);
  const south = new Point(0, -100);
  const east = new Point(100, 0);
  const graph = new Graph();
  [center, north, south, east].forEach((p) => graph.tryAddPoint(p));
  graph.tryAddSegment(new Segment(center, north));
  graph.tryAddSegment(new Segment(center, south));
  graph.tryAddSegment(new Segment(center, east));
  return graph;
}

function makeLightAtCrossroad(): Light {
  return new Light(new Point(0, 0), new Point(1, 0), 50);
}

describe('TrafficManager', () => {
  it('constructor with empty markings creates no control centers', () => {
    const graph = makeCrossroadGraph();
    const manager = new TrafficManager(graph, []);
    expect(manager.controlCenters).toHaveLength(0);
    expect(manager.frameCount).toBe(0);
  });

  it('detects crossroads and creates control centers', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);
    expect(manager.controlCenters.length).toBeGreaterThanOrEqual(1);
    expect(manager.controlCenters[0].lights.length).toBe(1);
  });

  it('initializeControlCenters groups lights to nearest crossroad', () => {
    const graph = makeCrossroadGraph();
    const light1 = new Light(new Point(0, 0), new Point(1, 0), 50);
    const light2 = new Light(new Point(50, 0), new Point(1, 0), 50);
    const manager = new TrafficManager(graph, [light1, light2]);
    expect(manager.controlCenters.length).toBe(1);
    expect(manager.controlCenters[0].lights).toHaveLength(2);
  });

  it('update() cycles light through green→yellow at expected ticks', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);

    manager.frameCount = 0;
    manager.update();
    expect(light.state).toBe('green');

    manager.frameCount = 60;
    manager.update();
    expect(light.state).toBe('green');

    manager.frameCount = 119;
    manager.update();
    expect(light.state).toBe('green');

    manager.frameCount = 120;
    manager.update();
    expect(light.state).toBe('yellow');

    manager.frameCount = 179;
    manager.update();
    expect(light.state).toBe('yellow');

    manager.frameCount = 180;
    manager.update();
    expect(light.state).toBe('green');
  });

  it('update() skips overridden lights', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);

    light.override('red');
    manager.frameCount = 120;
    manager.update();
    expect(light.state).toBe('red');
    expect(light.overridden).toBe(true);
  });

  it('overrideLight() sets overridden flag and state', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);

    manager.overrideLight(light, 'green');
    expect(light.state).toBe('green');
    expect(light.overridden).toBe(true);
  });

  it('releaseOverride() clears overridden flag', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);

    manager.overrideLight(light, 'green');
    expect(light.overridden).toBe(true);

    manager.releaseOverride(light);
    expect(light.overridden).toBe(false);
  });

  it('releaseAllOverrides() releases all overridden lights', () => {
    const graph = makeCrossroadGraph();
    const light1 = makeLightAtCrossroad();
    const light2 = new Light(new Point(50, 0), new Point(1, 0), 50);
    const manager = new TrafficManager(graph, [light1, light2]);

    manager.overrideLight(light1, 'green');
    manager.overrideLight(light2, 'red');
    expect(light1.overridden).toBe(true);
    expect(light2.overridden).toBe(true);

    manager.releaseAllOverrides();
    expect(light1.overridden).toBe(false);
    expect(light2.overridden).toBe(false);
  });

  it('frameCount increments after update', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);
    expect(manager.frameCount).toBe(0);

    manager.update();
    expect(manager.frameCount).toBe(1);

    manager.update();
    expect(manager.frameCount).toBe(2);
  });
});

describe('TrafficManager edge cases', () => {
  it('cycle with no lights does not throw', () => {
    const graph = makeCrossroadGraph();
    const manager = new TrafficManager(graph, []);
    expect(() => manager.update()).not.toThrow();
  });

  it('override all lights then release all restores cycling', () => {
    const graph = makeCrossroadGraph();
    const light = makeLightAtCrossroad();
    const manager = new TrafficManager(graph, [light]);
    manager.overrideLight(light, 'red');
    expect(light.overridden).toBe(true);

    manager.releaseAllOverrides();
    expect(light.overridden).toBe(false);

    manager.frameCount = 0;
    manager.update();
    expect(light.state).toBe('green');
  });

  it('crossroad detection with no intersections returns empty', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(100, 0);
    const graph = new Graph([p1, p2], [new Segment(p1, p2)]);
    const light = new Light(new Point(50, 0), new Point(1, 0), 50);
    const manager = new TrafficManager(graph, [light]);
    expect(manager.controlCenters).toHaveLength(0);
  });
});
