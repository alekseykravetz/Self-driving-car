import { MarkingEditor } from './markingEditor.js';
import { Stop } from '../markings/stop.js';
export class StopEditor extends MarkingEditor {
  /**
   * Editor for creating Stop markings.
   * Targets lane guide segments.
   */
  constructor(viewport, world) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }
  /**
   * Creates a new Stop marking instance.
   * @param center The center point of the stop line.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Stop instance.
   */
  createMarking(center, directionVector) {
    return new Stop(
      center,
      directionVector,
      this.world.roadWidth / 2, // Width of the stop line
      this.world.roadWidth / 2,
    );
  }
}
