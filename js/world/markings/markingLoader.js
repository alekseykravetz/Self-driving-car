import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { Crossing } from './crossing.js';
import { Parking } from './parking.js';
import { Light } from './light.js';
import { Start } from './start.js';
import { Stop } from './stop.js';
import { Yield } from './yield.js';
import { Target } from './target.js';
export function loadMarking(info) {
  const point = new Point(info.center.x, info.center.y);
  const direction = new Point(info.directionVector.x, info.directionVector.y);
  let marking;
  switch (info.type) {
    case 'marking':
      marking = new Marking(point, direction, info.width, info.height);
      break;
    case 'crossing':
      marking = new Crossing(point, direction, info.width, info.height);
      break;
    case 'parking':
      marking = new Parking(point, direction, info.width, info.height);
      break;
    case 'light':
      marking = new Light(point, direction, info.width);
      break;
    case 'start':
      marking = new Start(point, direction, info.width, info.height);
      break;
    case 'stop':
      marking = new Stop(point, direction, info.width, info.height);
      break;
    case 'yield':
      marking = new Yield(point, direction, info.width, info.height);
      break;
    case 'target':
      marking = new Target(point, direction, info.width, info.height);
      break;
    default:
      console.error(
        `Unknown marking type encountered during load: ${info.type}`,
      );
      return null;
  }
  if (info.anchor) {
    marking.anchor = {
      p1: new Point(info.anchor.p1.x, info.anchor.p1.y),
      p2: new Point(info.anchor.p2.x, info.anchor.p2.y),
      offset: info.anchor.offset,
      lateral: info.anchor.lateral,
    };
  }
  return marking;
}
