export const STEERING_SPEED = 0.03;
export const REVERSE_SPEED_RATIO = 0.5;
export const COLLISION_ANGLE_CORRECTION = 0.1;
export const BODY_MARGIN_RATIO = 0.5;
export const NN_OUTPUT_COUNT = 4;
export const DEFAULT_HIDDEN_LAYERS = [6];

export const DEFAULT_CAR_CONFIG = {
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

/**
 * Selects the physics engine used to translate control input into
 * speed/heading changes. 'arcade' is the original flat-friction,
 * constant-turn-rate model (kept for backward compatibility with existing
 * saved brains). 'realistic' adds speed-dependent steering, drag, braking,
 * and an engine power curve. Cars/saves without an explicit value default to
 * 'arcade' (see `Car` constructor and `load()`).
 */
export type PhysicsModel = 'arcade' | 'realistic';

/**
 * Bicycle-model turn-rate constant (rad per px/frame of speed): calibrated so
 * a car at the default maxSpeed turns at the legacy STEERING_SPEED rate, but
 * turn rate now scales with actual speed instead of being constant — this
 * keeps the turning radius roughly fixed rather than making a slow car pivot
 * in place like a tank.
 */
export const REALISTIC_STEER_RATE =
  STEERING_SPEED / DEFAULT_CAR_CONFIG.maxSpeed;

/** Braking (accel/reverse opposing current motion) is this many times stronger than engine acceleration. */
export const REALISTIC_BRAKE_FORCE_RATIO = 3;

/** Exponent controlling how sharply engine acceleration tapers off as speed nears maxSpeed. */
export const REALISTIC_ENGINE_TAPER_EXPONENT = 2;
