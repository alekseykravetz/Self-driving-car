import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { Light } from '../../../ts/world/markings/light.js';
import { TrafficManager } from '../../../ts/world/trafficManager.js';
import { TrafficControlGrid } from '../../../ts/math/trafficControlGrid.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { encodeTrafficState } from '../../../ts/car/sensors/sensor.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';
import type { TrafficControlEntry } from '../../../ts/math/trafficControlGrid.js';
import type { SensorTrafficControl } from '../../../ts/car/sensors/sensor.js';

function makeAllZeroBrain(): unknown {
  return makeKnownNetwork(
    [6, 6, 4],
    [
      Array.from({ length: 6 }, () => Array(6).fill(0)),
      Array.from({ length: 6 }, () => Array(4).fill(0)),
    ],
    [Array(6).fill(0.1), [0.1, 0.1, 0.1, 0.1]],
  );
}

function makeCrossroad(): Graph {
  const p1 = new Point(0, -100);
  const p2 = new Point(0, 0);
  const p3 = new Point(0, 100);
  const p4 = new Point(-100, 0);
  const p5 = new Point(100, 0);
  return new Graph(
    [p1, p2, p3, p4, p5],
    [
      new Segment(p1, p2),
      new Segment(p2, p3),
      new Segment(p4, p2),
      new Segment(p2, p5),
    ],
  );
}

describe('Traffic control chain integration', () => {
  it('TrafficManager creates lights that TrafficControlGrid indexes', () => {
    const graph = makeCrossroad();
    const light = new Light(new Point(0, 0), new Point(0, 1), 50);
    const tm = new TrafficManager(graph, [light]);
    expect(tm.controlCenters.length).toBe(1);
    expect(tm.controlCenters[0].lights.length).toBe(1);

    const entries: TrafficControlEntry[] = [
      {
        polygon: light.polygon.points,
        getState: () => light.state,
      },
    ];
    const grid = new TrafficControlGrid();
    grid.rebuild(entries);

    const hits = grid.query(0, 0, 200);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].polygon).toBe(light.polygon.points);
  });

  it('Sensor.stateAware reads traffic light state through TrafficControlGrid', () => {
    const light = new Light(new Point(0, 0), new Point(0, 1), 50);
    light.state = 'red';

    const grid = new TrafficControlGrid();
    grid.rebuild([
      {
        polygon: light.polygon.points,
        getState: () => light.state,
      },
    ]);

    const hits = grid.query(0, 0, 500);
    expect(hits[0].state).toBe('red');

    const trafficControls: SensorTrafficControl[] = hits.map((h) => ({
      polygon: h.polygon,
      state: h.state,
    }));

    const car = new Car({
      x: 0,
      y: 100,
      controlType: 'AI',
      sensor: { stateAware: true, rayCount: 3 },
    });
    car.brain = makeAllZeroBrain();
    car.update([], trafficControls, []);

    const trafficReading = car.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(trafficReading).toBeDefined();
    expect(trafficReading!.state).toBe(encodeTrafficState('red'));
  });

  it('Traffic light state changes are reflected in sensor readings', () => {
    const light = new Light(new Point(0, 0), new Point(0, 1), 50);

    const grid = new TrafficControlGrid();
    grid.rebuild([
      {
        polygon: light.polygon.points,
        getState: () => light.state,
      },
    ]);

    light.state = 'red';
    const redTC: SensorTrafficControl[] = grid.query(0, 0, 500).map((h) => ({
      polygon: h.polygon,
      state: h.state,
    }));

    const car = new Car({
      x: 0,
      y: 100,
      controlType: 'AI',
      sensor: { stateAware: true, rayCount: 3 },
    });
    car.brain = makeAllZeroBrain();
    car.update([], redTC, []);
    let r = car.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(r!.state).toBe(encodeTrafficState('red'));

    light.state = 'green';
    const greenTC: SensorTrafficControl[] = grid.query(0, 0, 500).map((h) => ({
      polygon: h.polygon,
      state: h.state,
    }));
    car.update([], greenTC, []);
    r = car.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(r!.state).toBe(encodeTrafficState('green'));

    light.state = 'yellow';
    const yellowTC: SensorTrafficControl[] = grid.query(0, 0, 500).map((h) => ({
      polygon: h.polygon,
      state: h.state,
    }));
    car.update([], yellowTC, []);
    r = car.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(r!.state).toBe(encodeTrafficState('yellow'));
  });

  it('Multiple cars see the same traffic light state', () => {
    const light = new Light(new Point(0, 0), new Point(0, 1), 50);
    light.state = 'yellow';

    const grid = new TrafficControlGrid();
    grid.rebuild([
      {
        polygon: light.polygon.points,
        getState: () => light.state,
      },
    ]);

    const trafficControls: SensorTrafficControl[] = grid
      .query(0, 0, 500)
      .map((h) => ({ polygon: h.polygon, state: h.state }));

    const car1 = new Car({
      x: 0,
      y: 100,
      controlType: 'AI',
      sensor: { stateAware: true, rayCount: 3 },
    });
    car1.brain = makeAllZeroBrain();
    const car2 = new Car({
      x: 20,
      y: 100,
      controlType: 'AI',
      sensor: { stateAware: true, rayCount: 3 },
    });
    car2.brain = makeAllZeroBrain();

    car1.update([], trafficControls, []);
    car2.update([], trafficControls, []);

    const r1 = car1.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    const r2 = car2.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r1!.state).toBe(r2!.state);
    expect(r1!.state).toBe(encodeTrafficState('yellow'));
  });

  it('Light override propagates through the chain', () => {
    const light = new Light(new Point(0, 0), new Point(0, 1), 50);
    light.state = 'green';

    light.override('red');
    expect(light.overridden).toBe(true);
    expect(light.state).toBe('red');

    const grid = new TrafficControlGrid();
    grid.rebuild([
      {
        polygon: light.polygon.points,
        getState: () => light.state,
      },
    ]);

    const hits = grid.query(0, 0, 200);
    expect(hits[0].state).toBe('red');

    light.releaseOverride();
    expect(light.overridden).toBe(false);
  });
});
