import { MarkingEditor } from './markingEditor.js';
import { Viewport } from '../../viewport/viewport.js';
import { World } from '../world.js';
import { Point } from '../../math/primitives/point.js';
import { Crossing } from '../markings/crossing.js';

export class CrossingEditor extends MarkingEditor {
  /**
   * Editor for creating Crossing markings.
   * Targets graph segments by default.
   */
  constructor(viewport: Viewport, world: World) {
    // Call base constructor, passing graph segments as targets
    super(viewport, world, world.graph.segments);
  }

  /**
   * Creates a new Crossing marking instance.
   * @param center The center point of the crossing.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Crossing instance.
   */
  createMarking(center: Point, directionVector: Point): Crossing {
    return new Crossing(
      center,
      directionVector,
      this.world.roadWidth, // Crossing width typically matches road width
      this.world.roadWidth / 2, // Height/length of the crossing marking
    );
  }
}
