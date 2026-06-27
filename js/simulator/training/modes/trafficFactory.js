'use strict';
/**
 * Traffic generation utilities for simple road training scenarios.
 * Designed to work with any IWorld that provides lane info via getLaneCenter/getLaneCount.
 */
/**
 * Generates the initial set of hardcoded traffic cars for a 3-lane road.
 */
function generateInitialTraffic(getLaneCenter, startAngle) {
  return [
    // Row y=-100: lane 1 only
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(1),
      y: -100,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    // Row y=-300: lanes 0 and 2
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(0),
      y: -300,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(2),
      y: -300,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    // Row y=-500: lanes 0 and 1
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(0),
      y: -500,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(1),
      y: -500,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    // Row y=-700: lanes 1 and 2
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(1),
      y: -700,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
    new Car({
      width: 30,
      height: 50,
      x: getLaneCenter(2),
      y: -700,
      controlType: 'DUMMY',
      angle: startAngle,
      maxSpeed: 2,
      color: getRandomColor(),
    }),
  ];
}

/**
 * Generates a single dynamic traffic row at the given y coordinate.
 * Randomly fills 1 or more lanes, always leaving at least one empty.
 */
function generateTrafficRow(y, getLaneCenter, laneCount, startAngle) {
  const filledCount = Math.floor(Math.random() * (laneCount - 1)) + 1;
  const lanes = Array.from({ length: laneCount }, (_, i) => i);
  const shuffledLanes = lanes.sort(() => Math.random() - 0.5);
  const activeLanes = shuffledLanes.slice(0, filledCount);
  return activeLanes.map(
    (lane) =>
      new Car({
        width: 30,
        height: 50,
        x: getLaneCenter(lane),
        y,
        controlType: 'DUMMY',
        angle: startAngle,
        maxSpeed: 2,
        color: getRandomColor(),
      }),
  );
}
