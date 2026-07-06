import { Car } from '../../../car/car.js';
import { getRandomColor } from '../../../math/color.js';
import { DEFAULT_CAR_CONFIG } from '../../../car/config.js';

const TRAFFIC_WIDTH = DEFAULT_CAR_CONFIG.width + 5;
const TRAFFIC_HEIGHT = DEFAULT_CAR_CONFIG.height - 13;
const TRAFFIC_MAX_SPEED = 2;

/**
 * Traffic generation utilities for simple road training scenarios.
 * Designed to work with any IWorld that provides lane info via getLaneCenter/getLaneCount.
 */

const trafficCarOptions = (
  x: number,
  y: number,
  angle: number,
): ConstructorParameters<typeof Car>[0] => ({
  width: TRAFFIC_WIDTH,
  height: TRAFFIC_HEIGHT,
  x,
  y,
  controlType: 'DUMMY',
  angle,
  maxSpeed: TRAFFIC_MAX_SPEED,
  color: getRandomColor(),
});

/**
 * Generates the initial set of hardcoded traffic cars for a 3-lane road.
 */
export function generateInitialTraffic(
  getLaneCenter: (lane: number) => number,
  startAngle: number,
): Car[] {
  const rows = [
    [-100, [1]],
    [-300, [0, 2]],
    [-500, [0, 1]],
    [-700, [1, 2]],
  ] as const;

  return rows.flatMap(([y, lanes]) =>
    lanes.map(
      (lane) => new Car(trafficCarOptions(getLaneCenter(lane), y, startAngle)),
    ),
  );
}

/**
 * Generates a single dynamic traffic row at the given y coordinate.
 * Randomly fills 1 or more lanes, always leaving at least one empty.
 */
export function generateTrafficRow(
  y: number,
  getLaneCenter: (lane: number) => number,
  laneCount: number,
  startAngle: number,
): Car[] {
  const filledCount = Math.floor(Math.random() * (laneCount - 1)) + 1;
  const lanes = Array.from({ length: laneCount }, (_, i) => i);
  const shuffledLanes = lanes.sort(() => Math.random() - 0.5);
  const activeLanes = shuffledLanes.slice(0, filledCount);
  return activeLanes.map(
    (lane) => new Car(trafficCarOptions(getLaneCenter(lane), y, startAngle)),
  );
}
