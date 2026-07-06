import { MarkingEditor } from './markingEditor.js';
import { Viewport } from '../../viewport/viewport.js';
import { World } from '../world.js';
import { Point } from '../../math/primitives/point.js';
import { Yield } from '../markings/yield.js';

export class YieldEditor extends MarkingEditor {
  /**
   * Editor for creating Yield markings.
   * Targets lane guide segments.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Yield marking instance.
   * @param center The center point of the yield marking.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Yield instance.
   */
  createMarking(center: Point, directionVector: Point): Yield {
    return new Yield(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width of the yield marking
      this.world.roadWidth / 2, // Height/length of the yield marking
    );
  }
}
