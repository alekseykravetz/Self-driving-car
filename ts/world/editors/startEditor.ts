import { MarkingEditor } from './markingEditor.js';
import { Viewport } from '../../viewport/viewport.js';
import { World } from '../world.js';
import { Point } from '../../math/primitives/point.js';
import { Start } from '../markings/start.js';

export class StartEditor extends MarkingEditor {
  /**
   * Editor for creating Start markings.
   * Targets lane guide segments.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Start marking instance.
   * @param center The center point of the start marking.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Start instance.
   */
  createMarking(center: Point, directionVector: Point): Start {
    return new Start(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width of the start marking
      this.world.roadWidth / 2, // Height/length of the start marking
    );
  }
}
