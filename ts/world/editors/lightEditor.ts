import { MarkingEditor } from './markingEditor.js';
import { Viewport } from '../../viewport/viewport.js';
import { World } from '../world.js';
import { Point } from '../../math/primitives/point.js';
import { Light } from '../markings/light.js';

export class LightEditor extends MarkingEditor {
  /**
   * Editor for creating Light markings.
   * Targets lane guide segments.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Light marking instance.
   * @param center The center point of the light.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Light instance.
   */
  createMarking(center: Point, directionVector: Point): Light {
    // Use the Light constructor (no height parameter)
    return new Light(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width for the light placement
      // Height is fixed internally by Light constructor/super call (e.g., 18)
    );
  }
}
