import { Car } from '../../ts/car/car.js';
import { setupImageMock } from './setupImageMock.js';

setupImageMock();

export interface CarOptions {
  x?: number;
  y?: number;
  angle?: number;
  controlType?: 'AI' | 'KEYS' | 'DUMMY';
}

export function makeCar(options: CarOptions = {}): Car {
  const car = new Car({
    x: options.x ?? 0,
    y: options.y ?? 0,
    angle: options.angle ?? 0,
    controlType: options.controlType ?? 'DUMMY',
  });
  car.setCallbacks({
    onDamaged: () => {},
    onEngineUpdate: () => {},
  });
  return car;
}
