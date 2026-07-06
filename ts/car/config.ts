const STEERING_SPEED = 0.03;
const REVERSE_SPEED_RATIO = 0.5;
const COLLISION_ANGLE_CORRECTION = 0.1;
const BODY_MARGIN_RATIO = 0.5;

const DEFAULT_CAR_CONFIG = {
  maxSpeed: 3.24,
  acceleration: 0.01,
  friction: 0.002,
  width: 25,
  height: 63,
  sensor: {
    rayCount: 5,
    rayLength: 150,
    raySpread: Math.PI / 2,
    rayOffset: 0,
  },
};
