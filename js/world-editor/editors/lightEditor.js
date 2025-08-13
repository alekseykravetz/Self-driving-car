'use strict';
class LightEditor extends MarkingEditor {
  /**
   * Editor for creating Light markings.
   * Targets lane guide segments.
   */
  constructor(viewport, world) {
    // Call base constructor, passing lane guides as targets
    super(viewport, world, world.laneGuides);
  }

  /**
   * Creates a new Light marking instance.
   * @param center The center point of the light.
   * @param directionVector The orientation vector (along the road).
   * @returns A new Light instance.
   */
  createMarking(center, directionVector) {
    // Use the Light constructor (no height parameter)
    return new Light(center, directionVector, this.world.roadWidth / 2);
  }
}
