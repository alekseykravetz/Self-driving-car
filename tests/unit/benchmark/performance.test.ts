import { describe, it, expect } from 'vitest';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { Sensor } from '../../../ts/car/sensors/sensor.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

function measureTime(fn: () => void, iterations: number = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return performance.now() - start;
}

describe('NeuralNetwork benchmark', { retry: 0 }, () => {
  it('feedForward 1000 iterations completes quickly', () => {
    const network = makeKnownNetwork(
      [6, 6, 4],
      [
        [
          [0.5, 0.3, -0.2, 0.8],
          [0.1, -0.7, 0.4, 0.6],
          [-0.3, 0.9, -0.5, 0.2],
          [0.7, -0.1, 0.3, -0.8],
          [-0.4, 0.5, -0.6, 0.1],
          [0.2, -0.9, 0.8, -0.3],
        ],
        [
          [0.4, -0.2, 0.7, 0.1],
          [0.6, -0.5, 0.3, -0.8],
          [-0.1, 0.9, -0.4, 0.2],
          [0.5, -0.3, 0.8, -0.6],
          [-0.7, 0.2, -0.9, 0.3],
          [0.1, -0.8, 0.4, -0.5],
        ],
      ],
      [
        [0.1, -0.2, 0.3, -0.4, 0.5, -0.6],
        [-0.1, 0.2, -0.3, 0.4],
      ],
    );
    const inputs = [0.5, 0.3, 0.1, 0.7, 0.2, 0.9];
    const time = measureTime(
      () => NeuralNetwork.feedForward(inputs, network),
      1000,
    );
    expect(time).toBeLessThan(1000);
  });

  it('trainStep 100 iterations completes quickly', () => {
    const network = makeKnownNetwork(
      [6, 6, 4],
      [
        [
          [0.5, 0.3, -0.2, 0.8],
          [0.1, -0.7, 0.4, 0.6],
          [-0.3, 0.9, -0.5, 0.2],
          [0.7, -0.1, 0.3, -0.8],
          [-0.4, 0.5, -0.6, 0.1],
          [0.2, -0.9, 0.8, -0.3],
        ],
        [
          [0.4, -0.2, 0.7, 0.1],
          [0.6, -0.5, 0.3, -0.8],
          [-0.1, 0.9, -0.4, 0.2],
          [0.5, -0.3, 0.8, -0.6],
          [-0.7, 0.2, -0.9, 0.3],
          [0.1, -0.8, 0.4, -0.5],
        ],
      ],
      [
        [0.1, -0.2, 0.3, -0.4, 0.5, -0.6],
        [-0.1, 0.2, -0.3, 0.4],
      ],
    );
    const inputs = [0.5, 0.3, 0.1, 0.7, 0.2, 0.9];
    const targets = [1, 0, 1, 0];
    const time = measureTime(
      () => NeuralNetwork.trainStep(network, inputs, targets, 0.1),
      100,
    );
    expect(time).toBeLessThan(1000);
  });

  it('feedForward with large network (50 hidden) completes', () => {
    const network = new NeuralNetwork([50, 50, 4]);
    const inputs = new Array(50).fill(0).map(() => Math.random());
    const time = measureTime(
      () => NeuralNetwork.feedForward(inputs, network),
      100,
    );
    expect(time).toBeLessThan(2000);
  });
});

describe('Sensor benchmark', { retry: 0 }, () => {
  it('update with 100 borders completes quickly', () => {
    const sensor = new Sensor({ rayCount: 5 });
    const borders: Point[][] = [];
    for (let i = 0; i < 100; i++) {
      borders.push([
        {
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
        } as Point,
        {
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
        } as Point,
        {
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
        } as Point,
        {
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
        } as Point,
      ]);
    }
    const time = measureTime(() => sensor.update(0, 0, 0, borders), 100);
    expect(time).toBeLessThan(1000);
  });

  it('update with 1000 borders completes', () => {
    const sensor = new Sensor({ rayCount: 5 });
    const borders: Point[][] = [];
    for (let i = 0; i < 1000; i++) {
      borders.push([
        {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        } as Point,
        {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        } as Point,
        {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        } as Point,
        {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
        } as Point,
      ]);
    }
    const time = measureTime(() => sensor.update(0, 0, 0, borders), 10);
    expect(time).toBeLessThan(2000);
  });
});

describe('Graph hash benchmark', { retry: 0 }, () => {
  it('hash 500-node graph completes quickly', () => {
    const points: Point[] = [];
    const segments: Segment[] = [];
    for (let i = 0; i < 500; i++) {
      const p = new Point(
        Math.random() * 2000 - 1000,
        Math.random() * 2000 - 1000,
      );
      points.push(p);
      if (i > 0) {
        segments.push(new Segment(points[i - 1], p));
      }
    }
    const graph = new Graph(points, segments);
    const time = measureTime(() => graph.hash(), 100);
    expect(time).toBeLessThan(1000);
  });

  it('hash changes when graph is modified', () => {
    const graph = new Graph();
    const p1 = new Point(0, 0);
    const p2 = new Point(100, 100);
    graph.addPoint(p1);
    graph.addPoint(p2);
    graph.addSegment(new Segment(p1, p2));
    const hash1 = graph.hash();
    graph.addPoint(new Point(50, 50));
    const hash2 = graph.hash();
    expect(hash2).not.toBe(hash1);
  });
});
